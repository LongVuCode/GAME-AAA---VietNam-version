// ShackleTests.cpp - Khoen state machine, boss encounter glue, no-softlock simulation (VERDICT V9).
#if defined(ARPGCORE_STANDALONE_TESTS)
#include "TestCommon.h"

#include "ArpgCore/BossEncounter.h"
#include "ArpgCore/Rng.h"
#include "ArpgCore/Shackle.h"

#include <cmath>

using namespace ArpgCore;
using ArpgCoreTest::Dt;
using doctest::Approx;

namespace
{
FShackleConfig MakeShackle()
{
	FShackleConfig C;
	C.CracksToOpen = 3;
	C.PryBeats = 3;
	C.LeadIn = 0.5f;
	C.BeatInterval = 0.5f;
	C.BeatHalfWindow = 0.125f;
	C.MissPostureRecoverFraction = 0.4f;
	return C;
}

/** Ticks the shackle until PryElapsed reaches Time (exact with Dt steps). */
EPryResult TickTo(FShackle& S, float Time)
{
	EPryResult Last = EPryResult::None;
	while (S.GetState() == EShackleState::Prying && S.GetPryElapsed() + Dt <= Time + 1e-6f)
	{
		Last = S.Tick(Dt);
		if (Last != EPryResult::None)
		{
			break;
		}
	}
	return Last;
}

FBossConfig MakeBoss(bool bShackleEnabled)
{
	FBossConfig B;
	B.Id = "test_boar";
	B.MaxHealth = 500.0f;
	B.HealthFloor = 1.0f;
	B.bHealthFloorForcesFinalStagger = false;
	B.Posture.MaxPosture = 100.0f;
	B.Posture.RegenPerSecond = 0.0f;
	B.Posture.RegenDelay = 10.0f;
	B.Posture.StaggerDuration = 2.0f;
	B.Posture.StaggerDamageMultiplier = 2.0f;
	B.Shackle = MakeShackle();
	B.Shackle.CracksToOpen = 2;
	B.Shackle.bEnabled = bShackleEnabled;
	B.FreedDrops = {FMaterialAmount{"boar_hide", 1}};
	return B;
}

FAttackData Hit(float Damage, float Posture)
{
	FAttackData A;
	A.BaseDamage = Damage;
	A.BasePostureDamage = Posture;
	return A;
}

/** Performs a pry on the encounter, pressing every beat on time. */
EPryResult PryPerfectly(FBossEncounter& Boss)
{
	REQUIRE(Boss.BeginPry());
	EPryResult Result = EPryResult::None;
	for (int Beat = 0; Beat < Boss.GetShackle().GetConfig().PryBeats; ++Beat)
	{
		const float Target = Boss.GetShackle().GetBeatTime(Beat);
		while (Boss.GetShackle().GetPryElapsed() + Dt <= Target + 1e-6f)
		{
			REQUIRE(Boss.Tick(Dt) == EPryResult::None);
		}
		Result = Boss.InputPryBeat();
	}
	return Result;
}
} // namespace

TEST_SUITE("Shackle")
{
	TEST_CASE("cracks accumulate per posture break and cap")
	{
		FShackle S(MakeShackle());
		CHECK(S.GetState() == EShackleState::Intact);
		S.OnPostureBroken();
		S.OnPostureBroken();
		CHECK(S.GetState() == EShackleState::Cracking);
		CHECK(S.GetCracks() == 2);
		CHECK_FALSE(S.CanBeginPry(true));
		S.OnPostureBroken();
		CHECK(S.GetState() == EShackleState::Ready);
		CHECK_FALSE(S.CanBeginPry(false)); // needs stagger
		CHECK(S.CanBeginPry(true));
		S.OnPostureBroken();
		CHECK(S.GetCracks() == 3);
		CHECK(S.Tick(1.0f) == EPryResult::None);   // not prying
		CHECK(S.InputBeat() == EPryResult::None);  // not prying
	}

	TEST_CASE("three beats on time free the creature")
	{
		FShackleConfig C = MakeShackle();
		C.CracksToOpen = 1;
		FShackle S(C);
		S.OnPostureBroken();
		CHECK_FALSE(S.BeginPry(false));
		REQUIRE(S.BeginPry(true));
		CHECK(S.GetState() == EShackleState::Prying);
		CHECK(S.GetBeatTime(0) == Approx(0.5f));
		CHECK(S.GetBeatTime(2) == Approx(1.5f));
		CHECK(TickTo(S, 0.5f) == EPryResult::None);
		CHECK(S.InputBeat() == EPryResult::BeatHit);
		CHECK(TickTo(S, 1.0f) == EPryResult::None);
		CHECK(S.InputBeat() == EPryResult::BeatHit);
		CHECK(S.GetBeatsHit() == 2);
		CHECK(TickTo(S, 1.5f) == EPryResult::None);
		CHECK(S.InputBeat() == EPryResult::Freed);
		CHECK(S.GetState() == EShackleState::Freed);
		S.OnPostureBroken();
		CHECK(S.GetCracks() == 1);
		CHECK(S.InputBeat() == EPryResult::None);
	}

	TEST_CASE("early press, double press and timeout are misses; cracks are kept")
	{
		FShackleConfig C = MakeShackle();
		C.CracksToOpen = 1;
		FShackle S(C);
		S.OnPostureBroken();

		REQUIRE(S.BeginPry(true));
		TickTo(S, 0.25f);
		CHECK(S.InputBeat() == EPryResult::Failed); // early
		CHECK(S.GetState() == EShackleState::Ready);
		CHECK(S.GetBeatsHit() == 0);
		CHECK(S.GetCracks() == 1);

		REQUIRE(S.BeginPry(true));
		TickTo(S, 0.5f);
		CHECK(S.InputBeat() == EPryResult::BeatHit);
		CHECK(S.InputBeat() == EPryResult::Failed); // mashing: next beat is 0.5 s away

		REQUIRE(S.BeginPry(true));
		CHECK(TickTo(S, 0.6875f) == EPryResult::Failed); // window closed at 0.625
		CHECK(S.GetState() == EShackleState::Ready);
	}

	TEST_CASE("difficulty widens the beat window, clamped to half the interval")
	{
		const FShackle Wide(MakeShackle(), 1.5f);
		CHECK(Wide.GetHalfWindow() == Approx(0.1875f));
		const FShackle Huge(MakeShackle(), 10.0f);
		CHECK(Huge.GetHalfWindow() == Approx(0.25f));

		FShackleConfig C = MakeShackle();
		C.CracksToOpen = 1;
		FShackle S(C, 1.5f);
		S.OnPostureBroken();
		REQUIRE(S.BeginPry(true));
		TickTo(S, 0.34375f); // 0.15625 early: inside the widened window
		CHECK(S.InputBeat() == EPryResult::BeatHit);
	}

	TEST_CASE("disabled shackle and zero-crack config")
	{
		FShackleConfig C = MakeShackle();
		C.bEnabled = false;
		FShackle Off(C);
		Off.OnPostureBroken();
		CHECK(Off.GetState() == EShackleState::Disabled);
		CHECK(Off.GetCracks() == 0);
		CHECK_FALSE(Off.CanBeginPry(true));

		C = MakeShackle();
		C.CracksToOpen = 0;
		const FShackle Open(C);
		CHECK(Open.GetState() == EShackleState::Ready);
	}
}

TEST_SUITE("BossEncounter")
{
	TEST_CASE("full fight: crack, crack, pry, freed; shackled boss cannot die")
	{
		FBossEncounter Boss(MakeBoss(true), FDifficultyConfig{});
		const FWeaponConfig Weapon;
		FBossHitResult R = Boss.ReceivePlayerHit(Hit(100, 50), Weapon);
		CHECK(R.Applied.Health == Approx(100.0f));
		CHECK_FALSE(R.bPostureBroken);
		R = Boss.ReceivePlayerHit(Hit(100, 50), Weapon);
		CHECK(R.bPostureBroken);
		CHECK(R.bShackleCracked);
		CHECK(Boss.GetShackle().GetState() == EShackleState::Cracking);
		CHECK_FALSE(Boss.CanBeginPry());
		Boss.Tick(2.0f); // stagger ends
		CHECK_FALSE(Boss.GetPosture().IsStaggered());

		Boss.ReceivePlayerHit(Hit(100, 50), Weapon);
		R = Boss.ReceivePlayerHit(Hit(100, 50), Weapon);
		CHECK(R.bPostureBroken);
		CHECK(Boss.GetShackle().GetState() == EShackleState::Ready);
		CHECK(Boss.GetHealth() == Approx(100.0f));
		R = Boss.ReceivePlayerHit(Hit(100, 0), Weapon); // staggered: x2 => would kill
		CHECK(Boss.GetHealth() == Approx(1.0f));
		CHECK(R.Applied.Health == Approx(99.0f));
		CHECK(Boss.GetOutcome() == EBossOutcome::InProgress);
		CHECK(Boss.GetOutcomeDrops().empty());

		REQUIRE(Boss.CanBeginPry());
		const float StaggerBefore = Boss.GetPosture().GetStaggerRemaining();
		CHECK(PryPerfectly(Boss) == EPryResult::Freed);
		CHECK(Boss.GetPosture().GetStaggerRemaining() == Approx(0.0f));
		CHECK(StaggerBefore > 0.0f);
		CHECK(Boss.GetOutcome() == EBossOutcome::Freed);
		REQUIRE(Boss.GetOutcomeDrops().size() == 1);
		CHECK(Boss.GetOutcomeDrops()[0].MaterialId == "boar_hide");
		CHECK(Boss.Tick(1.0f) == EPryResult::None);
		CHECK_FALSE(Boss.ReceivePlayerHit(Hit(100, 50), Weapon).bPostureBroken);
		CHECK_FALSE(Boss.BeginPry());
	}

	TEST_CASE("stagger is paused during the pry; a miss restores part of the posture")
	{
		FBossEncounter Boss(MakeBoss(true), FDifficultyConfig{});
		Boss.ReceivePostureDamage(100.0f);
		Boss.Tick(2.0f);
		CHECK(Boss.ReceivePostureDamage(100.0f).bPostureBroken);
		Boss.Tick(0.5f);
		REQUIRE(Boss.BeginPry());
		CHECK(Boss.GetPosture().GetStaggerRemaining() == Approx(1.5f));
		CHECK(Boss.ReceivePlayerHit(Hit(100, 100), FWeaponConfig{}).Applied.Health == Approx(0.0f)); // ignored while prying
		CHECK(Boss.ReceivePostureDamage(10.0f).Applied.Posture == Approx(0.0f));
		Boss.Tick(0.25f);
		CHECK(Boss.GetPosture().GetStaggerRemaining() == Approx(1.5f));

		CHECK(Boss.InputPryBeat() == EPryResult::Failed); // early
		CHECK_FALSE(Boss.GetPosture().IsStaggered());
		CHECK(Boss.GetPosture().GetAccumulated() == Approx(60.0f)); // 100 * (1 - 0.4)
		CHECK(Boss.GetShackle().GetState() == EShackleState::Ready);
		CHECK(Boss.GetOutcome() == EBossOutcome::InProgress);

		// 40 more posture re-breaks and reopens the pry immediately.
		CHECK(Boss.ReceivePostureDamage(40.0f).bPostureBroken);
		CHECK(Boss.CanBeginPry());
		CHECK(PryPerfectly(Boss) == EPryResult::Freed);
	}

	TEST_CASE("timeout miss through Tick")
	{
		FBossEncounter Boss(MakeBoss(true), FDifficultyConfig{});
		Boss.ReceivePostureDamage(100.0f);
		Boss.Tick(2.0f);
		Boss.ReceivePostureDamage(100.0f);
		REQUIRE(Boss.BeginPry());
		EPryResult Last = EPryResult::None;
		ArpgCoreTest::Simulate(1.0f, [&](float Step) {
			const EPryResult R = Boss.Tick(Step);
			Last = R == EPryResult::None ? Last : R;
		});
		CHECK(Last == EPryResult::Failed);
		CHECK_FALSE(Boss.GetPosture().IsStaggered());
	}

	TEST_CASE("no shackle and no health floor: fight ends by health")
	{
		FBossConfig Config = MakeBoss(false);
		Config.HealthFloor = 0.0f;
		FBossEncounter Boss(Config, FDifficultyConfig{});
		for (int I = 0; I < 4; ++I)
		{
			Boss.ReceivePlayerHit(Hit(100, 50), FWeaponConfig{});
		}
		CHECK(Boss.GetShackle().GetState() == EShackleState::Disabled);
		CHECK_FALSE(Boss.CanBeginPry());
		Boss.ReceivePlayerHit(Hit(500, 0), FWeaponConfig{});
		CHECK(Boss.GetHealth() == Approx(0.0f));
		CHECK(Boss.GetOutcome() == EBossOutcome::Defeated);
		CHECK(Boss.GetOutcomeDrops().empty());
		CHECK(Boss.ReceivePostureDamage(100.0f).Applied.Posture == Approx(0.0f));
	}

	TEST_CASE("difficulty reaches the pry window")
	{
		FDifficultyConfig Story;
		Story.PryBeatWindowScale = 1.5f;
		const FBossEncounter Boss(MakeBoss(true), Story);
		CHECK(Boss.GetShackle().GetHalfWindow() == Approx(0.1875f));
		CHECK(Boss.GetConfig().Id == "test_boar");
	}

	TEST_CASE("no softlock: an imperfect but persistent player always finishes (seeded bots)")
	{
		for (const bool bEnabled : {true, false})
		{
			for (std::uint64_t Seed = 1; Seed <= 25; ++Seed)
			{
				CAPTURE(Seed);
				CAPTURE(bEnabled);
				FRng Rng(Seed);
				FBossConfig Config = MakeBoss(bEnabled);
				Config.Posture.RegenPerSecond = 15.0f; // regen fights back
				Config.Posture.RegenDelay = 0.5f;
				Config.bHealthFloorForcesFinalStagger = true;
				Config.Shackle.MissRetriesPerBeat = static_cast<int>(Seed % 3);
				Config.FledDrops = Config.FreedDrops;
				FBossEncounter Boss(Config, FDifficultyConfig{});
				float SinceAttack = 0.0f;
				int SimSteps = 0;
				const int MaxSteps = 64 * 600; // 10 minutes of simulated time
				while (Boss.GetOutcome() == EBossOutcome::InProgress && SimSteps < MaxSteps)
				{
					++SimSteps;
					Boss.Tick(Dt);
					SinceAttack += Dt;
					if (Boss.GetShackle().GetState() == EShackleState::Prying)
					{
						const FShackle& S = Boss.GetShackle();
						const float Target = S.GetCurrentTargetTime();
						if (std::fabs(S.GetPryElapsed() - Target) < 0.5f * Dt)
						{
							// 70%: on time; 30%: fumble (press early).
							if (Rng.Roll(0.7f))
							{
								Boss.InputPryBeat();
							}
						}
						continue;
					}
					if (Boss.CanBeginPry())
					{
						Boss.BeginPry();
						continue;
					}
					if (Boss.CanPerformFinisher())
					{
						Boss.PerformFinisher();
						continue;
					}
					if (SinceAttack >= 0.5f)
					{
						SinceAttack = 0.0f;
						Boss.ReceivePlayerHit(Hit(static_cast<float>(Rng.RangeInt(10, 40)), static_cast<float>(Rng.RangeInt(10, 40))), FWeaponConfig{});
					}
				}
				CHECK(Boss.GetOutcome() == (bEnabled ? EBossOutcome::Freed : EBossOutcome::Fled));
				CHECK(Boss.GetOutcomeDrops().size() == 1);
			}
		}
	}
}
TEST_SUITE("Shackle")
{
	TEST_CASE("missed beats are retried on the next slot, then the pry fails")
	{
		FShackleConfig C = MakeShackle();
		C.CracksToOpen = 1;
		C.MissRetriesPerBeat = 2;
		FShackle S(C);
		S.OnPostureBroken();
		REQUIRE(S.BeginPry(true));
		CHECK(TickTo(S, 0.5f) == EPryResult::None);
		CHECK(S.InputBeat() == EPryResult::BeatHit);          // beat 1 on slot 0
		CHECK(TickTo(S, 1.25f) == EPryResult::BeatMissed);    // slot 1 (1.0) timed out
		CHECK(S.GetMissesOnBeat() == 1);
		CHECK(S.GetCurrentTargetTime() == Approx(1.5f));
		CHECK(TickTo(S, 1.5f) == EPryResult::None);
		CHECK(S.InputBeat() == EPryResult::BeatHit);          // beat 2 retried on slot 2
		CHECK(S.GetMissesOnBeat() == 0);
		CHECK(TickTo(S, 1.75f) == EPryResult::None);
		CHECK(S.InputBeat() == EPryResult::BeatMissed);       // early for slot 3 (2.0)
		CHECK(S.GetCurrentTargetTime() == Approx(2.5f));
		CHECK(TickTo(S, 2.6875f) == EPryResult::BeatMissed); // slot 4 timed out: 2nd miss on beat 3
		CHECK(S.GetMissesOnBeat() == 2);
		CHECK(TickTo(S, 3.1875f) == EPryResult::Failed);     // 3rd miss on the same beat
		CHECK(S.GetState() == EShackleState::Ready);
		CHECK(S.GetCracks() == 1);
	}

	TEST_CASE("hold mode: holding fills each beat, releasing only resets progress")
	{
		FShackleConfig C = MakeShackle();
		C.CracksToOpen = 1;
		C.HoldDurationPerBeat = 0.5f;
		FShackle S(C, 1.0f, EPryInputMode::Hold);
		CHECK(S.GetInputMode() == EPryInputMode::Hold);
		S.OnPostureBroken();
		REQUIRE(S.BeginPry(true));
		CHECK(S.InputBeat() == EPryResult::None); // presses are ignored in hold mode
		S.SetHeld(true);
		ArpgCoreTest::Simulate(0.25f, [&S](float Step) { CHECK(S.Tick(Step) == EPryResult::None); });
		S.SetHeld(false);
		CHECK(S.Tick(Dt) == EPryResult::None);
		S.SetHeld(true);
		int Hits = 0;
		EPryResult Last = EPryResult::None;
		ArpgCoreTest::Simulate(5.0f, [&](float Step) {
			const EPryResult R = S.Tick(Step);
			Hits += R == EPryResult::BeatHit ? 1 : 0;
			Last = R == EPryResult::None ? Last : R;
		});
		CHECK(Hits == 2);
		CHECK(Last == EPryResult::Freed);
	}

	TEST_CASE("auto mode frees on the grid without input; ForceReady opens the pry")
	{
		FShackle S(MakeShackle(), 1.0f, EPryInputMode::Auto);
		CHECK_FALSE(S.CanBeginPry(true));
		S.ForceReady();
		CHECK(S.GetState() == EShackleState::Ready);
		CHECK(S.GetCracks() == 3);
		REQUIRE(S.BeginPry(true));
		EPryResult Last = EPryResult::None;
		ArpgCoreTest::Simulate(2.0f, [&](float Step) {
			const EPryResult R = S.Tick(Step);
			Last = R == EPryResult::None ? Last : R;
		});
		CHECK(Last == EPryResult::Freed);
		S.ForceReady(); // no effect once freed
		CHECK(S.GetState() == EShackleState::Freed);
		S.SetInputMode(EPryInputMode::Timed);
		CHECK(S.GetInputMode() == EPryInputMode::Timed);
	}
}

TEST_SUITE("BossEncounter")
{
	FBossConfig MakePhasedBoss(bool bShackle)
	{
		FBossConfig B = MakeBoss(bShackle);
		B.bHealthFloorForcesFinalStagger = true;
		B.Shackle.CracksToOpen = 3;
		B.FledDrops = {FMaterialAmount{"boar_hide", 1}};
		FBossPhase P1;
		P1.Id = "ph1";
		P1.MaxPosture = 100.0f;
		FBossPhase P2;
		P2.Id = "ph2";
		P2.EnterCracksAtLeast = 2;
		P2.EnterHealthRatioAtMost = 0.5f;
		P2.MaxPosture = 80.0f;
		B.Phases = {P1, P2};
		return B;
	}

	TEST_CASE("phase 2 enters on cracks or health and changes the posture max")
	{
		FBossEncounter ByCracks(MakePhasedBoss(true), FDifficultyConfig{});
		CHECK(ByCracks.GetPhaseIndex() == 0);
		ByCracks.ReceivePostureDamage(100.0f);
		ByCracks.Tick(2.0f);
		CHECK(ByCracks.GetPhaseIndex() == 0);
		CHECK(ByCracks.ReceivePostureDamage(100.0f).bPhaseChanged);
		CHECK(ByCracks.GetPhaseIndex() == 1);
		CHECK(ByCracks.GetPhase()->Id == "ph2");
		CHECK(ByCracks.GetPosture().GetConfig().MaxPosture == Approx(80.0f));

		FBossEncounter ByHealth(MakePhasedBoss(true), FDifficultyConfig{});
		ByHealth.ReceivePostureDamage(50.0f);
		const FBossHitResult R = ByHealth.ReceivePlayerHit(Hit(250, 0), FWeaponConfig{});
		CHECK(R.bPhaseChanged);
		CHECK(ByHealth.GetPosture().GetAccumulated() == Approx(40.0f)); // ratio 0.5 kept

		FBossConfig AllCfg = MakePhasedBoss(true);
		AllCfg.Phases[1].bEnterOnAny = false;
		FBossEncounter All(AllCfg, FDifficultyConfig{});
		All.ReceivePlayerHit(Hit(250, 0), FWeaponConfig{});
		CHECK(All.GetPhaseIndex() == 0); // health alone is not enough
		All.ReceivePostureDamage(100.0f);
		All.Tick(2.0f);
		All.ReceivePostureDamage(100.0f);
		CHECK(All.GetPhaseIndex() == 1);
		CHECK(All.GetPhase() != nullptr);
	}

	TEST_CASE("health floor forces a final stagger that opens the pry without all cracks")
	{
		FBossEncounter Boss(MakePhasedBoss(true), FDifficultyConfig{});
		const FBossHitResult R = Boss.ReceivePlayerHit(Hit(1000, 0), FWeaponConfig{});
		CHECK(R.bFinalStagger);
		CHECK(R.bPostureBroken);
		CHECK(Boss.GetHealth() == Approx(1.0f));
		CHECK(Boss.GetPosture().IsIndefiniteStagger());
		CHECK(Boss.GetShackle().GetCracks() == 3);
		Boss.Tick(60.0f); // the final stagger does not time out
		REQUIRE(Boss.CanBeginPry());
		CHECK_FALSE(Boss.CanPerformFinisher());
		REQUIRE(Boss.BeginPry());
		CHECK(Boss.InputPryBeat() == EPryResult::Failed);
		CHECK_FALSE(Boss.GetPosture().IsStaggered());
		CHECK(Boss.GetPosture().GetAccumulated() == Approx(48.0f)); // 80 * (1 - 0.4) in phase 2
		CHECK_FALSE(Boss.ReceivePlayerHit(Hit(1000, 0), FWeaponConfig{}).bFinalStagger); // only once
		CHECK(Boss.ReceivePostureDamage(40.0f).bPostureBroken);
		CHECK(PryPerfectly(Boss) == EPryResult::Freed);
		CHECK(Boss.GetOutcomeDrops().size() == 1);
	}

	TEST_CASE("shackle disabled: final stagger, shove, the creature flees with its drop")
	{
		FBossEncounter Boss(MakePhasedBoss(false), FDifficultyConfig{});
		CHECK_FALSE(Boss.PerformFinisher());
		Boss.ReceivePlayerHit(Hit(1000, 0), FWeaponConfig{});
		CHECK(Boss.CanPerformFinisher());
		CHECK_FALSE(Boss.CanBeginPry());
		REQUIRE(Boss.PerformFinisher());
		CHECK(Boss.GetOutcome() == EBossOutcome::Fled);
		REQUIRE(Boss.GetOutcomeDrops().size() == 1);
		CHECK(Boss.GetOutcomeDrops()[0].MaterialId == "boar_hide");
	}

	TEST_CASE("pry difficulty and accessibility modes reach the encounter")
	{
		FDifficultyConfig Story;
		Story.bPryAuto = true;
		FBossEncounter Boss(MakePhasedBoss(true), Story);
		CHECK(Boss.GetShackle().GetInputMode() == EPryInputMode::Auto);
		Boss.SetPryInputMode(EPryInputMode::Hold);
		Boss.ReceivePlayerHit(Hit(1000, 0), FWeaponConfig{});
		REQUIRE(Boss.BeginPry());
		Boss.SetPryHeld(true);
		ArpgCoreTest::Simulate(3.0f, [&Boss](float Step) { Boss.Tick(Step); });
		CHECK(Boss.GetOutcome() == EBossOutcome::Freed);
	}
}
TEST_SUITE("Shackle")
{
	TEST_CASE("pry steps are clamped: a frame hitch cannot burn the retries (QA N4)")
	{
		FShackleConfig C = MakeShackle();
		C.CracksToOpen = 1;
		C.MissRetriesPerBeat = 2;
		FShackle S(C);
		S.OnPostureBroken();
		REQUIRE(S.BeginPry(true));
		CHECK(S.Tick(2.5f) == EPryResult::None);
		CHECK(S.GetPryElapsed() == Approx(0.1f));
		CHECK(S.Tick(1.0f / 60.0f) == EPryResult::None);
		CHECK(S.Tick(1.0f / 60.0f) == EPryResult::None);
		CHECK(S.GetMissesOnBeat() == 0);
	}
}

TEST_SUITE("BossEncounter")
{
	TEST_CASE("Applied.Posture is 0 when the hit did not add posture (QA N2)")
	{
		FBossConfig Config = MakeBoss(true);
		Config.bHealthFloorForcesFinalStagger = true;
		FBossEncounter Boss(Config, FDifficultyConfig{});
		CHECK(Boss.ReceivePlayerHit(Hit(10, 50), FWeaponConfig{}).Applied.Posture == Approx(50.0f));
		const FBossHitResult Floor = Boss.ReceivePlayerHit(Hit(5000, 50), FWeaponConfig{});
		CHECK(Floor.bFinalStagger);
		CHECK(Floor.Applied.Posture == Approx(0.0f));
		CHECK(Boss.ReceivePlayerHit(Hit(10, 50), FWeaponConfig{}).Applied.Posture == Approx(0.0f)); // staggered

		FBossConfig Mortal = MakeBoss(false);
		Mortal.HealthFloor = 0.0f;
		FBossEncounter Dies(Mortal, FDifficultyConfig{});
		const FBossHitResult Kill = Dies.ReceivePlayerHit(Hit(5000, 50), FWeaponConfig{});
		CHECK(Dies.GetOutcome() == EBossOutcome::Defeated);
		CHECK(Kill.Applied.Posture == Approx(0.0f));
	}
}
#endif
