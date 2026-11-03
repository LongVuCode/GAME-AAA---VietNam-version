// Posture.cpp
#include "ArpgCore/Posture.h"

#include "MathUtil.h"

#include <algorithm>

namespace ArpgCore
{
using Detail::NonNegative;

FPosture::FPosture(const FPostureConfig& InConfig)
	: Config(InConfig)
{
}

bool FPosture::ApplyDamage(float Amount)
{
	const float Value = NonNegative(Amount);
	if (bStaggered || Value <= 0.0f)
	{
		return false;
	}
	Accumulated += Value;
	SinceLastDamage = 0.0f;
	const float Max = NonNegative(Config.MaxPosture);
	if (Accumulated >= Max)
	{
		Accumulated = Max;
		bStaggered = true;
		bStaggerPaused = false;
		StaggerRemaining = NonNegative(Config.StaggerDuration);
		++BreakCount;
		return true;
	}
	return false;
}

void FPosture::Recover(float Amount)
{
	if (bStaggered)
	{
		return;
	}
	Accumulated = std::max(0.0f, Accumulated - NonNegative(Amount));
}

void FPosture::Tick(float DeltaSeconds)
{
	const float Dt = Detail::SanitizeDelta(DeltaSeconds);
	if (bStaggered)
	{
		if (!bStaggerPaused)
		{
			StaggerRemaining -= Dt;
			if (StaggerRemaining <= 0.0f)
			{
				EndStagger();
			}
		}
		return;
	}
	SinceLastDamage += Dt;
	const float Delay = NonNegative(Config.RegenDelay);
	if (SinceLastDamage > Delay)
	{
		const float RegenTime = std::min(Dt, SinceLastDamage - Delay);
		Accumulated = std::max(0.0f, Accumulated - NonNegative(Config.RegenPerSecond) * RegenTime);
	}
}

void FPosture::EndStagger()
{
	EndStaggerWithRecovery(1.0f - Detail::Clamp01(Config.PostureAfterStagger));
}

void FPosture::EndStaggerWithRecovery(float RecoverFraction)
{
	bStaggered = false;
	bStaggerPaused = false;
	StaggerRemaining = 0.0f;
	SinceLastDamage = 0.0f;
	Accumulated = NonNegative(Config.MaxPosture) * (1.0f - Detail::Clamp01(RecoverFraction));
}

float FPosture::GetRatio() const
{
	const float Max = NonNegative(Config.MaxPosture);
	return Max > 0.0f ? Accumulated / Max : 1.0f;
}

float FPosture::GetDamageMultiplier() const
{
	return bStaggered ? NonNegative(Config.StaggerDamageMultiplier) : 1.0f;
}
} // namespace ArpgCore
