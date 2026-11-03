// FerryCombatTypes.h - Small types shared by the player, enemies and the HUD.
// NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#pragma once

#include "CoreMinimal.h"

#include "ArpgCore/CombatTypes.h"
#include "ArpgCore/Damage.h"

#include "FerryCombatTypes.generated.h"

class AActor;

/** Mirror of ArpgCore::EDefenseOutcome for Blueprint/HUD use, plus Ignored (dead, invulnerable, pry). */
UENUM(BlueprintType)
enum class EFerryDefenseOutcome : uint8
{
	Hit,
	Dodged,
	PerfectDodge,
	Parried,
	PerfectParry,
	Guarded,
	Ignored,
};

/** Mirror of ArpgCore::EPryResult. */
UENUM(BlueprintType)
enum class EFerryPryResult : uint8
{
	None,
	BeatHit,
	BeatMissed,
	Failed,
	Freed,
};

/** Mirror of ArpgCore::EBossOutcome. */
UENUM(BlueprintType)
enum class EFerryBossOutcome : uint8
{
	InProgress,
	Freed,
	Fled,
	Defeated,
};

/** A player hit as delivered to an enemy (plain C++; ArpgCore types are not reflected). */
struct FFerryPlayerHit
{
	ArpgCore::FAttackData Attack;
	ArpgCore::FWeaponConfig Weapon;
	ArpgCore::FDifficultyConfig Difficulty;
	AActor* Attacker = nullptr;
	bool bHeavy = false; // drum gain "heavy_hit" instead of "light_hit"
};

/** What the enemy reports back to the attacker. */
struct FFerryHitReport
{
	bool bLanded = false;
	bool bPostureBroken = false;
};

namespace FerryCombat
{
/** CustomTimeDilation floor during hit-stop. VERIFY: 0 would be a full freeze as the data asks
 *  (time_scale 0) but some engine code divides by the dilated delta; 0.01 is visually a freeze. */
inline constexpr float MinHitStopDilation = 0.01f;

/** Applies the hit-stop of an ArpgCore clock to an actor through CustomTimeDilation (per actor, not global). */
PROJECTFERRY_API void ApplyHitStopDilation(AActor* Actor, bool bStopped, float TimeScaleDuringStop);

/** True when ferry.Debug is non-zero (extra debug drawing). */
PROJECTFERRY_API bool IsDebugDrawEnabled();

/** Converts an ArpgCore id to FName / back. */
PROJECTFERRY_API FName ToName(const std::string& Id);
PROJECTFERRY_API std::string ToStd(FName Id);
} // namespace FerryCombat
