// Shackle.h - "Khoen" state machine on a boss (design: DEMO_0_1_DESIGN.md §3, §6; combat_tuning.pry).
// Every posture break cracks the shackle one step; with enough cracks and the boss staggered the
// pry ("cạy") opens: a rhythm check of PryBeats beats on a drum grid (LeadIn + n * BeatInterval).
// A missed beat is retried on the next grid slot up to MissRetriesPerBeat times; one more miss fails
// the pry (the boss recovers MissPostureRecoverFraction of its posture, cracks are kept - see
// FBossEncounter). Success => Freed. The shackle never yields anything that powers the player.
//
// CLOCK CONTRACT (QA S2): the pry is judged against the drum the player HEARS, so Tick() must receive
// REAL (unscaled) frame time - the delta before hit-stop / slow motion / time dilation. Feeding the
// hit-stopped game delta makes the grid drift 0.08 s per beat and timed pries become unwinnable.
// Each step is clamped to MaxTickDelta so a frame hitch cannot burn the retries (QA N4); the game
// should also pause the pry (and its audio) while the window is unfocused.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"

#include <cstdint>

namespace ArpgCore
{
/** How the player performs pry beats (accessibility / difficulty). */
enum class EPryInputMode : std::uint8_t
{
	Timed, // press on each beat inside +/- the beat window
	Hold,  // hold the button HoldDurationPerBeat seconds per beat; releasing only resets progress
	Auto,  // beats succeed by themselves on the grid ("Nghe chuyện" difficulty)
};

struct FShackleConfig
{
	bool bEnabled = true;   // data toggle (feature_khoen, VERDICT V9)
	int CracksToOpen = 3;   // posture breaks needed before pry can open
	int PryBeats = 3;
	float LeadIn = 0.6f;        // seconds from pry start to the first beat slot
	float BeatInterval = 0.5f;  // seconds between beat slots (60 / bpm)
	float BeatHalfWindow = 0.12f; // input accepted within +/- this of a slot
	int MissRetriesPerBeat = 0;   // extra slots a missed beat may be retried on
	float MissPostureRecoverFraction = 0.35f; // fraction of posture the boss regains when the pry fails
	float HoldDurationPerBeat = 0.5f;          // Hold mode
	float SilenceAfter = 0.0f;                 // presentation only: quiet seconds after the release
	float MaxTickDelta = 0.1f;                 // engineering clamp per Tick (not design data)
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
	None,       // nothing happened (tick) / input ignored
	BeatHit,
	BeatMissed, // a beat was missed but will be retried on the next slot
	Failed,     // out of retries: pry aborted
	Freed,
};

class ARPGCORE_API FShackle
{
public:
	/** BeatWindowScale comes from difficulty (FDifficultyConfig::PryBeatWindowScale). */
	explicit FShackle(const FShackleConfig& InConfig, float BeatWindowScale = 1.0f,
		EPryInputMode InMode = EPryInputMode::Timed);

	/** Adds one crack (capped at CracksToOpen). No effect when Disabled/Prying/Freed. */
	void OnPostureBroken();
	/** Opens the pry regardless of cracks (boss HP floor forces the final stagger). */
	void ForceReady();
	bool CanBeginPry(bool bTargetStaggered) const;
	bool BeginPry(bool bTargetStaggered);
	/** Timed mode: the player pressed the pry button. Early press => miss of the current slot. */
	EPryResult InputBeat();
	/** Hold mode: button held / released. */
	void SetHeld(bool bInHeld) { bHeld = bInHeld; }
	/** Advances the pry clock by REAL (unscaled) seconds, clamped to MaxTickDelta.
	 *  May return BeatHit (Hold/Auto), BeatMissed, Failed or Freed. */
	EPryResult Tick(float RealDeltaSeconds);

	void SetInputMode(EPryInputMode InMode) { Mode = InMode; }
	EPryInputMode GetInputMode() const { return Mode; }
	EShackleState GetState() const { return State; }
	int GetCracks() const { return Cracks; }
	int GetBeatsHit() const { return BeatsHit; }
	int GetMissesOnBeat() const { return MissesOnBeat; }
	float GetPryElapsed() const { return PryElapsed; }
	/** Time (from pry start) of grid slot Index. */
	float GetBeatTime(int Index) const;
	/** Time of the slot the next beat must land on. */
	float GetCurrentTargetTime() const { return GetBeatTime(Slot); }
	float GetHalfWindow() const { return HalfWindow; }
	const FShackleConfig& GetConfig() const { return Config; }

private:
	EPryResult RegisterHit();
	EPryResult RegisterMiss();
	void AbortPry();

	FShackleConfig Config;
	float HalfWindow;
	EPryInputMode Mode;
	EShackleState State;
	int Cracks = 0;
	int BeatsHit = 0;
	int MissesOnBeat = 0;
	int Slot = 0;
	float PryElapsed = 0.0f;
	float HoldProgress = 0.0f;
	bool bHeld = false;
};
} // namespace ArpgCore
