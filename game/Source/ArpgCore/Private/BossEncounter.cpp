// BossEncounter.cpp
#include "ArpgCore/BossEncounter.h"

#include "MathUtil.h"

#include <algorithm>

namespace ArpgCore
{
using Detail::NonNegative;

FBossEncounter::FBossEncounter(const FBossConfig& InConfig, const FDifficultyConfig& InDifficulty)
	: Config(InConfig)
	, Difficulty(InDifficulty)
	, Posture(InConfig.Posture)
	, Shackle(InConfig.Shackle, InDifficulty.PryBeatWindowScale)
	, Health(NonNegative(InConfig.MaxHealth))
{
}

FBossHitResult FBossEncounter::ReceivePlayerHit(const FAttackData& Attack, const FWeaponConfig& Weapon)
{
	if (Outcome != EBossOutcome::InProgress || Shackle.GetState() == EShackleState::Prying)
	{
		return FBossHitResult{};
	}
	FDamageContext Context;
	Context.bAttackerIsPlayer = true;
	Context.bTargetStaggered = Posture.IsStaggered();
	Context.StaggerMultiplier = Posture.GetDamageMultiplier();
	const FDamageResult Damage = ComputeDamage(Attack, Weapon, Difficulty, Context);

	const float HealthBefore = Health;
	Health -= Damage.Health;
	if (Shackle.GetState() != EShackleState::Disabled)
	{
		// While shackled the boss cannot be killed: the fight ends by freeing it.
		const float Floor = std::min(NonNegative(Config.HealthFloorWhileShackled), NonNegative(Config.MaxHealth));
		Health = std::max(Health, std::min(Floor, HealthBefore));
	}
	else if (Health <= 0.0f)
	{
		Health = 0.0f;
		Outcome = EBossOutcome::Defeated;
	}

	FBossHitResult Result = OnPostureResult(Posture.ApplyDamage(Damage.Posture));
	Result.Applied = FDamageResult{HealthBefore - Health, Damage.Posture};
	return Result;
}

FBossHitResult FBossEncounter::ReceivePostureDamage(float Amount)
{
	if (Outcome != EBossOutcome::InProgress || Shackle.GetState() == EShackleState::Prying)
	{
		return FBossHitResult{};
	}
	FBossHitResult Result = OnPostureResult(Posture.ApplyDamage(Amount));
	Result.Applied.Posture = NonNegative(Amount);
	return Result;
}

FBossHitResult FBossEncounter::OnPostureResult(bool bBroken)
{
	FBossHitResult Result;
	Result.bPostureBroken = bBroken;
	if (bBroken)
	{
		const int Before = Shackle.GetCracks();
		Shackle.OnPostureBroken();
		Result.bShackleCracked = Shackle.GetCracks() > Before;
	}
	return Result;
}

bool FBossEncounter::CanBeginPry() const
{
	return Outcome == EBossOutcome::InProgress && Shackle.CanBeginPry(Posture.IsStaggered());
}

bool FBossEncounter::BeginPry()
{
	if (!CanBeginPry() || !Shackle.BeginPry(Posture.IsStaggered()))
	{
		return false;
	}
	Posture.SetStaggerPaused(true);
	return true;
}

EPryResult FBossEncounter::InputPryBeat()
{
	const EPryResult Result = Shackle.InputBeat();
	HandlePryResult(Result);
	return Result;
}

EPryResult FBossEncounter::Tick(float DeltaSeconds)
{
	if (Outcome != EBossOutcome::InProgress)
	{
		return EPryResult::None;
	}
	Posture.Tick(DeltaSeconds);
	const EPryResult Result = Shackle.Tick(DeltaSeconds);
	HandlePryResult(Result);
	return Result;
}

void FBossEncounter::HandlePryResult(EPryResult Result)
{
	if (Result == EPryResult::Freed)
	{
		Outcome = EBossOutcome::Freed;
		Posture.EndStagger();
	}
	else if (Result == EPryResult::Miss)
	{
		Posture.EndStaggerWithRecovery(Config.Shackle.MissPostureRecoverFraction);
	}
}

std::vector<FMaterialAmount> FBossEncounter::GetFreedDrops() const
{
	if (Outcome != EBossOutcome::Freed)
	{
		return {};
	}
	return Config.FreedDrops;
}
} // namespace ArpgCore
