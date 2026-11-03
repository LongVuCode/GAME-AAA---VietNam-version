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
	B.HealthFloorWhileShackled = 1.0f;
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
		CHECK(S.InputBeat() == EPryResult::Miss); // early
		CHECK(S.GetState() == EShackleState::Ready);
		CHECK(S.GetBeatsHit() == 0);
		CHECK(S.GetCracks() == 1);

		REQUIRE(S.BeginPry(true));
		TickTo(S, 0.5f);
		CHECK(S.InputBeat() == EPryResult::BeatHit);
		CHECK(S.InputBeat() == EPryResult::Miss); // mashing: next beat is 0.5 s away

		REQUIRE(S.BeginPry(true));
		CHECK(TickTo(S, 0.6875f) == EPryResult::Miss); // window closed at 0.625
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
		CHECK(Boss.GetFreedDrops().empty());

		REQUIRE(Boss.CanBeginPry());
		const float StaggerBefore = Boss.GetPosture().GetStaggerRemaining();
		CHECK(PryPerfectly(Boss) == EPryResult::Freed);
		CHECK(Boss.GetPosture().GetStaggerRemaining() == Approx(0.0f));
		CHECK(StaggerBefore > 0.0f);
		CHECK(Boss.GetOutcome() == EBossOutcome::Freed);
		REQUIRE(Boss.GetFreedDrops().size() == 1);
		CHECK(Boss.GetFreedDrops()[0].MaterialId == "boar_hide");
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

		CHECK(Boss.InputPryBeat() == EPryResult::Miss); // early
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
		CHECK(Last == EPryResult::Miss);
		CHECK_FALSE(Boss.GetPosture().IsStaggered());
	}

	TEST_CASE("disabled shackle: fight ends by health (K0 fallback)")
	{
		FBossEncounter Boss(MakeBoss(false), FDifficultyConfig{});
		for (int I = 0; I < 4; ++I)
		{
			Boss.ReceivePlayerHit(Hit(100, 50), FWeaponConfig{});
		}
		CHECK(Boss.GetShackle().GetState() == EShackleState::Disabled);
		CHECK_FALSE(Boss.CanBeginPry());
		Boss.ReceivePlayerHit(Hit(500, 0), FWeaponConfig{});
		CHECK(Boss.GetHealth() == Approx(0.0f));
		CHECK(Boss.GetOutcome() == EBossOutcome::Defeated);
		CHECK(Boss.GetFreedDrops().empty());
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
						const float Target = S.GetBeatTime(S.GetBeatsHit());
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
					if (SinceAttack >= 0.5f)
					{
						SinceAttack = 0.0f;
						Boss.ReceivePlayerHit(Hit(static_cast<float>(Rng.RangeInt(10, 40)), static_cast<float>(Rng.RangeInt(10, 40))), FWeaponConfig{});
					}
				}
				CHECK(Boss.GetOutcome() == (bEnabled ? EBossOutcome::Freed : EBossOutcome::Defeated));
			}
		}
	}
}
#endif
