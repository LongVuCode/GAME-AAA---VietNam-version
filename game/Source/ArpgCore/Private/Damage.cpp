// Damage.cpp
#include "ArpgCore/Damage.h"

#include "MathUtil.h"

namespace ArpgCore
{
using Detail::NonNegative;

FDamageResult ComputeDamage(const FAttackData& Attack, const FWeaponConfig& Weapon, const FDifficultyConfig& Difficulty,
	const FDamageContext& Context)
{
	FDamageResult Result;
	Result.Health = NonNegative(Attack.BaseDamage) * NonNegative(Weapon.DamageMultiplier);
	Result.Posture = NonNegative(Attack.BasePostureDamage) * NonNegative(Weapon.PostureMultiplier);

	if (Context.bAttackerIsPlayer)
	{
		Result.Health *= NonNegative(Difficulty.DamageToEnemyMultiplier);
		Result.Posture *= NonNegative(Difficulty.PostureToEnemyMultiplier);
	}
	else
	{
		// Assist difficulties reduce both health and posture pressure on the player.
		Result.Health *= NonNegative(Difficulty.DamageToPlayerMultiplier);
		Result.Posture *= NonNegative(Difficulty.DamageToPlayerMultiplier);
	}

	if (Context.bTargetStaggered)
	{
		Result.Health *= NonNegative(Context.StaggerMultiplier);
	}
	Result.Health *= 1.0f - Detail::Clamp01(Context.TargetDamageReduction);
	return Result;
}

FParryExchange ComputeParryExchange(const FAttackData& Incoming, bool bPerfect, const FParryConfig& Parry,
	const FDifficultyConfig& Difficulty, bool bDefenderIsPlayer)
{
	const float Base = NonNegative(Incoming.BasePostureDamage);
	FParryExchange Exchange;
	Exchange.AttackerPosture = Base * NonNegative(bPerfect ? Parry.AttackerPostureOnPerfectParry : Parry.AttackerPostureOnParry);
	Exchange.DefenderPosture = Base * NonNegative(bPerfect ? Parry.DefenderPostureOnPerfectParry : Parry.DefenderPostureOnParry);
	if (bDefenderIsPlayer)
	{
		Exchange.AttackerPosture *= NonNegative(Difficulty.PostureToEnemyMultiplier);
		Exchange.DefenderPosture *= NonNegative(Difficulty.DamageToPlayerMultiplier);
	}
	return Exchange;
}
} // namespace ArpgCore
