// SecretGraphTests.cpp - Secret chain availability, non-consumed clues, softlock check, hints.
#if defined(ARPGCORE_STANDALONE_TESTS)
#include "TestCommon.h"

#include "ArpgCore/SecretGraph.h"

#include <string>
#include <vector>

using namespace ArpgCore;

namespace
{
FSecretNode Node(std::string Id, std::vector<std::string> Requires, std::vector<std::string> Grants, bool bEnding = false,
	std::vector<std::string> ExcludedBy = {})
{
	FSecretNode N;
	N.Id = Id;
	N.RequiresClues = std::move(Requires);
	N.GrantsClues = std::move(Grants);
	N.bIsEnding = bEnding;
	N.ExcludedBy = std::move(ExcludedBy);
	N.HintKeys = {"hint." + Id + ".1", "hint." + Id + ".2", "hint." + Id + ".3"};
	return N;
}

/** start -> {B, C} (any order) -> end needs both clues. */
FSecretGraphDef Diamond()
{
	FSecretGraphDef D;
	D.Id = "diamond";
	D.Nodes = {Node("start", {}, {"a"}), Node("b", {"a"}, {"cb"}), Node("c", {"a"}, {"cc"}),
		Node("end", {"cb", "cc"}, {}, true)};
	return D;
}

/** Exclusive choice: taking "right" closes "left", which is the only source of "key". */
FSecretGraphDef Trap()
{
	FSecretGraphDef D;
	D.Id = "trap";
	D.Nodes = {Node("start", {}, {"a"}), Node("right", {"a"}, {}, false, {"left"}),
		Node("left", {"a"}, {"key"}, false, {"right"}), Node("end", {"key"}, {}, true)};
	return D;
}
} // namespace

TEST_SUITE("SecretGraph")
{
	TEST_CASE("structural validation")
	{
		CHECK(FSecretGraph::Create(Diamond()).IsOk());

		FSecretGraphDef Bad = Diamond();
		Bad.Nodes.back().bIsEnding = false;
		Bad.Nodes.push_back(Node("start", {"ghost"}, {}));
		Bad.Nodes.push_back(Node("", {}, {}, false, {"nobody"}));
		const TResult<FSecretGraph> R = FSecretGraph::Create(Bad);
		REQUIRE_FALSE(R.IsOk());
		const std::string S = R.ErrorSummary();
		CHECK(S.find("no ending node") != std::string::npos);
		CHECK(S.find("duplicate node 'start'") != std::string::npos);
		CHECK(S.find("clue 'ghost' is never granted") != std::string::npos);
		CHECK(S.find("unknown node 'nobody'") != std::string::npos);
		CHECK(S.find("nodes[5].id: must not be empty") != std::string::npos);

		FSecretGraphDef Big;
		for (int I = 0; I < 65; ++I)
		{
			Big.Nodes.push_back(Node("n" + std::to_string(I), {}, {}, I == 0));
		}
		CHECK(FSecretGraph::Create(Big).ErrorSummary().find("at most 64") != std::string::npos);
	}

	TEST_CASE("progression; clues are never consumed")
	{
		const FSecretGraph G = FSecretGraph::Create(Diamond()).GetValue();
		FSecretProgress P = G.MakeInitialProgress();
		CHECK(G.GetAvailableNodes(P) == std::vector<std::string>{"start"});
		CHECK_FALSE(G.Complete(P, "b").IsOk());
		CHECK_FALSE(G.Complete(P, "unknown").IsOk());
		REQUIRE(G.Complete(P, "start").IsOk());
		CHECK_FALSE(G.Complete(P, "start").IsOk()); // already done
		CHECK(G.GetAvailableNodes(P) == std::vector<std::string>{"b", "c"});
		REQUIRE(G.Complete(P, "c").IsOk());
		REQUIRE(G.Complete(P, "b").IsOk());
		CHECK(P.KnownClues.count("a") == 1); // still known after use by b and c
		REQUIRE(G.Complete(P, "end").IsOk());
		CHECK(G.IsFinished(P));
		CHECK(P.KnownClues.count("a") == 1);
		CHECK(P.KnownClues.count("cb") == 1);
		CHECK(G.GetAvailableNodes(P).empty());
		CHECK(G.GetDef().Id == "diamond");
	}

	TEST_CASE("no-softlock check passes for a safe graph")
	{
		const FSoftlockReport R = FSecretGraph::Create(Diamond()).GetValue().CheckNoSoftlock();
		CHECK(R.bOk);
		CHECK(R.bExhaustive);
		CHECK(R.StatesExplored == 6); // {}, {s}, {s,b}, {s,c}, {s,b,c}, {s,b,c,end}
		CHECK(R.Problems.empty());
	}

	TEST_CASE("no-softlock check finds the shortest dead end")
	{
		const FSoftlockReport R = FSecretGraph::Create(Trap()).GetValue().CheckNoSoftlock();
		CHECK_FALSE(R.bOk);
		CHECK(R.bExhaustive);
		CHECK(R.CounterexampleCompleted == std::vector<std::string>{"start", "right"});
		REQUIRE(R.Problems.size() == 1);
		CHECK(R.Problems[0].Message.find("softlock") != std::string::npos);

		FSecretGraphDef Fixed = Trap();
		Fixed.Nodes[1].GrantsClues = {"key"}; // both choices lead on
		CHECK(FSecretGraph::Create(Fixed).GetValue().CheckNoSoftlock().bOk);
	}

	TEST_CASE("state limit makes the check inconclusive")
	{
		const FSoftlockReport R = FSecretGraph::Create(Diamond()).GetValue().CheckNoSoftlock(2);
		CHECK_FALSE(R.bOk);
		CHECK_FALSE(R.bExhaustive);
	}

	TEST_CASE("three-tier hints steer away from dead ends")
	{
		const FSecretGraph G = FSecretGraph::Create(Trap()).GetValue();
		FSecretProgress P = G.MakeInitialProgress();
		CHECK(G.GetHint(P, 1) == std::optional<std::string>("hint.start.1"));
		CHECK(G.GetHint(P, 0) == std::optional<std::string>("hint.start.1"));
		CHECK(G.GetHint(P, 9) == std::optional<std::string>("hint.start.3"));
		CHECK_FALSE(G.GetHint(P, 2, false).has_value());
		REQUIRE(G.Complete(P, "start").IsOk());
		// "right" is listed first but dead-ends, so the hint points at "left".
		CHECK(G.GetHint(P, 2) == std::optional<std::string>("hint.left.2"));
		REQUIRE(G.Complete(P, "right").IsOk());
		CHECK_FALSE(G.GetHint(P, 1).has_value()); // nothing available (the softlock the checker reports)
	}

	TEST_CASE("hints: finished chain, empty keys, fallback")
	{
		FSecretGraphDef D = Diamond();
		D.Nodes[0].HintKeys[1].clear();
		const FSecretGraph G = FSecretGraph::Create(D).GetValue();
		FSecretProgress P = G.MakeInitialProgress();
		CHECK_FALSE(G.GetHint(P, 2).has_value());
		for (const char* Id : {"start", "b", "c", "end"})
		{
			REQUIRE(G.Complete(P, Id).IsOk());
		}
		CHECK_FALSE(G.GetHint(P, 1).has_value());
		CHECK_FALSE(G.Complete(P, "b").IsOk());

		// Only dead-end choices left: falls back to the first available node.
		FSecretGraphDef Dead = Trap();
		Dead.Nodes[2].ExcludedBy.push_back("start"); // left is closed as soon as start is done
		const FSecretGraph DG = FSecretGraph::Create(Dead).GetValue();
		FSecretProgress DP = DG.MakeInitialProgress();
		REQUIRE(DG.Complete(DP, "start").IsOk());
		CHECK(DG.GetHint(DP, 1) == std::optional<std::string>("hint.right.1"));
	}

	TEST_CASE("initial clues and external clues")
	{
		FSecretGraphDef D;
		D.Id = "init";
		D.InitialClues = {"rumor"};
		D.Nodes = {Node("go", {"rumor"}, {}, true)};
		const FSecretGraph G = FSecretGraph::Create(D).GetValue();
		const FSecretProgress P = G.MakeInitialProgress();
		CHECK(G.IsAvailable(P, "go"));
		CHECK_FALSE(G.IsAvailable(P, "missing"));
		CHECK(G.CheckNoSoftlock().bOk);
		CHECK(G.GetHint(P, 3) == std::optional<std::string>("hint.go.3"));
	}
}
#endif
