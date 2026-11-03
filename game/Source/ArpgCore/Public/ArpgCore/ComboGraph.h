// ComboGraph.h - Combo graph (moves + transitions branching on input type and delay between
// presses) and FComboRunner, which drives an FActionTimeline from buffered inputs.
#pragma once

#include "ArpgCore/ActionTimeline.h"
#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/CombatTypes.h"
#include "ArpgCore/InputBuffer.h"
#include "ArpgCore/Result.h"

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

namespace ArpgCore
{
struct FComboMove
{
	std::string Id;
	FActionTiming Timing;
	FAttackData Attack;
};

/** Edge From -> To taken when Input is pressed with MinDelay <= delay <= MaxDelay.
 *  Delay = seconds since the previous accepted press. MaxDelay < 0 means unbounded. */
struct FComboTransition
{
	int From = -1;
	EInputType Input = EInputType::Light;
	float MinDelay = 0.0f;
	float MaxDelay = -1.0f;
	int To = -1;
};

class ARPGCORE_API FComboGraph
{
public:
	/** Index of the neutral (no combo) node. */
	static constexpr int RootNode = -1;

	/** Adds a move; returns its index, or RootNode if the id is empty or duplicated. */
	int AddMove(FComboMove Move);
	/** FromId empty => from root. Fails on unknown ids, non-attack input or MinDelay > MaxDelay. */
	FStatus AddTransition(const std::string& FromId, EInputType Input, float MinDelay, float MaxDelay,
		const std::string& ToId);

	int FindMove(const std::string& Id) const;
	/** First matching transition in insertion order. */
	std::optional<int> FindNext(int From, EInputType Input, float DelaySincePrevious) const;

	const FComboMove& GetMove(int Index) const { return Moves[static_cast<std::size_t>(Index)]; }
	std::size_t NumMoves() const { return Moves.size(); }
	const std::vector<FComboTransition>& GetTransitions() const { return Transitions; }

	/** Reports overlapping delay ranges (ambiguous branches) and moves unreachable from root. */
	std::vector<FError> Validate() const;

private:
	std::vector<FComboMove> Moves;
	std::vector<FComboTransition> Transitions;
};

struct FComboRunnerConfig
{
	float InputBufferWindow = 0.25f; // seconds a press stays buffered
	std::size_t InputBufferCapacity = 1;
	float ChainLinkWindow = 0.6f; // seconds after a move ends during which the combo can continue
};

struct FComboTickResult
{
	int StartedMove = FComboGraph::RootNode; // move started this tick, or RootNode
	bool bHitWindowOpened = false;
	bool bHitWindowClosed = false;
	bool bMoveFinished = false;
	bool bComboReset = false;
};

/** Drives light/heavy combos. The graph must outlive the runner. */
class ARPGCORE_API FComboRunner
{
public:
	FComboRunner(const FComboGraph& InGraph, const FComboRunnerConfig& InConfig);

	/** Records a press at the current time. Only Light/Heavy are accepted (returns false otherwise). */
	bool PressInput(EInputType Type);
	FComboTickResult Tick(float DeltaSeconds);
	/** For dodge/parry: succeeds when idle or inside the cancel window; aborts the move and resets combo. */
	bool TryCancelForDefense();

	bool IsActing() const { return Timeline.IsRunning(); }
	int GetCurrentMove() const { return CurrentMove; }
	float GetTime() const { return Now; }
	const FActionTimeline& GetTimeline() const { return Timeline; }

private:
	bool TryStartBufferedMove(FComboTickResult& Result);

	const FComboGraph* Graph;
	FComboRunnerConfig Config;
	FInputBuffer Buffer;
	FActionTimeline Timeline;
	float Now = 0.0f;
	float LastAcceptedPressTime = 0.0f;
	float LastFinishTime = 0.0f;
	bool bHasPrevious = false;
	int CurrentMove = FComboGraph::RootNode;
};
} // namespace ArpgCore
