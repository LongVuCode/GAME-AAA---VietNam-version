// Rng.h - Small deterministic PRNG (SplitMix64). Same seed => same sequence on every platform.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"

#include <cstdint>

namespace ArpgCore
{
class ARPGCORE_API FRng
{
public:
	explicit FRng(std::uint64_t InSeed = 0x9E3779B97F4A7C15ull) : State(InSeed) {}

	/** Next raw 64-bit value. */
	std::uint64_t NextU64();
	/** Uniform float in [0, 1) with 24 bits of precision (exactly representable). */
	float NextFloat01();
	/** Uniform integer in [Min, Max] (inclusive). Returns Min if Max < Min. */
	std::int32_t RangeInt(std::int32_t Min, std::int32_t Max);
	/** True with probability Chance (clamped to [0, 1]). Always consumes one value. */
	bool Roll(float Chance);

	std::uint64_t GetState() const { return State; }

private:
	std::uint64_t State;
};
} // namespace ArpgCore
