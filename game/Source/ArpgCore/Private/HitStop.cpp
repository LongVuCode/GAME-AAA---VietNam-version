// HitStop.cpp
#include "ArpgCore/HitStop.h"

#include "MathUtil.h"

#include <algorithm>
#include <cmath>

namespace ArpgCore
{
using Detail::NonNegative;

float ComputeHitStopDuration(const FHitStopConfig& Config, float Weight, bool bPerfectParry)
{
	const float W = std::isfinite(Weight) ? Weight : 0.0f;
	float Duration = NonNegative(Config.MinDuration);
	const std::vector<FHitStopPoint>& Curve = Config.Curve;
	if (!Curve.empty())
	{
		if (W <= Curve.front().Weight)
		{
			Duration = Curve.front().Duration;
		}
		else if (W >= Curve.back().Weight)
		{
			Duration = Curve.back().Duration;
		}
		else
		{
			for (std::size_t Index = 0; Index + 1 < Curve.size(); ++Index)
			{
				const FHitStopPoint& A = Curve[Index];
				const FHitStopPoint& B = Curve[Index + 1];
				if (W >= A.Weight && W <= B.Weight)
				{
					const float Span = B.Weight - A.Weight;
					const float T = Span > 0.0f ? (W - A.Weight) / Span : 1.0f;
					Duration = A.Duration + (B.Duration - A.Duration) * T;
					break;
				}
			}
		}
	}
	if (bPerfectParry)
	{
		Duration += NonNegative(Config.PerfectParryBonus);
	}
	const float Min = NonNegative(Config.MinDuration);
	const float Max = std::max(Min, NonNegative(Config.MaxDuration));
	return std::clamp(NonNegative(Duration), Min, Max);
}

void FHitStopClock::Trigger(float Duration)
{
	Remaining = std::max(Remaining, NonNegative(Duration));
}

float FHitStopClock::Advance(float RealDeltaSeconds)
{
	const float Dt = Detail::SanitizeDelta(RealDeltaSeconds);
	const float Stopped = std::min(Remaining, Dt);
	Remaining -= Stopped;
	return Stopped * Detail::Clamp01(TimeScale) + (Dt - Stopped);
}
} // namespace ArpgCore
