// HitStop.h - Hit-stop duration from attack weight (piecewise-linear curve, clamped) and a clock
// that converts real delta time into game delta time while a hit-stop is running.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"

#include <vector>

namespace ArpgCore
{
/** Numeric weights for the design categories (`hit_weight`: light / medium / heavy, plus finisher). */
inline constexpr float HitWeightLight = 1.0f;
inline constexpr float HitWeightMedium = 2.0f;
inline constexpr float HitWeightHeavy = 3.0f;
inline constexpr float HitWeightFinisher = 4.0f;

struct FHitStopPoint
{
	float Weight = 0.0f;
	float Duration = 0.0f;
};

struct FHitStopConfig
{
	/** Must be sorted by ascending Weight. Outside the range the end values are used. */
	std::vector<FHitStopPoint> Curve{{0.0f, 0.0f}, {1.0f, 0.05f}, {3.0f, 0.12f}};
	float MinDuration = 0.0f;
	float MaxDuration = 0.20f;
	float TimeScaleDuringStop = 0.0f; // 0 = full freeze
	float PerfectParryBonus = 0.04f;  // added for perfect parries (before clamping)
	float PryBeatDuration = 0.08f;    // each successful pry beat
	float PryReleaseDuration = 0.12f; // the shackle comes off
};

ARPGCORE_API float ComputeHitStopDuration(const FHitStopConfig& Config, float Weight, bool bPerfectParry = false);

class ARPGCORE_API FHitStopClock
{
public:
	explicit FHitStopClock(float InTimeScaleDuringStop = 0.0f) : TimeScale(InTimeScaleDuringStop) {}

	/** Starts a hit-stop; overlapping triggers keep the longer remaining time (no stacking). */
	void Trigger(float Duration);
	/** Returns the game delta time for a real delta time. */
	float Advance(float RealDeltaSeconds);

	bool IsStopped() const { return Remaining > 0.0f; }
	float GetRemaining() const { return Remaining; }

private:
	float TimeScale;
	float Remaining = 0.0f;
};
} // namespace ArpgCore
