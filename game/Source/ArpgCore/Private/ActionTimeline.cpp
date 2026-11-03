// ActionTimeline.cpp
#include "ArpgCore/ActionTimeline.h"

#include "MathUtil.h"

#include <algorithm>

namespace ArpgCore
{
using Detail::NonNegative;

float FActionTiming::GetTotal() const
{
	return NonNegative(Startup) + NonNegative(Active) + NonNegative(Recovery);
}

float FActionTiming::GetResolvedCancelStart() const
{
	const float Total = GetTotal();
	if (CancelStart < 0.0f)
	{
		return NonNegative(Startup) + NonNegative(Active);
	}
	return std::min(NonNegative(CancelStart), Total);
}

float FActionTiming::GetResolvedCancelEnd() const
{
	const float Total = GetTotal();
	if (CancelEnd < 0.0f)
	{
		return Total;
	}
	return std::min(NonNegative(CancelEnd), Total);
}

void FActionTimeline::Start(const FActionTiming& InTiming)
{
	Timing = InTiming;
	Elapsed = 0.0f;
	bRunning = true;
	bActiveEnterReported = false;
	bActiveLeaveReported = false;
	bCancelEnterReported = false;
}

void FActionTimeline::Cancel()
{
	bRunning = false;
	Elapsed = 0.0f;
}

FTimelineEvents FActionTimeline::Tick(float DeltaSeconds)
{
	FTimelineEvents Events;
	if (!bRunning)
	{
		return Events;
	}
	Elapsed += Detail::SanitizeDelta(DeltaSeconds);

	const float ActiveStart = NonNegative(Timing.Startup);
	const float ActiveEnd = ActiveStart + NonNegative(Timing.Active);
	if (!bActiveEnterReported && Elapsed >= ActiveStart)
	{
		bActiveEnterReported = true;
		Events.bEnteredActive = true;
	}
	if (bActiveEnterReported && !bActiveLeaveReported && Elapsed >= ActiveEnd)
	{
		bActiveLeaveReported = true;
		Events.bLeftActive = true;
	}
	const float CancelStart = Timing.GetResolvedCancelStart();
	const float CancelEnd = Timing.GetResolvedCancelEnd();
	if (!bCancelEnterReported && CancelStart < CancelEnd && Elapsed >= CancelStart)
	{
		bCancelEnterReported = true;
		Events.bEnteredCancelWindow = true;
	}
	if (Elapsed >= Timing.GetTotal())
	{
		Events.bFinished = true;
		bRunning = false;
	}
	return Events;
}

EActionPhase FActionTimeline::GetPhase() const
{
	if (!bRunning)
	{
		return EActionPhase::Idle;
	}
	const float ActiveStart = NonNegative(Timing.Startup);
	if (Elapsed < ActiveStart)
	{
		return EActionPhase::Startup;
	}
	if (Elapsed < ActiveStart + NonNegative(Timing.Active))
	{
		return EActionPhase::Active;
	}
	return EActionPhase::Recovery;
}

bool FActionTimeline::IsInCancelWindow() const
{
	return bRunning && Elapsed >= Timing.GetResolvedCancelStart() && Elapsed < Timing.GetResolvedCancelEnd();
}
} // namespace ArpgCore
