// ComboGraph.h - Combo graph (moves + transitions branching on input type and on the PAUSE after the
// previous move) and FComboRunner, which drives an FActionTimeline from buffered inputs.
// Besides the neutral root, two context nodes let data express "dodge,L" and "perfect_parry,L".
#pragma once

#include "ArpgCore/ActionTimeline.h"
#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/CombatTypes.h"
#include "ArpgCore/InputBuffer.h"
#include "ArpgCore/Result.h"

#include <cstddef>
#include <optional>
#include <set>
#include <string>
#include <vector>

namespace ArpgCore
{
struct FComboMove
{
	std::string Id;
	FActionTiming Timing;
	FAttackData Attack;
	/** Seconds after this move ends during which the chain can continue; < 0 = runner default, 0 = chain ends. */
	float ChainLinkWindow = -1.0f;
	/** Skill or flag id that must be unlocked to perform this move (empty = always available). */
	std::string RequiredUnlock;
};

/** Edge From -> To taken when Input is pressed with MinDelay <= pause <= MaxDelay.
 *  Pause = seconds between the END of the previous move and the press; a press made (or buffered)
 *  while the previous move is still running has pause 0 ("L,L,pause,H": DEMO §3 "dừng >= 0,35 s").
 *  MaxDelay < 0 means unbounded. Transitions out of RootNode and the context nodes ignore it. */
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
	/** Neutral node (no combo). */
	static constexpr int RootNode = -1;
	/** Context node active for a short window after a dodge ("dodge,L"). */
	static constexpr int AfterDodgeNode = -2;
	/** Context node active for a short window after a perfect parry ("perfect_parry,L"). */
	static constexpr int AfterPerfectParryNode = -3;

	static bool IsSpecialNode(int Node) { return Node < 0; }
	/** "" = root, "@dodge", "@perfect_parry" = context nodes. */
	static int SpecialNodeFromName(const std::string& Name);

	/** Adds a move; returns its index, or RootNode if the id is empty or duplicated. */
	int AddMove(FComboMove Move);
	/** FromId: move id, or a special name ("" root, "@dodge", "@perfect_parry"). Fails on unknown ids,
	 *  non-attack input or MinDelay > MaxDelay. */
	FStatus AddTransition(const std::string& FromId, EInputType Input, float MinDelay, float MaxDelay,
		const std::string& ToId);

	int FindMove(const std::string& Id) const;
	/** First matching transition in insertion order whose target move is unlocked
	 *  (Unlocked == nullptr means everything is unlocked). LinkWindow >= 0 additionally requires
	 *  pause <= MinDelay + LinkWindow: a pause branch gets its own link window after the pause. */
	std::optional<int> FindNext(int From, EInputType Input, float PauseSincePrevious,
		const std::set<std::string>* Unlocked = nullptr, float LinkWindow = -1.0f) const;
	/** Largest MinDelay among transitions leaving From (0 if none). */
	float MaxPauseFrom(int From) const;

	const FComboMove& GetMove(int Index) const { return Moves[static_cast<std::size_t>(Index)]; }
	std::size_t NumMoves() const { return Moves.size(); }
	const std::vector<FComboTransition>& GetTransitions() const { return Transitions; }

	/** Reports overlapping delay ranges (ambiguous branches) and moves unreachable from root/contexts. */
	std::vector<FError> Validate() const;

private:
	std::vector<FComboMove> Moves;
	std::vector<FComboTransition> Transitions;
};

struct FComboRunnerConfig
{
	float InputBufferWindow = 0.25f; // seconds a press stays buffered
	std::size_t InputBufferCapacity = 1;
	float ChainLinkWindow = 0.6f;    // default seconds after a move ends during which the combo continues
	float AfterDodgeWindow = 0.6f;   // seconds the "@dodge" context stays open
	float AfterPerfectParryWindow = 0.6f; // seconds the "@perfect_parry" context stays open (counter window)
	float DefenseCancelDelay = 0.0f; // seconds into the cancel window before a dodge/parry may cancel the move
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
	/** For dodge/parry: succeeds when idle or DefenseCancelDelay into the cancel window; aborts the move
	 *  and resets the combo. */
	bool TryCancelForDefense();
	/** Opens the "@dodge" context (call after a successful dodge start). */
	void NotifyDodge() { OpenContext(FComboGraph::AfterDodgeNode, Config.AfterDodgeWindow); }
	/** Opens the "@perfect_parry" context (counter window). */
	void NotifyPerfectParry() { OpenContext(FComboGraph::AfterPerfectParryNode, Config.AfterPerfectParryWindow); }
	/** Skills / flags currently unlocked; moves with a RequiredUnlock outside this set are skipped. */
	void SetUnlocked(std::set<std::string> InUnlocked) { Unlocked = std::move(InUnlocked); }

	bool IsActing() const { return Timeline.IsRunning(); }
	int GetCurrentMove() const { return CurrentMove; }
	int GetActiveContext() const { return ContextNode; }
	double GetTime() const { return Now; }
	const FActionTimeline& GetTimeline() const { return Timeline; }

private:
	bool TryStartBufferedMove(FComboTickResult& Result);
	float LinkWindowOf(int Move) const;
	void OpenContext(int Node, float Window);

	const FComboGraph* Graph;
	FComboRunnerConfig Config;
	FInputBuffer Buffer;
	FActionTimeline Timeline;
	std::set<std::string> Unlocked;
	// double: a float clock stalls after ~73 h and drifts after ~1 h of play (QA N5).
	double Now = 0.0;
	double LastFinishTime = 0.0;
	double ContextExpiry = 0.0;
	bool bHasPrevious = false;
	int CurrentMove = FComboGraph::RootNode;
	int ContextNode = FComboGraph::RootNode;
};
} // namespace ArpgCore
