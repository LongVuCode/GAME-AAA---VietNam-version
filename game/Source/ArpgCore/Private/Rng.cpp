// Rng.cpp - SplitMix64 implementation.
#include "ArpgCore/Rng.h"

namespace ArpgCore
{
std::uint64_t FRng::NextU64()
{
	State += 0x9E3779B97F4A7C15ull;
	std::uint64_t Z = State;
	Z = (Z ^ (Z >> 30)) * 0xBF58476D1CE4E5B9ull;
	Z = (Z ^ (Z >> 27)) * 0x94D049BB133111EBull;
	return Z ^ (Z >> 31);
}

float FRng::NextFloat01()
{
	// 24 random bits -> exactly representable float in [0, 1).
	const std::uint64_t Bits = NextU64() >> 40;
	return static_cast<float>(Bits) * (1.0f / 16777216.0f);
}

std::int32_t FRng::RangeInt(std::int32_t Min, std::int32_t Max)
{
	if (Max <= Min)
	{
		return Min;
	}
	const std::uint64_t Span = static_cast<std::uint64_t>(static_cast<std::int64_t>(Max) - static_cast<std::int64_t>(Min)) + 1u;
	return static_cast<std::int32_t>(static_cast<std::int64_t>(Min) + static_cast<std::int64_t>(NextU64() % Span));
}

bool FRng::Roll(float Chance)
{
	const float Value = NextFloat01();
	if (!(Chance > 0.0f))
	{
		return false;
	}
	return Value < Chance;
}
} // namespace ArpgCore
