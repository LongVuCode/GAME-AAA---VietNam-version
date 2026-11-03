// Shackle.cpp
#include "ArpgCore/Shackle.h"

#include "MathUtil.h"

#include <algorithm>
#include <cmath>

namespace ArpgCore
{
using Detail::NonNegative;

FShackle::FShackle(const FShackleConfig& InConfig, float BeatWindowScale)
	: Config(InConfig)
{
	HalfWindow = NonNegative(Config.BeatHalfWindow) * NonNegative(BeatWindowScale);
	const float Interval = NonNegative(Config.BeatInterval);
	if (Interval > 0.0f)
	{
		// Windows of consecutive beats must not overlap.
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
	PryElapsed = 0.0f;
	return true;
}

float FShackle::GetBeatTime(int Index) const
{
	return NonNegative(Config.LeadIn) + static_cast<float>(std::max(Index, 0)) * NonNegative(Config.BeatInterval);
}

EPryResult FShackle::InputBeat()
{
	if (State != EShackleState::Prying)
	{
		return EPryResult::None;
	}
	if (std::fabs(PryElapsed - GetBeatTime(BeatsHit)) > HalfWindow)
	{
		AbortPry();
		return EPryResult::Miss;
	}
	++BeatsHit;
	if (BeatsHit >= std::max(Config.PryBeats, 1))
	{
		State = EShackleState::Freed;
		return EPryResult::Freed;
	}
	return EPryResult::BeatHit;
}

EPryResult FShackle::Tick(float DeltaSeconds)
{
	if (State != EShackleState::Prying)
	{
		return EPryResult::None;
	}
	PryElapsed += Detail::SanitizeDelta(DeltaSeconds);
	if (PryElapsed > GetBeatTime(BeatsHit) + HalfWindow)
	{
		AbortPry();
		return EPryResult::Miss;
	}
	return EPryResult::None;
}

void FShackle::AbortPry()
{
	State = EShackleState::Ready; // cracks are kept: the next posture break reopens the pry
	BeatsHit = 0;
	PryElapsed = 0.0f;
}
} // namespace ArpgCore
