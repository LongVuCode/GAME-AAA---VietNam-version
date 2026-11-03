// ActionTimeline.h - Startup / Active / Recovery timeline of a single action, plus a cancel window.
// Time is in seconds, advanced deterministically with Tick(DeltaSeconds).
#pragma once

#include "ArpgCore/ArpgCoreApi.h"

#include <cstdint>

namespace ArpgCore
{
/** Timing of one action. Negative values are treated as 0 (cancel fields: see comments). */
struct FActionTiming
{
	float Startup = 0.10f;
	float Active = 0.10f;
	float Recovery = 0.30f;
	/** Cancel window start, seconds from action start. < 0 => start of Recovery. */
	float CancelStart = -1.0f;
	/** Cancel window end, seconds from action start. < 0 => end of action. */
	float CancelEnd = -1.0f;

	float GetTotal() const;
	float GetResolvedCancelStart() const;
	float GetResolvedCancelEnd() const;
};

enum class EActionPhase : std::uint8_t
{
	Idle,
	Startup,
	Active,
	Recovery,
};

/** Edge events produced by one Tick. Several may fire in the same tick when DeltaSeconds is large. */
struct FTimelineEvents
{
	bool bEnteredActive = false;
	bool bLeftActive = false;
	bool bEnteredCancelWindow = false;
	bool bFinished = false;
};

class ARPGCORE_API FActionTimeline
{
public:
	FActionTimeline() = default;

	/** Starts (or restarts) the action with the given timing. */
	void Start(const FActionTiming& InTiming);
	/** Aborts the action and returns to Idle without emitting events. */
	void Cancel();
	/** Advances time. Returns edge events crossed during this step. Negative dt is ignored. */
	FTimelineEvents Tick(float DeltaSeconds);

	EActionPhase GetPhase() const;
	bool IsRunning() const { return bRunning; }
	float GetElapsed() const { return Elapsed; }
	bool IsInCancelWindow() const;
	const FActionTiming& GetTiming() const { return Timing; }

private:
	FActionTiming Timing;
	float Elapsed = 0.0f;
	bool bRunning = false;
	bool bActiveEnterReported = false;
	bool bActiveLeaveReported = false;
	bool bCancelEnterReported = false;
};
} // namespace ArpgCore
