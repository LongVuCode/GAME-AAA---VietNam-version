// Shackle.cpp
#include "ArpgCore/Shackle.h"

#include "MathUtil.h"

#include <algorithm>
#include <cmath>

namespace ArpgCore
{
using Detail::NonNegative;

FShackle::FShackle(const FShackleConfig& InConfig, float BeatWindowScale, EPryInputMode InMode)
	: Config(InConfig)
	, Mode(InMode)
{
	HalfWindow = NonNegative(Config.BeatHalfWindow) * NonNegative(BeatWindowScale);
	const float Interval = NonNegative(Config.BeatInterval);
	if (Interval > 0.0f)
	{
		// Windows of consecutive slots must not overlap.
		HalfWindow = std::min(HalfWindow, Interval * 0.5f);
	}
	if (!Config.bEnabled)
	{
		State = EShackleState::Disabled;
	}
	else
	{
		State = Config.CracksToOpen <= 0 ? EShackleState::Ready : EShackleState::Intact;
	}
}

void FShackle::OnPostureBroken()
{
	if (State != EShackleState::Intact && State != EShackleState::Cracking)
	{
		return;
	}
	++Cracks;
	State = Cracks >= Config.CracksToOpen ? EShackleState::Ready : EShackleState::Cracking;
}

void FShackle::ForceReady()
{
	if (State == EShackleState::Intact || State == EShackleState::Cracking)
	{
		Cracks = std::max(Cracks, Config.CracksToOpen);
		State = EShackleState::Ready;
	}
}

bool FShackle::CanBeginPry(bool bTargetStaggered) const
{
	return State == EShackleState::Ready && bTargetStaggered;
}

bool FShackle::BeginPry(bool bTargetStaggered)
{
	if (!CanBeginPry(bTargetStaggered))
	{
		return false;
	}
	State = EShackleState::Prying;
	BeatsHit = 0;
	MissesOnBeat = 0;
	Slot = 0;
	PryElapsed = 0.0f;
	HoldProgress = 0.0f;
	return true;
}

float FShackle::GetBeatTime(int Index) const
{
	return NonNegative(Config.LeadIn) + static_cast<float>(std::max(Index, 0)) * NonNegative(Config.BeatInterval);
}

EPryResult FShackle::RegisterHit()
{
	++BeatsHit;
	++Slot;
	MissesOnBeat = 0;
	HoldProgress = 0.0f;
	if (BeatsHit >= std::max(Config.PryBeats, 1))
	{
		State = EShackleState::Freed;
		return EPryResult::Freed;
	}
	return EPryResult::BeatHit;
}

EPryResult FShackle::RegisterMiss()
{
	++MissesOnBeat;
	if (MissesOnBeat > std::max(Config.MissRetriesPerBeat, 0))
	{
		AbortPry();
		return EPryResult::Failed;
	}
	++Slot; // retry the same beat on the next slot of the drum grid
	return EPryResult::BeatMissed;
}

EPryResult FShackle::InputBeat()
{
	if (State != EShackleState::Prying || Mode != EPryInputMode::Timed)
	{
		return EPryResult::None;
	}
	if (std::fabs(PryElapsed - GetBeatTime(Slot)) > HalfWindow)
	{
		return RegisterMiss();
	}
	return RegisterHit();
}

EPryResult FShackle::Tick(float RealDeltaSeconds)
{
	if (State != EShackleState::Prying)
	{
		return EPryResult::None;
	}
	float Dt = Detail::SanitizeDelta(RealDeltaSeconds);
	if (Config.MaxTickDelta > 0.0f)
	{
		Dt = std::min(Dt, Config.MaxTickDelta);
	}
	PryElapsed += Dt;
	switch (Mode)
	{
	case EPryInputMode::Auto:
		return PryElapsed >= GetBeatTime(Slot) ? RegisterHit() : EPryResult::None;
	case EPryInputMode::Hold:
		HoldProgress = bHeld ? HoldProgress + Dt : 0.0f;
		return HoldProgress >= NonNegative(Config.HoldDurationPerBeat) && bHeld ? RegisterHit() : EPryResult::None;
	case EPryInputMode::Timed:
		break;
	}
	if (PryElapsed > GetBeatTime(Slot) + HalfWindow)
	{
		return RegisterMiss();
	}
	return EPryResult::None;
}

void FShackle::AbortPry()
{
	State = EShackleState::Ready; // cracks are kept: the next posture break reopens the pry
	BeatsHit = 0;
	MissesOnBeat = 0;
	Slot = 0;
	PryElapsed = 0.0f;
	HoldProgress = 0.0f;
}
} // namespace ArpgCore
