// InputBuffer.cpp
#include "ArpgCore/InputBuffer.h"

#include "MathUtil.h"

#include <algorithm>

namespace ArpgCore
{
FInputBuffer::FInputBuffer(float InWindow, std::size_t InCapacity)
	: Window(Detail::NonNegative(InWindow))
	, Capacity(std::max<std::size_t>(InCapacity, 1))
{
}

void FInputBuffer::Push(EInputType Type, double Now)
{
	Expire(Now);
	while (Entries.size() >= Capacity)
	{
		Entries.pop_front();
	}
	Entries.push_back(FBufferedInput{Type, Now});
}

void FInputBuffer::Expire(double Now)
{
	while (!Entries.empty() && (Now - Entries.front().Time) > static_cast<double>(Window))
	{
		Entries.pop_front();
	}
}

std::optional<FBufferedInput> FInputBuffer::Peek(double Now)
{
	Expire(Now);
	if (Entries.empty())
	{
		return std::nullopt;
	}
	return Entries.front();
}

std::optional<FBufferedInput> FInputBuffer::Consume(double Now)
{
	std::optional<FBufferedInput> Front = Peek(Now);
	if (Front)
	{
		Entries.pop_front();
	}
	return Front;
}
} // namespace ArpgCore
