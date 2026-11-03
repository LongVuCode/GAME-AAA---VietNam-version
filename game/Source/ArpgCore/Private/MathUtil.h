// MathUtil.h (private) - Small sanitizing helpers shared by the implementation files.
#pragma once

#include <algorithm>
#include <cmath>

namespace ArpgCore::Detail
{
/** Finite and > 0, otherwise 0. */
inline float NonNegative(float Value)
{
	return (std::isfinite(Value) && Value > 0.0f) ? Value : 0.0f;
}

inline float Clamp01(float Value)
{
	return std::clamp(NonNegative(Value), 0.0f, 1.0f);
}

/** Valid simulation step: finite and > 0, otherwise 0. */
inline float SanitizeDelta(float DeltaSeconds)
{
	return NonNegative(DeltaSeconds);
}
} // namespace ArpgCore::Detail
