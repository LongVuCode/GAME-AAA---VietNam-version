// FerryKhoenComponent.cpp - NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#include "Combat/FerryKhoenComponent.h"

#include "ProjectFerry.h"

UFerryKhoenComponent::UFerryKhoenComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UFerryKhoenComponent::InitializeBoss(const ArpgCore::FBossConfig& Config, const ArpgCore::FDifficultyConfig& Difficulty,
	bool bFeatureEnabled)
{
	ArpgCore::FBossConfig Effective = Config;
	Effective.Shackle.bEnabled = Config.Shackle.bEnabled && bFeatureEnabled;
	Encounter.Emplace(Effective, Difficulty);
	if (Difficulty.bPryAuto)
	{
		Encounter->SetPryInputMode(ArpgCore::EPryInputMode::Auto);
	}
	UE_LOG(LogFerry, Log, TEXT("boss %s: shackle %s, pry mode %s"), UTF8_TO_TCHAR(Config.Id.c_str()),
		Effective.Shackle.bEnabled ? TEXT("enabled") : TEXT("DISABLED (K0 fallback)"),
		Difficulty.bPryAuto ? TEXT("auto") : TEXT("timed"));
}

ArpgCore::FBossHitResult UFerryKhoenComponent::ReceivePlayerHit(const ArpgCore::FAttackData& Attack, const ArpgCore::FWeaponConfig& Weapon)
{
	return Encounter.IsSet() ? Encounter->ReceivePlayerHit(Attack, Weapon) : ArpgCore::FBossHitResult();
}

ArpgCore::FBossHitResult UFerryKhoenComponent::ReceivePostureDamage(float Amount)
{
	return Encounter.IsSet() ? Encounter->ReceivePostureDamage(Amount) : ArpgCore::FBossHitResult();
}

bool UFerryKhoenComponent::CanBeginPry() const
{
	return Encounter.IsSet() && Encounter->CanBeginPry();
}

bool UFerryKhoenComponent::BeginPry()
{
	return Encounter.IsSet() && Encounter->BeginPry();
}

EFerryPryResult UFerryKhoenComponent::InputPryBeat()
{
	if (!Encounter.IsSet())
	{
		return EFerryPryResult::None;
	}
	const EFerryPryResult Result = Convert(Encounter->InputPryBeat());
	if (Result != EFerryPryResult::None)
	{
		OnPryEvent.Broadcast(Result);
	}
	return Result;
}

bool UFerryKhoenComponent::CanPerformFinisher() const
{
	return Encounter.IsSet() && Encounter->CanPerformFinisher();
}

bool UFerryKhoenComponent::PerformFinisher()
{
	return Encounter.IsSet() && Encounter->PerformFinisher();
}

EFerryPryResult UFerryKhoenComponent::Advance(float GameDt, float RealDt)
{
	if (!Encounter.IsSet())
	{
		return EFerryPryResult::None;
	}
	const EFerryPryResult Result = Convert(Encounter->Tick(GameDt, RealDt));
	if (Result != EFerryPryResult::None)
	{
		OnPryEvent.Broadcast(Result);
	}
	return Result;
}

EFerryPryResult UFerryKhoenComponent::Convert(ArpgCore::EPryResult Result)
{
	switch (Result)
	{
	case ArpgCore::EPryResult::BeatHit:
		return EFerryPryResult::BeatHit;
	case ArpgCore::EPryResult::BeatMissed:
		return EFerryPryResult::BeatMissed;
	case ArpgCore::EPryResult::Failed:
		return EFerryPryResult::Failed;
	case ArpgCore::EPryResult::Freed:
		return EFerryPryResult::Freed;
	case ArpgCore::EPryResult::None:
	default:
		return EFerryPryResult::None;
	}
}

EFerryBossOutcome UFerryKhoenComponent::GetOutcome() const
{
	if (!Encounter.IsSet())
	{
		return EFerryBossOutcome::InProgress;
	}
	switch (Encounter->GetOutcome())
	{
	case ArpgCore::EBossOutcome::Freed:
		return EFerryBossOutcome::Freed;
	case ArpgCore::EBossOutcome::Fled:
		return EFerryBossOutcome::Fled;
	case ArpgCore::EBossOutcome::Defeated:
		return EFerryBossOutcome::Defeated;
	case ArpgCore::EBossOutcome::InProgress:
	default:
		return EFerryBossOutcome::InProgress;
	}
}

bool UFerryKhoenComponent::IsShackleEnabled() const
{
	return Encounter.IsSet() && Encounter->GetShackle().GetState() != ArpgCore::EShackleState::Disabled;
}

bool UFerryKhoenComponent::IsPrying() const
{
	return Encounter.IsSet() && Encounter->GetShackle().GetState() == ArpgCore::EShackleState::Prying;
}

bool UFerryKhoenComponent::IsStaggered() const
{
	return Encounter.IsSet() && Encounter->GetPosture().IsStaggered();
}

float UFerryKhoenComponent::GetHealthRatio() const
{
	if (!Encounter.IsSet() || Encounter->GetConfig().MaxHealth <= 0.0f)
	{
		return 0.0f;
	}
	return FMath::Clamp(Encounter->GetHealth() / Encounter->GetConfig().MaxHealth, 0.0f, 1.0f);
}

float UFerryKhoenComponent::GetPostureRatio() const
{
	return Encounter.IsSet() ? Encounter->GetPosture().GetRatio() : 0.0f;
}

int32 UFerryKhoenComponent::GetCracks() const
{
	return Encounter.IsSet() ? Encounter->GetShackle().GetCracks() : 0;
}

int32 UFerryKhoenComponent::GetCracksToOpen() const
{
	return Encounter.IsSet() ? Encounter->GetShackle().GetConfig().CracksToOpen : 0;
}

int32 UFerryKhoenComponent::GetBeatsHit() const
{
	return Encounter.IsSet() ? Encounter->GetShackle().GetBeatsHit() : 0;
}

int32 UFerryKhoenComponent::GetPryBeats() const
{
	return Encounter.IsSet() ? Encounter->GetShackle().GetConfig().PryBeats : 0;
}

float UFerryKhoenComponent::GetPryElapsed() const
{
	return Encounter.IsSet() ? Encounter->GetShackle().GetPryElapsed() : 0.0f;
}

float UFerryKhoenComponent::GetCurrentBeatTime() const
{
	return Encounter.IsSet() ? Encounter->GetShackle().GetCurrentTargetTime() : 0.0f;
}

float UFerryKhoenComponent::GetBeatHalfWindow() const
{
	return Encounter.IsSet() ? Encounter->GetShackle().GetHalfWindow() : 0.0f;
}

float UFerryKhoenComponent::GetBeatInterval() const
{
	return Encounter.IsSet() ? Encounter->GetShackle().GetConfig().BeatInterval : 0.0f;
}

float UFerryKhoenComponent::GetSilenceAfter() const
{
	return Encounter.IsSet() ? Encounter->GetShackle().GetConfig().SilenceAfter : 0.0f;
}

int32 UFerryKhoenComponent::GetPhaseIndex() const
{
	return Encounter.IsSet() ? Encounter->GetPhaseIndex() : 0;
}

const ArpgCore::FBossPhase* UFerryKhoenComponent::GetPhase() const
{
	return Encounter.IsSet() ? Encounter->GetPhase() : nullptr;
}

const ArpgCore::FBossConfig* UFerryKhoenComponent::GetConfig() const
{
	return Encounter.IsSet() ? &Encounter->GetConfig() : nullptr;
}
