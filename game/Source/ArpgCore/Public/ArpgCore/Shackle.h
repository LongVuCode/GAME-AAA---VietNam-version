// Shackle.h - "Khoen" state machine on a boss. Every posture break cracks the shackle one step;
// with enough cracks and the boss staggered the pry ("cạy") opens: a 3-beat rhythm check.
// A miss aborts the pry (the boss recovers part of its posture, see FBossEncounter) - never an
// instant loss. Success => Freed. The shackle never yields anything that powers the player.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"

#include <cstdint>

namespace ArpgCore
{
struct FShackleConfig
{
	bool bEnabled = true;   // data toggle (VERDICT V9); disabled => fight ends by health (K0 fallback)
	int CracksToOpen = 3;   // posture breaks needed before pry can open
	int PryBeats = 3;
	float LeadIn = 0.6f;        // seconds from pry start to the first beat
	float BeatInterval = 0.5f;  // seconds between beats
	float BeatHalfWindow = 0.12f; // input accepted within +/- this of a beat time
	float MissPostureRecoverFraction = 0.35f; // fraction of posture the boss regains on a miss
};

enum class EShackleState : std::uint8_t
{
	Disabled,
	Intact,
	Cracking,
	Ready,   // enough cracks; pry opens while the boss is staggered
	Prying,
	Freed,
};

enum class EPryResult : std::uint8_t
{
	None,    // nothing happened (tick) / input ignored (not prying)
	BeatHit,
	Miss,
	Freed,
};

class ARPGCORE_API FShackle
{
public:
	/** BeatWindowScale comes from difficulty (FDifficultyConfig::PryBeatWindowScale). */
	explicit FShackle(const FShackleConfig& InConfig, float BeatWindowScale = 1.0f);

	/** Adds one crack (capped at CracksToOpen). No effect when Disabled/Prying/Freed. */
	void OnPostureBroken();
	bool CanBeginPry(bool bTargetStaggered) const;
	bool BeginPry(bool bTargetStaggered);
	/** Player pressed the pry beat. Early or late press => Miss. */
	EPryResult InputBeat();
	/** Advances the pry clock; returns Miss when a beat window passes without input. */
	EPryResult Tick(float DeltaSeconds);

	EShackleState GetState() const { return State; }
	int GetCracks() const { return Cracks; }
	int GetBeatsHit() const { return BeatsHit; }
	float GetPryElapsed() const { return PryElapsed; }
	/** Time (from pry start) of beat Index. */
	float GetBeatTime(int Index) const;
	float GetHalfWindow() const { return HalfWindow; }
	const FShackleConfig& GetConfig() const { return Config; }

private:
	void AbortPry();

	FShackleConfig Config;
	float HalfWindow;
	EShackleState State;
	int Cracks = 0;
	int BeatsHit = 0;
	float PryElapsed = 0.0f;
};
} // namespace ArpgCore
