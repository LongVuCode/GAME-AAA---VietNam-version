// CombatTimingTests.cpp - ActionTimeline, InputBuffer, ComboGraph / ComboRunner.
#if defined(ARPGCORE_STANDALONE_TESTS)
#include "TestCommon.h"

#include "ArpgCore/ActionTimeline.h"
#include "ArpgCore/ComboGraph.h"
#include "ArpgCore/InputBuffer.h"

#include <string>
#include <vector>

using namespace ArpgCore;
using ArpgCoreTest::Dt;

namespace
{
FActionTiming MakeTiming(float Startup, float Active, float Recovery)
{
	FActionTiming T;
	T.Startup = Startup;
	T.Active = Active;
	T.Recovery = Recovery;
	return T;
}

FComboGraph MakeGraph()
{
	FComboGraph G;
	const FActionTiming Fast = MakeTiming(0.125f, 0.0625f, 0.25f);
	for (const char* Id : {"L1", "L2", "L3", "LD2", "LH2"})
	{
		G.AddMove(FComboMove{Id, Fast, FAttackData{}});
	}
	G.AddMove(FComboMove{"H1", MakeTiming(0.5f, 0.125f, 0.25f), FAttackData{}});
	REQUIRE(G.AddTransition("", EInputType::Light, 0.0f, -1.0f, "L1"));
	REQUIRE(G.AddTransition("", EInputType::Heavy, 0.0f, -1.0f, "H1"));
	REQUIRE(G.AddTransition("L1", EInputType::Light, 0.0f, 0.3f, "L2"));
	REQUIRE(G.AddTransition("L1", EInputType::Light, 0.45f, -1.0f, "LD2"));
	REQUIRE(G.AddTransition("L1", EInputType::Heavy, 0.0f, -1.0f, "LH2"));
	REQUIRE(G.AddTransition("L2", EInputType::Light, 0.0f, -1.0f, "L3"));
	return G;
}

/** Runs the runner, pressing inputs at given times; returns ids of started moves. */
std::vector<std::string> Run(FComboRunner& Runner, const FComboGraph& Graph,
	std::vector<std::pair<float, EInputType>> Presses, float Duration)
{
	std::vector<std::string> Started;
	std::size_t Next = 0;
	ArpgCoreTest::Simulate(Duration, [&](float Step) {
		while (Next < Presses.size() && Presses[Next].first <= Runner.GetTime())
		{
			Runner.PressInput(Presses[Next].second);
			++Next;
		}
		const FComboTickResult R = Runner.Tick(Step);
		if (R.StartedMove != FComboGraph::RootNode)
		{
			Started.push_back(Graph.GetMove(R.StartedMove).Id);
		}
	});
	return Started;
}
} // namespace

TEST_SUITE("ActionTimeline")
{
	TEST_CASE("phases and edge events in order")
	{
		FActionTimeline T;
		CHECK(T.GetPhase() == EActionPhase::Idle);
		T.Start(MakeTiming(0.125f, 0.0625f, 0.25f));
		CHECK(T.GetPhase() == EActionPhase::Startup);

		FTimelineEvents E = T.Tick(0.0625f);
		CHECK_FALSE(E.bEnteredActive);
		E = T.Tick(0.0625f);
		CHECK(E.bEnteredActive);
		CHECK(T.GetPhase() == EActionPhase::Active);
		CHECK_FALSE(T.IsInCancelWindow());

		E = T.Tick(0.0625f);
		CHECK(E.bLeftActive);
		CHECK(E.bEnteredCancelWindow);
		CHECK(T.GetPhase() == EActionPhase::Recovery);
		CHECK(T.IsInCancelWindow());

		E = T.Tick(0.25f);
		CHECK(E.bFinished);
		CHECK_FALSE(T.IsRunning());
		CHECK(T.GetPhase() == EActionPhase::Idle);
		CHECK_FALSE(T.Tick(1.0f).bFinished); // idle: no events
	}

	TEST_CASE("large step reports every crossed edge")
	{
		FActionTimeline T;
		T.Start(MakeTiming(0.1f, 0.05f, 0.2f));
		const FTimelineEvents E = T.Tick(5.0f);
		CHECK(E.bEnteredActive);
		CHECK(E.bLeftActive);
		CHECK(E.bEnteredCancelWindow);
		CHECK(E.bFinished);
	}

	TEST_CASE("custom cancel window and clamping")
	{
		FActionTiming Timing = MakeTiming(0.125f, 0.0625f, 0.25f);
		Timing.CancelStart = 0.25f;
		Timing.CancelEnd = 0.3125f;
		FActionTimeline T;
		T.Start(Timing);
		T.Tick(0.1875f);
		CHECK_FALSE(T.IsInCancelWindow());
		T.Tick(0.0625f);
		CHECK(T.IsInCancelWindow());
		T.Tick(0.0625f);
		CHECK_FALSE(T.IsInCancelWindow());

		Timing.CancelStart = 10.0f; // beyond the action: no window
		Timing.CancelEnd = -1.0f;
		CHECK(Timing.GetResolvedCancelStart() == doctest::Approx(Timing.GetTotal()));
		T.Start(Timing);
		CHECK_FALSE(T.Tick(1.0f).bEnteredCancelWindow);
	}

	TEST_CASE("negative values are sanitized; zero startup enters active on first tick")
	{
		FActionTiming Timing = MakeTiming(-1.0f, 0.0625f, 0.0625f);
		CHECK(Timing.GetTotal() == doctest::Approx(0.125f));
		FActionTimeline T;
		T.Start(Timing);
		CHECK(T.GetPhase() == EActionPhase::Active);
		CHECK(T.Tick(0.0f).bEnteredActive);
		CHECK_FALSE(T.Tick(-5.0f).bFinished); // negative dt ignored
		CHECK(T.GetElapsed() == doctest::Approx(0.0f));
		T.Cancel();
		CHECK(T.GetPhase() == EActionPhase::Idle);
	}
}

TEST_SUITE("InputBuffer")
{
	TEST_CASE("expiry, capacity and ordering")
	{
		FInputBuffer B(0.2f, 2);
		B.Push(EInputType::Light, 0.0f);
		B.Push(EInputType::Heavy, 0.125f);
		REQUIRE(B.Peek(0.15f).has_value());
		CHECK(B.Peek(0.15f)->Type == EInputType::Light);
		const auto C = B.Consume(0.25f); // Light expired (age 0.25 > 0.2)
		REQUIRE(C.has_value());
		CHECK(C->Type == EInputType::Heavy);
		CHECK(B.Num() == 0);
		CHECK_FALSE(B.Consume(0.3f).has_value());

		B.Push(EInputType::Light, 1.0f);
		B.Push(EInputType::Heavy, 1.0f);
		B.Push(EInputType::Dodge, 1.0f); // capacity 2: oldest dropped
		CHECK(B.Num() == 2);
		CHECK(B.Peek(1.0f)->Type == EInputType::Heavy);
		B.Clear();
		CHECK(B.Num() == 0);
		CHECK(B.GetWindow() == doctest::Approx(0.2f));
	}

	TEST_CASE("zero capacity is treated as one")
	{
		FInputBuffer B(0.1f, 0);
		B.Push(EInputType::Light, 0.0f);
		B.Push(EInputType::Heavy, 0.0f);
		CHECK(B.Num() == 1);
	}
}

TEST_SUITE("ComboGraph")
{
	TEST_CASE("graph construction errors")
	{
		FComboGraph G = MakeGraph();
		CHECK(G.AddMove(FComboMove{"L1", {}, {}}) == FComboGraph::RootNode); // duplicate
		CHECK(G.AddMove(FComboMove{"", {}, {}}) == FComboGraph::RootNode);
		CHECK_FALSE(G.AddTransition("nope", EInputType::Light, 0.0f, -1.0f, "L1"));
		CHECK_FALSE(G.AddTransition("L1", EInputType::Light, 0.0f, -1.0f, "nope"));
		CHECK_FALSE(G.AddTransition("L1", EInputType::Dodge, 0.0f, -1.0f, "L2"));
		CHECK_FALSE(G.AddTransition("L1", EInputType::Light, 0.5f, 0.2f, "L2"));
		CHECK(G.Validate().empty());
		CHECK(G.NumMoves() == 6);
		CHECK(G.GetTransitions().size() == 6);
	}

	TEST_CASE("validation finds ambiguous branches and unreachable moves")
	{
		FComboGraph G = MakeGraph();
		G.AddMove(FComboMove{"Orphan", {}, {}});
		REQUIRE(G.AddTransition("L1", EInputType::Light, 0.25f, 0.5f, "L3")); // overlaps both L1 light branches
		REQUIRE(G.AddTransition("", EInputType::Light, 0.0f, -1.0f, "L2"));   // second root light
		const std::vector<FError> Errors = G.Validate();
		int Ambiguous = 0;
		bool bOrphan = false;
		for (const FError& E : Errors)
		{
			Ambiguous += E.Message.find("ambiguous") != std::string::npos ? 1 : 0;
			bOrphan = bOrphan || E.Message.find("Orphan") != std::string::npos;
		}
		CHECK(Ambiguous == 3);
		CHECK(bOrphan);
	}

	TEST_CASE("FindNext branches on input and delay")
	{
		const FComboGraph G = MakeGraph();
		const int L1 = G.FindMove("L1");
		CHECK(G.FindNext(FComboGraph::RootNode, EInputType::Light, 99.0f) == L1);
		CHECK(G.FindNext(L1, EInputType::Light, 0.1f) == G.FindMove("L2"));
		CHECK(G.FindNext(L1, EInputType::Light, 0.6f) == G.FindMove("LD2"));
		CHECK_FALSE(G.FindNext(L1, EInputType::Light, 0.4f).has_value()); // gap between branches
		CHECK(G.FindNext(L1, EInputType::Heavy, 0.4f) == G.FindMove("LH2"));
	}

	TEST_CASE("runner: fast presses chain L1 -> L2 -> L3 then restart at L1")
	{
		const FComboGraph G = MakeGraph();
		FComboRunner R(G, FComboRunnerConfig{0.25f, 1, 0.5f});
		const auto Started = Run(R, G,
			{{0.0f, EInputType::Light}, {0.1f, EInputType::Light}, {0.4f, EInputType::Light}, {0.75f, EInputType::Light}}, 2.0f);
		CHECK(Started == std::vector<std::string>{"L1", "L2", "L3", "L1"});
	}

	TEST_CASE("runner: delayed second press takes the delayed branch")
	{
		const FComboGraph G = MakeGraph();
		FComboRunner R(G, FComboRunnerConfig{0.25f, 1, 0.5f});
		const auto Started = Run(R, G, {{0.0f, EInputType::Light}, {0.5f, EInputType::Light}}, 1.5f);
		CHECK(Started == std::vector<std::string>{"L1", "LD2"});
	}

	TEST_CASE("runner: light then heavy branches to the heavy finisher")
	{
		const FComboGraph G = MakeGraph();
		FComboRunner R(G, FComboRunnerConfig{0.25f, 1, 0.5f});
		const auto Started = Run(R, G, {{0.0f, EInputType::Light}, {0.1f, EInputType::Heavy}}, 1.0f);
		CHECK(Started == std::vector<std::string>{"L1", "LH2"});
	}

	TEST_CASE("runner: buffered press waits for the cancel window")
	{
		const FComboGraph G = MakeGraph();
		FComboRunner R(G, FComboRunnerConfig{0.25f, 1, 0.5f});
		R.PressInput(EInputType::Light);
		CHECK(R.Tick(Dt).StartedMove == G.FindMove("L1"));
		R.PressInput(EInputType::Light); // during startup: buffered
		int StartedAtTick = -1;
		for (int I = 1; I < 40 && StartedAtTick < 0; ++I)
		{
			if (R.Tick(Dt).StartedMove == G.FindMove("L2"))
			{
				StartedAtTick = I;
				CHECK(R.GetTimeline().GetPhase() == EActionPhase::Startup);
			}
		}
		// L1 cancel window opens at 0.1875 s = 12 ticks after L1 started.
		CHECK(StartedAtTick == 12);
	}

	TEST_CASE("runner: press older than the buffer window is dropped")
	{
		const FComboGraph G = MakeGraph();
		FComboRunner R(G, FComboRunnerConfig{0.25f, 1, 0.5f});
		// H1 cancel window opens at 0.625 s; a press at 0.05 s expires at 0.30 s.
		const auto Started = Run(R, G, {{0.0f, EInputType::Heavy}, {0.05f, EInputType::Light}}, 2.0f);
		CHECK(Started == std::vector<std::string>{"H1"});
	}

	TEST_CASE("runner: hit window and finish events, then combo reset after link window")
	{
		const FComboGraph G = MakeGraph();
		FComboRunner R(G, FComboRunnerConfig{0.25f, 1, 0.5f});
		R.PressInput(EInputType::Light);
		bool bOpened = false;
		bool bClosed = false;
		bool bFinished = false;
		bool bReset = false;
		ArpgCoreTest::Simulate(1.5f, [&](float Step) {
			const FComboTickResult T = R.Tick(Step);
			bOpened = bOpened || T.bHitWindowOpened;
			bClosed = bClosed || T.bHitWindowClosed;
			bFinished = bFinished || T.bMoveFinished;
			bReset = bReset || T.bComboReset;
		});
		CHECK(bOpened);
		CHECK(bClosed);
		CHECK(bFinished);
		CHECK(bReset);
		CHECK(R.GetCurrentMove() == FComboGraph::RootNode);
		CHECK_FALSE(R.IsActing());
	}

	TEST_CASE("runner: defense cancel only when idle or in the cancel window")
	{
		const FComboGraph G = MakeGraph();
		FComboRunner R(G, FComboRunnerConfig{0.25f, 1, 0.5f});
		CHECK_FALSE(R.PressInput(EInputType::Dodge));
		CHECK(R.TryCancelForDefense()); // idle
		R.PressInput(EInputType::Light);
		R.Tick(Dt);
		CHECK(R.IsActing());
		CHECK_FALSE(R.TryCancelForDefense()); // startup
		ArpgCoreTest::Simulate(0.1875f, [&](float Step) { R.Tick(Step); });
		CHECK(R.GetTimeline().IsInCancelWindow());
		CHECK(R.TryCancelForDefense());
		CHECK_FALSE(R.IsActing());
		CHECK(R.GetCurrentMove() == FComboGraph::RootNode);
	}

	TEST_CASE("runner: input with no transition is dropped")
	{
		FComboGraph G;
		G.AddMove(FComboMove{"OnlyLight", MakeTiming(0.1f, 0.1f, 0.1f), {}});
		REQUIRE(G.AddTransition("", EInputType::Light, 0.0f, -1.0f, "OnlyLight"));
		FComboRunner R(G, FComboRunnerConfig{});
		R.PressInput(EInputType::Heavy);
		CHECK(R.Tick(Dt).StartedMove == FComboGraph::RootNode);
		CHECK_FALSE(R.IsActing());
	}
}
#endif
