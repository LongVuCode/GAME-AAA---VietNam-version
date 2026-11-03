// SecretGraph.cpp
#include "ArpgCore/SecretGraph.h"

#include <algorithm>
#include <bit>
#include <cstdint>
#include <map>
#include <unordered_map>

namespace ArpgCore
{
namespace
{
constexpr std::size_t MaxNodes = 64;

/** Index-based form of the graph used by the searches. States are bitmasks of completed nodes. */
struct FCompiled
{
	std::size_t NodeCount = 0;
	std::vector<std::vector<std::size_t>> Requires; // clue indices per node
	std::vector<std::uint64_t> ExcludedMask;        // per node
	std::vector<std::uint64_t> GrantMask;           // per clue: nodes granting it
	std::vector<bool> BaseKnown;                    // per clue: known without completing anything
	std::uint64_t EndingMask = 0;
	std::map<std::string, std::size_t> NodeIndex;
};

FCompiled Compile(const FSecretGraphDef& Def, const std::set<std::string>& ExtraKnownClues)
{
	FCompiled C;
	C.NodeCount = Def.Nodes.size();
	std::map<std::string, std::size_t> ClueIndex;
	auto ClueOf = [&ClueIndex, &C](const std::string& Clue) {
		const auto [It, bInserted] = ClueIndex.emplace(Clue, ClueIndex.size());
		if (bInserted)
		{
			C.GrantMask.push_back(0);
			C.BaseKnown.push_back(false);
		}
		return It->second;
	};
	for (std::size_t I = 0; I < C.NodeCount; ++I)
	{
		C.NodeIndex[Def.Nodes[I].Id] = I;
	}
	C.Requires.resize(C.NodeCount);
	C.ExcludedMask.assign(C.NodeCount, 0);
	for (std::size_t I = 0; I < C.NodeCount; ++I)
	{
		const FSecretNode& Node = Def.Nodes[I];
		for (const std::string& Clue : Node.RequiresClues)
		{
			C.Requires[I].push_back(ClueOf(Clue));
		}
		for (const std::string& Clue : Node.GrantsClues)
		{
			C.GrantMask[ClueOf(Clue)] |= (std::uint64_t{1} << I);
		}
		for (const std::string& Other : Node.ExcludedBy)
		{
			const auto It = C.NodeIndex.find(Other);
			if (It != C.NodeIndex.end())
			{
				C.ExcludedMask[I] |= (std::uint64_t{1} << It->second);
			}
		}
		if (Node.bIsEnding)
		{
			C.EndingMask |= (std::uint64_t{1} << I);
		}
	}
	for (const std::string& Clue : Def.InitialClues)
	{
		C.BaseKnown[ClueOf(Clue)] = true;
	}
	for (const std::string& Clue : ExtraKnownClues)
	{
		C.BaseKnown[ClueOf(Clue)] = true;
	}
	return C;
}

bool IsAvailableMask(const FCompiled& C, std::uint64_t State, std::size_t Node)
{
	const std::uint64_t Bit = std::uint64_t{1} << Node;
	if ((State & Bit) != 0 || (State & C.ExcludedMask[Node]) != 0)
	{
		return false;
	}
	for (const std::size_t Clue : C.Requires[Node])
	{
		if (!C.BaseKnown[Clue] && (State & C.GrantMask[Clue]) == 0)
		{
			return false;
		}
	}
	return true;
}

struct FSearch
{
	std::vector<std::uint64_t> States; // discovery (BFS) order
	std::vector<std::vector<std::size_t>> Successors;
	std::vector<bool> CanFinish;
	bool bExhaustive = true;
};

/** BFS over reachable states from Start, then marks states from which an ending is reachable. */
FSearch Explore(const FCompiled& C, std::uint64_t Start, std::size_t MaxStates)
{
	FSearch S;
	std::unordered_map<std::uint64_t, std::size_t> Index;
	S.States.push_back(Start);
	S.Successors.emplace_back();
	Index.emplace(Start, 0);
	for (std::size_t Cursor = 0; Cursor < S.States.size(); ++Cursor)
	{
		const std::uint64_t State = S.States[Cursor];
		if ((State & C.EndingMask) != 0)
		{
			continue; // finished: terminal
		}
		for (std::size_t Node = 0; Node < C.NodeCount; ++Node)
		{
			if (!IsAvailableMask(C, State, Node))
			{
				continue;
			}
			const std::uint64_t Next = State | (std::uint64_t{1} << Node);
			auto It = Index.find(Next);
			if (It == Index.end())
			{
				if (S.States.size() >= MaxStates)
				{
					S.bExhaustive = false;
					continue;
				}
				It = Index.emplace(Next, S.States.size()).first;
				S.States.push_back(Next);
				S.Successors.emplace_back();
			}
			S.Successors[Cursor].push_back(It->second);
		}
	}

	// Transitions only add bits, so processing by descending popcount visits successors first.
	std::vector<std::size_t> Order(S.States.size());
	for (std::size_t I = 0; I < Order.size(); ++I)
	{
		Order[I] = I;
	}
	std::stable_sort(Order.begin(), Order.end(), [&S](std::size_t A, std::size_t B) {
		return std::popcount(S.States[A]) > std::popcount(S.States[B]);
	});
	S.CanFinish.assign(S.States.size(), false);
	for (const std::size_t I : Order)
	{
		bool bGood = (S.States[I] & C.EndingMask) != 0;
		for (std::size_t K = 0; !bGood && K < S.Successors[I].size(); ++K)
		{
			bGood = S.CanFinish[S.Successors[I][K]];
		}
		S.CanFinish[I] = bGood;
	}
	return S;
}

std::uint64_t ToMask(const FCompiled& C, const FSecretProgress& Progress)
{
	std::uint64_t Mask = 0;
	for (const std::string& Id : Progress.CompletedNodes)
	{
		const auto It = C.NodeIndex.find(Id);
		if (It != C.NodeIndex.end())
		{
			Mask |= (std::uint64_t{1} << It->second);
		}
	}
	return Mask;
}
} // namespace

TResult<FSecretGraph> FSecretGraph::Create(const FSecretGraphDef& Def)
{
	std::vector<FError> Errors;
	if (Def.Nodes.size() > MaxNodes)
	{
		Errors.push_back(FError{"nodes", "at most 64 nodes per secret graph"});
	}
	std::set<std::string> Ids;
	std::set<std::string> Granted(Def.InitialClues.begin(), Def.InitialClues.end());
	bool bHasEnding = false;
	for (std::size_t I = 0; I < Def.Nodes.size(); ++I)
	{
		const FSecretNode& Node = Def.Nodes[I];
		if (Node.Id.empty())
		{
			Errors.push_back(FError{"nodes[" + std::to_string(I) + "].id", "must not be empty"});
		}
		else if (!Ids.insert(Node.Id).second)
		{
			Errors.push_back(FError{"nodes[" + std::to_string(I) + "].id", "duplicate node '" + Node.Id + "'"});
		}
		Granted.insert(Node.GrantsClues.begin(), Node.GrantsClues.end());
		bHasEnding = bHasEnding || Node.bIsEnding;
	}
	for (std::size_t I = 0; I < Def.Nodes.size(); ++I)
	{
		const FSecretNode& Node = Def.Nodes[I];
		const std::string Path = "nodes[" + std::to_string(I) + "]";
		for (const std::string& Clue : Node.RequiresClues)
		{
			if (Granted.count(Clue) == 0)
			{
				Errors.push_back(FError{Path + ".requires_clues", "clue '" + Clue + "' is never granted"});
			}
		}
		for (const std::string& Other : Node.ExcludedBy)
		{
			if (Ids.count(Other) == 0)
			{
				Errors.push_back(FError{Path + ".excluded_by", "unknown node '" + Other + "'"});
			}
		}
	}
	if (!bHasEnding)
	{
		Errors.push_back(FError{"nodes", "no ending node"});
	}
	if (!Errors.empty())
	{
		return TResult<FSecretGraph>::Fail(std::move(Errors));
	}
	FSecretGraph Graph;
	Graph.Def = Def;
	return TResult<FSecretGraph>::Ok(std::move(Graph));
}

FSecretProgress FSecretGraph::MakeInitialProgress() const
{
	FSecretProgress Progress;
	Progress.KnownClues.insert(Def.InitialClues.begin(), Def.InitialClues.end());
	return Progress;
}

bool FSecretGraph::IsAvailable(const FSecretProgress& Progress, const std::string& NodeId) const
{
	for (const FSecretNode& Node : Def.Nodes)
	{
		if (Node.Id != NodeId)
		{
			continue;
		}
		if (Progress.CompletedNodes.count(Node.Id) != 0)
		{
			return false;
		}
		for (const std::string& Other : Node.ExcludedBy)
		{
			if (Progress.CompletedNodes.count(Other) != 0)
			{
				return false;
			}
		}
		return std::all_of(Node.RequiresClues.begin(), Node.RequiresClues.end(),
			[&Progress](const std::string& Clue) { return Progress.KnownClues.count(Clue) != 0; });
	}
	return false;
}

std::vector<std::string> FSecretGraph::GetAvailableNodes(const FSecretProgress& Progress) const
{
	std::vector<std::string> Out;
	if (IsFinished(Progress))
	{
		return Out;
	}
	for (const FSecretNode& Node : Def.Nodes)
	{
		if (IsAvailable(Progress, Node.Id))
		{
			Out.push_back(Node.Id);
		}
	}
	return Out;
}

FStatus FSecretGraph::Complete(FSecretProgress& Progress, const std::string& NodeId) const
{
	if (IsFinished(Progress) || !IsAvailable(Progress, NodeId))
	{
		return FStatus::Fail(FError{NodeId, "node is not available"});
	}
	for (const FSecretNode& Node : Def.Nodes)
	{
		if (Node.Id == NodeId)
		{
			Progress.CompletedNodes.insert(Node.Id);
			// Clues are knowledge: learned once, never consumed.
			Progress.KnownClues.insert(Node.GrantsClues.begin(), Node.GrantsClues.end());
			break;
		}
	}
	return OkStatus();
}

bool FSecretGraph::IsFinished(const FSecretProgress& Progress) const
{
	return std::any_of(Def.Nodes.begin(), Def.Nodes.end(),
		[&Progress](const FSecretNode& Node) { return Node.bIsEnding && Progress.CompletedNodes.count(Node.Id) != 0; });
}

FSoftlockReport FSecretGraph::CheckNoSoftlock(std::size_t MaxStates) const
{
	FSoftlockReport Report;
	const FCompiled C = Compile(Def, {});
	const FSearch S = Explore(C, 0, std::max<std::size_t>(MaxStates, 1));
	Report.StatesExplored = S.States.size();
	Report.bExhaustive = S.bExhaustive;
	if (!S.bExhaustive)
	{
		Report.Problems.push_back(FError{Def.Id, "state limit reached: softlock check inconclusive"});
	}
	for (std::size_t I = 0; I < S.States.size(); ++I)
	{
		if (S.CanFinish[I])
		{
			continue;
		}
		for (std::size_t Node = 0; Node < C.NodeCount; ++Node)
		{
			if ((S.States[I] >> Node) & 1u)
			{
				Report.CounterexampleCompleted.push_back(Def.Nodes[Node].Id);
			}
		}
		std::string Path;
		for (const std::string& Id : Report.CounterexampleCompleted)
		{
			Path += (Path.empty() ? "" : ", ") + Id;
		}
		Report.Problems.push_back(FError{Def.Id, "softlock: no ending reachable after completing {" + Path + "}"});
		break; // BFS order => shortest counterexample
	}
	Report.bOk = Report.Problems.empty();
	return Report;
}

std::optional<std::string> FSecretGraph::GetHint(const FSecretProgress& Progress, int Tier, bool bHintsEnabled) const
{
	if (!bHintsEnabled || IsFinished(Progress))
	{
		return std::nullopt;
	}
	const std::vector<std::string> Available = GetAvailableNodes(Progress);
	if (Available.empty())
	{
		return std::nullopt;
	}
	const FCompiled C = Compile(Def, Progress.KnownClues);
	const std::uint64_t Mask = ToMask(C, Progress);
	std::string Chosen = Available.front();
	for (const std::string& Id : Available)
	{
		const auto It = C.NodeIndex.find(Id);
		if (It == C.NodeIndex.end())
		{
			continue;
		}
		const std::uint64_t Next = Mask | (std::uint64_t{1} << It->second);
		const FSearch S = Explore(C, Next, std::size_t{1} << 16);
		if (S.CanFinish[0])
		{
			Chosen = Id;
			break;
		}
	}
	const std::size_t Slot = static_cast<std::size_t>(std::clamp(Tier, 1, 3) - 1);
	for (const FSecretNode& Node : Def.Nodes)
	{
		if (Node.Id == Chosen && !Node.HintKeys[Slot].empty())
		{
			return Node.HintKeys[Slot];
		}
	}
	return std::nullopt;
}
} // namespace ArpgCore
