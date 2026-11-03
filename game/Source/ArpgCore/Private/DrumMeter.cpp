// DrumMeter.cpp
#include "ArpgCore/DrumMeter.h"

#include "MathUtil.h"

#include <algorithm>
#include <cmath>

namespace ArpgCore
{
using Detail::NonNegative;

FDrumMeter::FDrumMeter(const FDrumConfig& InConfig)
	: Config(InConfig)
{
}

float FDrumMeter::GetMaxPoints() const
{
	return static_cast<float>(std::max(Config.Notches, 0)) * NonNegative(Config.PointsPerNotch);
}

void FDrumMeter::AddEvent(EDrumEvent Event)
{
	float Gain = 0.0f;
	switch (Event)
	{
	case EDrumEvent::PerfectParry:
		Gain = Config.PerfectParryGain;
		break;
	case EDrumEvent::PerfectDodge:
		Gain = Config.PerfectDodgeGain;
		break;
	case EDrumEvent::HitLanded:
		Gain = Config.HitGain;
		break;
	}
	Points = std::min(GetMaxPoints(), Points + NonNegative(Gain));
	SinceCombat = 0.0f;
}

void FDrumMeter::Tick(float DeltaSeconds)
{
	const float Dt = Detail::SanitizeDelta(DeltaSeconds);
	SinceCombat += Dt;
	const float Delay = NonNegative(Config.DecayDelay);
	if (SinceCombat <= Delay || Points <= 0.0f)
	{
		return;
	}
	const float DecayTime = std::min(Dt, SinceCombat - Delay);
	const float Floor = Config.bDecayKeepsFullNotches
		? static_cast<float>(GetFullNotches()) * NonNegative(Config.PointsPerNotch)
		: 0.0f;
	Points = std::max(Floor, Points - NonNegative(Config.DecayPerSecond) * DecayTime);
}

int FDrumMeter::GetFullNotches() const
{
	const float PerNotch = NonNegative(Config.PointsPerNotch);
	if (PerNotch <= 0.0f)
	{
		return 0;
	}
	const int Full = static_cast<int>(std::floor(Points / PerNotch));
	return std::clamp(Full, 0, std::max(Config.Notches, 0));
}

bool FDrumMeter::CanSurge() const
{
	return GetMaxPoints() > 0.0f && Points >= GetMaxPoints();
}

bool FDrumMeter::TrySurge()
{
	if (!CanSurge())
	{
		return false;
	}
	Points = 0.0f;
	SinceCombat = 0.0f;
	return true;
}
} // namespace ArpgCore
