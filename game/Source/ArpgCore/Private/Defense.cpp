// Defense.cpp
#include "ArpgCore/Defense.h"

#include "MathUtil.h"

#include <algorithm>

namespace ArpgCore
{
using Detail::NonNegative;

FDefenseController::FDefenseController(const FDodgeConfig& InDodge, const FParryConfig& InParry, float ParryWindowScale)
	: Dodge(InDodge)
	, Parry(InParry)
{
	const float Scale = NonNegative(ParryWindowScale);
	ParryWindow = std::min(NonNegative(Parry.Window) * Scale, NonNegative(Parry.Duration));
	PerfectParryWindow = std::min(NonNegative(Parry.PerfectWindow) * Scale, ParryWindow);
}

bool FDefenseController::StartDodge()
{
	if (IsBusy())
	{
		return false;
	}
	Action = EDefenseAction::Dodge;
	Elapsed = 0.0f;
	return true;
}

bool FDefenseController::StartParry()
{
	if (IsBusy())
	{
		return false;
	}
	Action = EDefenseAction::Parry;
	Elapsed = 0.0f;
	return true;
}

void FDefenseController::Tick(float DeltaSeconds)
{
	if (Action == EDefenseAction::None)
	{
		return;
	}
	Elapsed += Detail::SanitizeDelta(DeltaSeconds);
	const float Duration = Action == EDefenseAction::Dodge ? NonNegative(Dodge.Duration) : NonNegative(Parry.Duration);
	if (Elapsed >= Duration)
	{
		Action = EDefenseAction::None;
		Elapsed = 0.0f;
	}
}

bool FDefenseController::IsInvulnerable() const
{
	return Action == EDefenseAction::Dodge && Elapsed >= NonNegative(Dodge.IFrameStart) && Elapsed < NonNegative(Dodge.IFrameEnd);
}

EDefenseOutcome FDefenseController::ResolveIncoming(const FAttackData& Attack) const
{
	if (Action == EDefenseAction::Dodge)
	{
		if (Attack.bUndodgeable || !IsInvulnerable())
		{
			return EDefenseOutcome::Hit;
		}
		const float PerfectEnd = NonNegative(Dodge.IFrameStart) + NonNegative(Dodge.PerfectWindow);
		return Elapsed <= PerfectEnd ? EDefenseOutcome::PerfectDodge : EDefenseOutcome::Dodged;
	}
	if (Action == EDefenseAction::Parry)
	{
		if (Attack.bUnparryable)
		{
			return EDefenseOutcome::Hit;
		}
		if (Elapsed <= PerfectParryWindow)
		{
			return EDefenseOutcome::PerfectParry;
		}
		if (Elapsed <= ParryWindow)
		{
			return EDefenseOutcome::Parried;
		}
	}
	return EDefenseOutcome::Hit;
}
} // namespace ArpgCore
