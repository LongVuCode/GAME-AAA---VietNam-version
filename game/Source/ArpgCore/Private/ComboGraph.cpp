// ComboGraph.cpp
#include "ArpgCore/ComboGraph.h"

#include "MathUtil.h"

#include <limits>
#include <queue>

namespace ArpgCore
{
namespace
{
bool IsAttackInput(EInputType Type)
{
	return Type == EInputType::Light || Type == EInputType::Heavy;
}

float UpperBound(float MaxDelay)
{
	return MaxDelay < 0.0f ? std::numeric_limits<float>::infinity() : MaxDelay;
}

const char* InputName(EInputType Type)
{
	return Type == EInputType::Light ? "light" : "heavy";
}
} // namespace

int FComboGraph::SpecialNodeFromName(const std::string& Name)
{
	if (Name == "@dodge")
	{
		return AfterDodgeNode;
	}
	if (Name == "@perfect_parry")
	{
		return AfterPerfectParryNode;
	}
	return RootNode;
}

int FComboGraph::AddMove(FComboMove Move)
{
	if (Move.Id.empty() || FindMove(Move.Id) != RootNode)
	{
		return RootNode;
	}
	Moves.push_back(std::move(Move));
	return static_cast<int>(Moves.size()) - 1;
}

FStatus FComboGraph::AddTransition(const std::string& FromId, EInputType Input, float MinDelay, float MaxDelay,
	const std::string& ToId)
{
	const bool bSpecial = FromId.empty() || FromId[0] == '@';
	const int From = bSpecial ? SpecialNodeFromName(FromId) : FindMove(FromId);
	if ((bSpecial && !FromId.empty() && From == RootNode) || (!bSpecial && From == RootNode))
	{
		return FStatus::Fail(FError{"from", "unknown move '" + FromId + "'"});
	}
	const int To = FindMove(ToId);
	if (To == RootNode)
	{
		return FStatus::Fail(FError{"to", "unknown move '" + ToId + "'"});
	}
	if (!IsAttackInput(Input))
	{
		return FStatus::Fail(FError{"input", "combo transitions accept only light/heavy"});
	}
	if (!(MinDelay >= 0.0f) || MinDelay > UpperBound(MaxDelay))
	{
		return FStatus::Fail(FError{"min_delay", "must be >= 0 and <= max_delay"});
	}
	Transitions.push_back(FComboTransition{From, Input, MinDelay, MaxDelay, To});
	return OkStatus();
}

int FComboGraph::FindMove(const std::string& Id) const
{
	for (std::size_t Index = 0; Index < Moves.size(); ++Index)
	{
		if (Moves[Index].Id == Id)
		{
			return static_cast<int>(Index);
		}
	}
	return RootNode;
}

std::optional<int> FComboGraph::FindNext(int From, EInputType Input, float DelaySincePrevious,
	const std::set<std::string>* Unlocked) const
{
	for (const FComboTransition& T : Transitions)
	{
		if (T.From != From || T.Input != Input)
		{
			continue;
		}
		const std::string& Required = Moves[static_cast<std::size_t>(T.To)].RequiredUnlock;
		if (!Required.empty() && Unlocked != nullptr && Unlocked->count(Required) == 0)
		{
			continue;
		}
		// Root/context transitions ignore the delay: there is no previous move in the chain.
		if (IsSpecialNode(From) || (DelaySincePrevious >= T.MinDelay && DelaySincePrevious <= UpperBound(T.MaxDelay)))
		{
			return T.To;
		}
	}
	return std::nullopt;
}

std::vector<FError> FComboGraph::Validate() const
{
	std::vector<FError> Errors;
	for (std::size_t A = 0; A < Transitions.size(); ++A)
	{
		for (std::size_t B = A + 1; B < Transitions.size(); ++B)
		{
			const FComboTransition& TA = Transitions[A];
			const FComboTransition& TB = Transitions[B];
			if (TA.From != TB.From || TA.Input != TB.Input)
			{
				continue;
			}
			const bool bOverlap = IsSpecialNode(TA.From)
				|| (TA.MinDelay <= UpperBound(TB.MaxDelay) && TB.MinDelay <= UpperBound(TA.MaxDelay));
			if (bOverlap)
			{
				const std::string FromName = TA.From == RootNode ? std::string("<root>")
					: TA.From == AfterDodgeNode ? std::string("@dodge")
					: TA.From == AfterPerfectParryNode ? std::string("@perfect_parry")
					: Moves[static_cast<std::size_t>(TA.From)].Id;
				Errors.push_back(FError{"combo", "ambiguous " + std::string(InputName(TA.Input)) + " branches from '" + FromName + "' (overlapping delay ranges)"});
			}
		}
	}

	std::vector<bool> Reached(Moves.size(), false);
	std::queue<int> Open;
	Open.push(RootNode);
	Open.push(AfterDodgeNode);
	Open.push(AfterPerfectParryNode);
	while (!Open.empty())
	{
		const int Node = Open.front();
		Open.pop();
		for (const FComboTransition& T : Transitions)
		{
			if (T.From == Node && !Reached[static_cast<std::size_t>(T.To)])
			{
				Reached[static_cast<std::size_t>(T.To)] = true;
				Open.push(T.To);
			}
		}
	}
	for (std::size_t Index = 0; Index < Moves.size(); ++Index)
	{
		if (!Reached[Index])
		{
			Errors.push_back(FError{"combo", "move '" + Moves[Index].Id + "' is unreachable from root"});
		}
	}
	return Errors;
}

FComboRunner::FComboRunner(const FComboGraph& InGraph, const FComboRunnerConfig& InConfig)
	: Graph(&InGraph)
	, Config(InConfig)
	, Buffer(InConfig.InputBufferWindow, InConfig.InputBufferCapacity)
{
}

bool FComboRunner::PressInput(EInputType Type)
{
	if (!IsAttackInput(Type))
	{
		return false;
	}
	Buffer.Push(Type, Now);
	return true;
}

FComboTickResult FComboRunner::Tick(float DeltaSeconds)
{
	FComboTickResult Result;
	const float Dt = Detail::SanitizeDelta(DeltaSeconds);
	Now += Dt;

	if (Timeline.IsRunning())
	{
		const FTimelineEvents Events = Timeline.Tick(Dt);
		Result.bHitWindowOpened = Events.bEnteredActive;
		Result.bHitWindowClosed = Events.bLeftActive;
		if (Events.bFinished)
		{
			Result.bMoveFinished = true;
			LastFinishTime = Now;
		}
	}

	if (!Timeline.IsRunning() || Timeline.IsInCancelWindow())
	{
		TryStartBufferedMove(Result);
	}

	if (ContextNode != FComboGraph::RootNode && Now > ContextExpiry)
	{
		ContextNode = FComboGraph::RootNode;
	}
	if (!Timeline.IsRunning() && CurrentMove != FComboGraph::RootNode && (Now - LastFinishTime) > LinkWindowOf(CurrentMove))
	{
		CurrentMove = FComboGraph::RootNode;
		bHasPrevious = false;
		Result.bComboReset = true;
	}
	return Result;
}

float FComboRunner::LinkWindowOf(int Move) const
{
	const float PerMove = Graph->GetMove(Move).ChainLinkWindow;
	return PerMove < 0.0f ? Config.ChainLinkWindow : PerMove;
}

void FComboRunner::OpenContext(int Node, float Window)
{
	ContextNode = Node;
	ContextExpiry = Now + Detail::NonNegative(Window);
}

bool FComboRunner::TryStartBufferedMove(FComboTickResult& Result)
{
	const std::optional<FBufferedInput> Input = Buffer.Consume(Now);
	if (!Input)
	{
		return false;
	}

	std::optional<int> Next;
	if (ContextNode != FComboGraph::RootNode && Input->Time <= ContextExpiry)
	{
		Next = Graph->FindNext(ContextNode, Input->Type, 0.0f, &Unlocked);
	}
	const float Delay = bHasPrevious ? (Input->Time - LastMoveStartTime) : std::numeric_limits<float>::max();
	if (!Next && CurrentMove != FComboGraph::RootNode
		&& (Timeline.IsRunning() || (Input->Time - LastFinishTime) <= LinkWindowOf(CurrentMove)))
	{
		Next = Graph->FindNext(CurrentMove, Input->Type, Delay, &Unlocked);
	}
	if (!Next)
	{
		Next = Graph->FindNext(FComboGraph::RootNode, Input->Type, Delay, &Unlocked);
	}
	if (!Next)
	{
		return false; // no move for this input: dropped
	}

	Timeline.Start(Graph->GetMove(*Next).Timing);
	CurrentMove = *Next;
	ContextNode = FComboGraph::RootNode;
	LastMoveStartTime = Now;
	bHasPrevious = true;
	Result.StartedMove = *Next;
	return true;
}

bool FComboRunner::TryCancelForDefense()
{
	if (Timeline.IsRunning()
		&& (!Timeline.IsInCancelWindow()
			|| Timeline.GetElapsed() < Timeline.GetTiming().GetResolvedCancelStart() + Detail::NonNegative(Config.DefenseCancelDelay)))
	{
		return false;
	}
	Timeline.Cancel();
	Buffer.Clear();
	CurrentMove = FComboGraph::RootNode;
	bHasPrevious = false;
	return true;
}
} // namespace ArpgCore
