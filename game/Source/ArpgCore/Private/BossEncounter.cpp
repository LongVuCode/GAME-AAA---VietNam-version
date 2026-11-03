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
	, Shackle(InConfig.Shackle, InDifficulty.PryBeatWindowScale, InDifficulty.bPryAuto ? EPryInputMode::Auto : EPryInputMode::Timed)
	, Health(NonNegative(InConfig.MaxHealth))
{
	if (!Config.Phases.empty() && Config.Phases[0].MaxPosture > 0.0f)
	{
		Posture.SetMaxPosture(Config.Phases[0].MaxPosture);
	}
}

const FBossPhase* FBossEncounter::GetPhase() const
{
	return static_cast<std::size_t>(PhaseIndex) < Config.Phases.size() ? &Config.Phases[static_cast<std::size_t>(PhaseIndex)] : nullptr;
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
	const float Floor = std::min(NonNegative(Config.HealthFloor), NonNegative(Config.MaxHealth));
	Health = std::max(Health - Damage.Health, std::min(Floor, HealthBefore));

	FBossHitResult Result;
	if (Floor > 0.0f && Health <= Floor && !bFinalStaggerUsed && Config.bHealthFloorForcesFinalStagger)
	{
		// The health floor forces the final stagger; with the shackle on it also opens the pry.
		bFinalStaggerUsed = true;
		const bool bWasStaggered = Posture.IsStaggered();
		Posture.ForceStagger(true);
		Shackle.ForceReady();
		Result = OnPostureResult(false);
		Result.bPostureBroken = !bWasStaggered;
		Result.bFinalStagger = true;
	}
	else if (Floor <= 0.0f && Health <= 0.0f)
	{
		Health = 0.0f;
		Outcome = EBossOutcome::Defeated;
	}
	else
	{
		Result = OnPostureResult(Posture.ApplyDamage(Damage.Posture));
	}
	Result.Applied = FDamageResult{HealthBefore - Health, Damage.Posture};
	Result.bPhaseChanged = UpdatePhase();
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
	Result.bPhaseChanged = UpdatePhase();
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

bool FBossEncounter::UpdatePhase()
{
	bool bChanged = false;
	while (static_cast<std::size_t>(PhaseIndex + 1) < Config.Phases.size())
	{
		const FBossPhase& Next = Config.Phases[static_cast<std::size_t>(PhaseIndex + 1)];
		const bool bHasCrack = Next.EnterCracksAtLeast >= 0;
		const bool bHasHealth = Next.EnterHealthRatioAtMost >= 0.0f;
		const float MaxHealth = NonNegative(Config.MaxHealth);
		const bool bCrackOk = bHasCrack && Shackle.GetCracks() >= Next.EnterCracksAtLeast;
		const bool bHealthOk = bHasHealth && MaxHealth > 0.0f && Health / MaxHealth <= Next.EnterHealthRatioAtMost;
		const bool bEnter = Next.bEnterOnAny ? (bCrackOk || bHealthOk)
		                                     : ((bHasCrack || bHasHealth) && (!bHasCrack || bCrackOk) && (!bHasHealth || bHealthOk));
		if (!bEnter)
		{
			break;
		}
		++PhaseIndex;
		if (Next.MaxPosture > 0.0f)
		{
			Posture.SetMaxPosture(Next.MaxPosture);
		}
		bChanged = true;
	}
	return bChanged;
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

bool FBossEncounter::CanPerformFinisher() const
{
	return Outcome == EBossOutcome::InProgress && Shackle.GetState() == EShackleState::Disabled
		&& Posture.IsIndefiniteStagger();
}

bool FBossEncounter::PerformFinisher()
{
	if (!CanPerformFinisher())
	{
		return false;
	}
	Outcome = EBossOutcome::Fled;
	Posture.EndStagger();
	return true;
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
	else if (Result == EPryResult::Failed)
	{
		Posture.EndStaggerWithRecovery(Config.Shackle.MissPostureRecoverFraction);
	}
}

std::vector<FMaterialAmount> FBossEncounter::GetOutcomeDrops() const
{
	if (Outcome == EBossOutcome::Freed)
	{
		return Config.FreedDrops;
	}
	if (Outcome == EBossOutcome::Fled)
	{
		return Config.FledDrops;
	}
	return {};
}
} // namespace ArpgCore
