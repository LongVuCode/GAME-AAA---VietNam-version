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
