// Damage.h - Health + posture damage math: weapon multipliers, stagger bonus, difficulty scaling,
// and the posture exchange of a parry.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/CombatTypes.h"
#include "ArpgCore/Defense.h"

#include <string>

namespace ArpgCore
{
struct FWeaponConfig
{
	std::string Id = "default";
	float DamageMultiplier = 1.0f;
	float PostureMultiplier = 1.0f;
};

/** Difficulty knobs (GDD §7). All multipliers are >= 0. */
struct FDifficultyConfig
{
	std::string Id = "normal";
	float DamageToPlayerMultiplier = 1.0f;  // < 1 reduces damage the player takes
	float DamageToEnemyMultiplier = 1.0f;
	float PostureToEnemyMultiplier = 1.0f;
	float ParryWindowScale = 1.0f;          // > 1 widens parry windows
	float PryBeatWindowScale = 1.0f;        // > 1 widens pry beat windows
	bool bPryAuto = false;                  // pry beats succeed automatically (accessibility)
	// Pass-through values for the game layer (AI speed, telegraph length, aim assist).
	float EnemySpeedMultiplier = 1.0f;
	float TelegraphTimeMultiplier = 1.0f;
	bool bAimAssist = true;
};

struct FDamageContext
{
	bool bAttackerIsPlayer = true;
	bool bTargetStaggered = false;
	float StaggerMultiplier = 1.0f; // usually FPosture::GetDamageMultiplier() of the target
	float TargetDamageReduction = 0.0f; // armor, 0..1
};

struct FDamageResult
{
	float Health = 0.0f;
	float Posture = 0.0f;
};

/** Final damage of a hit. Invalid inputs (negative / NaN) are clamped to 0. */
ARPGCORE_API FDamageResult ComputeDamage(const FAttackData& Attack, const FWeaponConfig& Weapon,
	const FDifficultyConfig& Difficulty, const FDamageContext& Context);

struct FParryExchange
{
	float AttackerPosture = 0.0f; // posture damage dealt back to the attacker
	float DefenderPosture = 0.0f; // posture chip taken by the defender
};

/** Damage actually taken when the hit was Guarded. */
ARPGCORE_API FDamageResult ApplyGuard(const FDamageResult& Incoming, const FGuardConfig& Guard);

/** Posture exchange for a successful parry. bDefenderIsPlayer selects difficulty scaling. */
ARPGCORE_API FParryExchange ComputeParryExchange(const FAttackData& Incoming, bool bPerfect,
	const FParryConfig& Parry, const FDifficultyConfig& Difficulty, bool bDefenderIsPlayer = true);
} // namespace ArpgCore
