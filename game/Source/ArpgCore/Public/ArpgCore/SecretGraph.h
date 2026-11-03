// SecretGraph.h - Secret chain as data: nodes require clues, grant clues (clues are never consumed),
// may be excluded by other nodes (mutually exclusive choices). Includes an exhaustive
// no-softlock check (from every reachable state an ending stays reachable) and 3-tier hints.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/Result.h"

#include <array>
#include <cstddef>
#include <optional>
#include <set>
#include <string>
#include <vector>

namespace ArpgCore
{
struct FSecretNode
{
	std::string Id;
	std::vector<std::string> RequiresClues;    // all must be known
	std::vector<std::string> RequiresAnyClues; // if non-empty, at least one must be known
	std::vector<std::string> ExcludedBy;    // node ids; if any is completed this node is closed
	std::vector<std::string> GrantsClues;
	bool bIsStart = false; // completed in the initial state
	bool bIsEnding = false;
	/** Localization keys: [0] vague, [1] direction, [2] exact location. */
	std::array<std::string, 3> HintKeys;
};

struct FSecretGraphDef
{
	std::string Id;
	std::vector<std::string> InitialClues;
	std::vector<FSecretNode> Nodes;
};

/** Runtime progress of one secret chain. */
struct FSecretProgress
{
	std::set<std::string> CompletedNodes;
	std::set<std::string> KnownClues;
};

struct FSoftlockReport
{
	bool bOk = false;
	bool bExhaustive = false;     // false if MaxStates was hit (result inconclusive)
	std::size_t StatesExplored = 0;
	std::vector<FError> Problems; // structural problems + softlock counterexample
	std::vector<std::string> CounterexampleCompleted; // completed node ids of a dead-end state
};

class ARPGCORE_API FSecretGraph
{
public:
	/** Validates structure (ids, references, at least one ending). */
	static TResult<FSecretGraph> Create(const FSecretGraphDef& Def);

	FSecretProgress MakeInitialProgress() const;
	bool IsAvailable(const FSecretProgress& Progress, const std::string& NodeId) const;
	std::vector<std::string> GetAvailableNodes(const FSecretProgress& Progress) const;
	/** Completes a node and learns its clues. Fails if the node is not available. */
	FStatus Complete(FSecretProgress& Progress, const std::string& NodeId) const;
	bool IsFinished(const FSecretProgress& Progress) const;

	/** Exhaustive search over completed-node sets (graph limited to 64 nodes). */
	FSoftlockReport CheckNoSoftlock(std::size_t MaxStates = 1u << 20) const;

	/** Hint key for the best next node (one that keeps an ending reachable). Tier 1..3 (clamped).
	 *  Returns nullopt when hints are disabled, the chain is finished, or nothing is available. */
	std::optional<std::string> GetHint(const FSecretProgress& Progress, int Tier, bool bHintsEnabled = true) const;

	const FSecretGraphDef& GetDef() const { return Def; }

private:
	FSecretGraphDef Def;
};
} // namespace ArpgCore
