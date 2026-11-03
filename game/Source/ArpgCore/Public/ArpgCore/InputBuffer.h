// InputBuffer.h - Time-stamped input buffer. Inputs expire after Window seconds.
// Timestamps are double: a float clock loses precision after ~1 h of play (QA N5).
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/CombatTypes.h"

#include <cstddef>
#include <deque>
#include <optional>

namespace ArpgCore
{
struct FBufferedInput
{
	EInputType Type = EInputType::Light;
	double Time = 0.0; // time of the press, in the owner's clock
};

class ARPGCORE_API FInputBuffer
{
public:
	/** Window: max age (seconds) of a buffered input. Capacity: max entries (oldest dropped). */
	explicit FInputBuffer(float InWindow = 0.2f, std::size_t InCapacity = 1);

	void Push(EInputType Type, double Now);
	/** Removes inputs older than Window. */
	void Expire(double Now);
	/** Oldest non-expired input, without removing it. */
	std::optional<FBufferedInput> Peek(double Now);
	/** Removes and returns the oldest non-expired input. */
	std::optional<FBufferedInput> Consume(double Now);
	void Clear() { Entries.clear(); }

	std::size_t Num() const { return Entries.size(); }
	float GetWindow() const { return Window; }

private:
	std::deque<FBufferedInput> Entries;
	float Window;
	std::size_t Capacity;
};
} // namespace ArpgCore
