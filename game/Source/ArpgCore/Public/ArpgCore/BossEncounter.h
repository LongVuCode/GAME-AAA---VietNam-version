// BossEncounter.h - Glue for a boss fight: health + posture + shackle + phases.
// Rules (DEMO_0_1_DESIGN.md §6, enemies.json):
// - Health never drops below HealthFloor. Reaching it the first time forces a final stagger that
//   does not time out (bHealthFloorForcesFinalStagger) and opens the pry even without all cracks.
// - Shackle enabled: the fight ends only by a successful pry (Freed).
// - Shackle disabled (feature flag off, K0 fallback): at the final stagger the player performs the
//   finisher shove and the creature flees (Fled). With HealthFloor == 0 health reaching 0 => Defeated.
// - A failed pry ends the stagger and leaves the boss MissPostureRecoverFraction of its posture.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/Crafting.h"
#include "ArpgCore/Damage.h"
#include "ArpgCore/Enemy.h"
#include "ArpgCore/Posture.h"
#include "ArpgCore/Shackle.h"

#include <cstdint>
#include <string>
#include <vector>

namespace ArpgCore
{
/** One boss phase. The first phase is active at start; later phases enter when their condition holds. */
struct FBossPhase
{
	std::string Id;
	bool bEnterOnAny = true;          // true: any condition; false: all conditions
	int EnterCracksAtLeast = -1;      // < 0: unused
	float EnterHealthRatioAtMost = -1.0f; // < 0: unused
	float MaxPosture = -1.0f;         // < 0: keep the current max
	float SpeedMult = 1.0f;           // game layer
	float TelegraphTimeMult = 1.0f;   // game layer
	float TransitionBeat = 0.0f;      // game layer: seconds of the transition beat
	std::vector<std::string> Moveset; // attack ids (game layer)
};

struct FBossConfig
{
	std::string Id;
	float MaxHealth = 1000.0f;
	float HealthFloor = 1.0f;
	bool bHealthFloorForcesFinalStagger = true;
	FPostureConfig Posture;
	FShackleConfig Shackle;
	std::string ShackleFeatureFlag; // game flag that may disable the shackle (e.g. "feature_khoen")
	std::vector<FBossPhase> Phases;
	std::vector<FEnemyAttack> Attacks;
	/** Materials the boss sheds when freed (boss parts only; validated against crafting data). */
	std::vector<FMaterialAmount> FreedDrops;
	/** Materials dropped when the shackle is disabled and the creature flees. */
	std::vector<FMaterialAmount> FledDrops;
};

enum class EBossOutcome : std::uint8_t
{
	InProgress,
	Freed,
	Fled,
	Defeated,
};

struct FBossHitResult
{
	FDamageResult Applied;
	bool bPostureBroken = false;
	bool bShackleCracked = false;
	bool bFinalStagger = false; // the health floor forced the final stagger on this hit
	bool bPhaseChanged = false;
};

class ARPGCORE_API FBossEncounter
{
public:
	FBossEncounter(const FBossConfig& InConfig, const FDifficultyConfig& InDifficulty);

	/** A player hit (weapon + attack). Ignored once the fight is over or while prying. */
	FBossHitResult ReceivePlayerHit(const FAttackData& Attack, const FWeaponConfig& Weapon);
	/** Raw posture damage (e.g. from a parry exchange), already scaled by the caller. */
	FBossHitResult ReceivePostureDamage(float Amount);

	bool CanBeginPry() const;
	bool BeginPry();
	EPryResult InputPryBeat();
	void SetPryHeld(bool bHeld) { Shackle.SetHeld(bHeld); }
	void SetPryInputMode(EPryInputMode Mode) { Shackle.SetInputMode(Mode); }
	/** Shackle disabled: the shove finisher is available during the final stagger. */
	bool CanPerformFinisher() const;
	bool PerformFinisher();
	/** Advances posture with GAME time (after hit-stop) and the pry clock with REAL, unscaled time
	 *  (see the clock contract in Shackle.h). UE: GameDt = the world delta after time dilation,
	 *  RealDt = FApp::GetDeltaTime() before dilation; prototype: frame dt before FHitStopClock. */
	EPryResult Tick(float GameDeltaSeconds, float RealDeltaSeconds);
	/** Convenience for callers without hit-stop or time dilation: game time == real time. */
	EPryResult Tick(float DeltaSeconds) { return Tick(DeltaSeconds, DeltaSeconds); }

	EBossOutcome GetOutcome() const { return Outcome; }
	float GetHealth() const { return Health; }
	int GetPhaseIndex() const { return PhaseIndex; }
	const FBossPhase* GetPhase() const;
	const FPosture& GetPosture() const { return Posture; }
	const FShackle& GetShackle() const { return Shackle; }
	/** Drops granted by the outcome (FreedDrops / FledDrops; empty while in progress or Defeated). */
	std::vector<FMaterialAmount> GetOutcomeDrops() const;
	const FBossConfig& GetConfig() const { return Config; }

private:
	FBossHitResult OnPostureResult(bool bBroken);
	bool UpdatePhase();
	void HandlePryResult(EPryResult Result);

	FBossConfig Config;
	FDifficultyConfig Difficulty;
	FPosture Posture;
	FShackle Shackle;
	float Health;
	int PhaseIndex = 0;
	bool bFinalStaggerUsed = false;
	EBossOutcome Outcome = EBossOutcome::InProgress;
};
} // namespace ArpgCore
