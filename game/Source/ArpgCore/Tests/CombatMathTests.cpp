// CombatMathTests.cpp - Defense, Posture, Damage, HitStop, DrumMeter.
#if defined(ARPGCORE_STANDALONE_TESTS)
#include "TestCommon.h"

#include "ArpgCore/Damage.h"
#include "ArpgCore/Defense.h"
#include "ArpgCore/DrumMeter.h"
#include "ArpgCore/HitStop.h"
#include "ArpgCore/Posture.h"

#include <cmath>
#include <limits>

using namespace ArpgCore;
using ArpgCoreTest::Dt;
using doctest::Approx;

namespace
{
void Advance(FDefenseController& D, float Seconds)
{
	ArpgCoreTest::Simulate(Seconds, [&D](float Step) { D.Tick(Step); });
}

FAttackData Attack(float Damage, float Posture, bool bUnparryable = false, bool bUndodgeable = false)
{
	FAttackData A;
	A.BaseDamage = Damage;
	A.BasePostureDamage = Posture;
	A.bUnparryable = bUnparryable;
	A.bUndodgeable = bUndodgeable;
	return A;
}
} // namespace

TEST_SUITE("Defense")
{
	TEST_CASE("dodge i-frames and perfect dodge")
	{
		FDodgeConfig Dodge; // 0.5 s, i-frames [0.05, 0.25), perfect 0.08
		FDefenseController D(Dodge, FParryConfig{});
		CHECK(D.ResolveIncoming(Attack(10, 10)) == EDefenseOutcome::Hit); // idle
		REQUIRE(D.StartDodge());
		CHECK(D.GetAction() == EDefenseAction::Dodge);
		CHECK(D.ResolveIncoming(Attack(10, 10)) == EDefenseOutcome::Hit); // before i-frames
		Advance(D, 0.0625f);
		CHECK(D.IsInvulnerable());
		CHECK(D.ResolveIncoming(Attack(10, 10)) == EDefenseOutcome::PerfectDodge);
		CHECK(D.ResolveIncoming(Attack(10, 10, false, true)) == EDefenseOutcome::Hit); // undodgeable
		Advance(D, 0.125f);
		CHECK(D.ResolveIncoming(Attack(10, 10)) == EDefenseOutcome::Dodged);
		Advance(D, 0.0625f);
		CHECK_FALSE(D.IsInvulnerable());
		CHECK(D.ResolveIncoming(Attack(10, 10)) == EDefenseOutcome::Hit);
		CHECK_FALSE(D.StartParry()); // busy
		Advance(D, 0.25f);
		CHECK_FALSE(D.IsBusy());
		CHECK(D.GetActionElapsed() == Approx(0.0f));
	}

	TEST_CASE("parry windows, unparryable attacks, lockout")
	{
		FDefenseController D(FDodgeConfig{}, FParryConfig{}); // window 0.15, perfect 0.05, duration 0.4
		REQUIRE(D.StartParry());
		CHECK(D.ResolveIncoming(Attack(10, 10)) == EDefenseOutcome::PerfectParry);
		CHECK(D.ResolveIncoming(Attack(10, 10, true)) == EDefenseOutcome::Hit);
		Advance(D, 0.0625f);
		CHECK(D.ResolveIncoming(Attack(10, 10)) == EDefenseOutcome::Parried);
		Advance(D, 0.09375f); // 0.15625 > 0.15
		CHECK(D.ResolveIncoming(Attack(10, 10)) == EDefenseOutcome::Hit);
		CHECK_FALSE(D.StartParry());
		CHECK_FALSE(D.StartDodge());
		Advance(D, 0.25f);
		CHECK(D.StartParry());
		CHECK(IsPerfectOutcome(EDefenseOutcome::PerfectParry));
		CHECK(IsPerfectOutcome(EDefenseOutcome::PerfectDodge));
		CHECK_FALSE(IsPerfectOutcome(EDefenseOutcome::Parried));
	}

	TEST_CASE("difficulty scales parry windows, clamped to the action")
	{
		const FDefenseController Wide(FDodgeConfig{}, FParryConfig{}, 2.0f);
		CHECK(Wide.GetEffectiveParryWindow() == Approx(0.3f));
		CHECK(Wide.GetEffectivePerfectParryWindow() == Approx(0.1f));
		const FDefenseController Huge(FDodgeConfig{}, FParryConfig{}, 10.0f);
		CHECK(Huge.GetEffectiveParryWindow() == Approx(0.4f));
		CHECK(Huge.GetEffectivePerfectParryWindow() == Approx(0.4f));
		const FDefenseController Bad(FDodgeConfig{}, FParryConfig{}, std::numeric_limits<float>::quiet_NaN());
		CHECK(Bad.GetEffectiveParryWindow() == Approx(0.0f));
	}
}

TEST_SUITE("Posture")
{
	FPostureConfig MakePosture()
	{
		FPostureConfig C;
		C.MaxPosture = 100.0f;
		C.RegenPerSecond = 10.0f;
		C.RegenDelay = 1.0f;
		C.StaggerDuration = 2.0f;
		C.StaggerDamageMultiplier = 1.5f;
		C.PostureAfterStagger = 0.0f;
		return C;
	}

	TEST_CASE("accumulates and regenerates after the delay")
	{
		FPosture P(MakePosture());
		CHECK_FALSE(P.ApplyDamage(40.0f));
		CHECK(P.GetAccumulated() == Approx(40.0f));
		P.Tick(1.0f);
		CHECK(P.GetAccumulated() == Approx(40.0f)); // still inside the delay
		P.Tick(0.5f);
		CHECK(P.GetAccumulated() == Approx(35.0f));
		P.ApplyDamage(5.0f);
		P.Tick(1.5f); // one step crossing the delay: only 0.5 s of regen
		CHECK(P.GetAccumulated() == Approx(35.0f));
		P.Tick(100.0f);
		CHECK(P.GetAccumulated() == Approx(0.0f));
		CHECK(P.GetRatio() == Approx(0.0f));
	}

	TEST_CASE("break, stagger, multiplier, pause, natural end")
	{
		FPosture P(MakePosture());
		P.ApplyDamage(40.0f);
		CHECK(P.GetDamageMultiplier() == Approx(1.0f));
		CHECK(P.ApplyDamage(70.0f));
		CHECK(P.IsStaggered());
		CHECK(P.GetBreakCount() == 1);
		CHECK(P.GetAccumulated() == Approx(100.0f));
		CHECK(P.GetDamageMultiplier() == Approx(1.5f));
		CHECK_FALSE(P.ApplyDamage(50.0f)); // ignored while staggered
		P.Recover(50.0f);                  // ignored while staggered
		CHECK(P.GetAccumulated() == Approx(100.0f));
		P.Tick(1.0f);
		CHECK(P.GetStaggerRemaining() == Approx(1.0f));
		P.SetStaggerPaused(true);
		P.Tick(5.0f);
		CHECK(P.IsStaggered());
		P.SetStaggerPaused(false);
		P.Tick(1.0f);
		CHECK_FALSE(P.IsStaggered());
		CHECK(P.GetAccumulated() == Approx(0.0f));
	}

	TEST_CASE("recovery variants")
	{
		FPostureConfig C = MakePosture();
		C.PostureAfterStagger = 0.25f;
		FPosture P(C);
		P.ApplyDamage(100.0f);
		P.Tick(2.0f);
		CHECK(P.GetAccumulated() == Approx(25.0f));
		P.ApplyDamage(80.0f);
		P.EndStaggerWithRecovery(0.35f);
		CHECK_FALSE(P.IsStaggered());
		CHECK(P.GetAccumulated() == Approx(65.0f));
		CHECK(P.GetRatio() == Approx(0.65f));
		P.Recover(15.0f);
		CHECK(P.GetAccumulated() == Approx(50.0f));
		CHECK_FALSE(P.ApplyDamage(-10.0f));
		CHECK_FALSE(P.ApplyDamage(std::numeric_limits<float>::quiet_NaN()));
		CHECK(P.GetAccumulated() == Approx(50.0f));
		CHECK(P.GetConfig().MaxPosture == Approx(100.0f));
	}

	TEST_CASE("zero max posture breaks on any damage")
	{
		FPostureConfig C = MakePosture();
		C.MaxPosture = 0.0f;
		FPosture P(C);
		CHECK(P.GetRatio() == Approx(1.0f));
		CHECK(P.ApplyDamage(1.0f));
	}
}

TEST_SUITE("Damage")
{
	TEST_CASE("weapon and stagger multipliers")
	{
		const FWeaponConfig Weapon{"pole", 1.5f, 2.0f};
		FDamageContext Ctx;
		FDamageResult R = ComputeDamage(Attack(10, 20), Weapon, FDifficultyConfig{}, Ctx);
		CHECK(R.Health == Approx(15.0f));
		CHECK(R.Posture == Approx(40.0f));

		Ctx.bTargetStaggered = true;
		Ctx.StaggerMultiplier = 1.5f;
		R = ComputeDamage(Attack(10, 20), Weapon, FDifficultyConfig{}, Ctx);
		CHECK(R.Health == Approx(22.5f));
		CHECK(R.Posture == Approx(40.0f));
	}

	TEST_CASE("difficulty scaling and damage reduction")
	{
		FDifficultyConfig Story;
		Story.DamageToPlayerMultiplier = 0.5f;
		Story.DamageToEnemyMultiplier = 1.25f;
		Story.PostureToEnemyMultiplier = 2.0f;
		FDamageContext EnemyHitsPlayer;
		EnemyHitsPlayer.bAttackerIsPlayer = false;
		FDamageResult R = ComputeDamage(Attack(10, 20), FWeaponConfig{}, Story, EnemyHitsPlayer);
		CHECK(R.Health == Approx(5.0f));
		CHECK(R.Posture == Approx(10.0f));

		FDamageContext PlayerHits;
		PlayerHits.TargetDamageReduction = 0.2f;
		R = ComputeDamage(Attack(10, 20), FWeaponConfig{}, Story, PlayerHits);
		CHECK(R.Health == Approx(10.0f)); // 10 * 1.25 * 0.8
		CHECK(R.Posture == Approx(40.0f));

		PlayerHits.TargetDamageReduction = 5.0f; // clamped to 1
		CHECK(ComputeDamage(Attack(10, 20), FWeaponConfig{}, Story, PlayerHits).Health == Approx(0.0f));
	}

	TEST_CASE("invalid inputs clamp to zero")
	{
		const FWeaponConfig NanWeapon{"x", std::numeric_limits<float>::quiet_NaN(), -1.0f};
		const FDamageResult R = ComputeDamage(Attack(-10, 20), NanWeapon, FDifficultyConfig{}, FDamageContext{});
		CHECK(R.Health == Approx(0.0f));
		CHECK(R.Posture == Approx(0.0f));
	}

	TEST_CASE("parry exchange")
	{
		const FParryConfig Parry; // 0.5 / 1.0 / 0.3 / 0.0
		FParryExchange E = ComputeParryExchange(Attack(10, 40), false, Parry, FDifficultyConfig{});
		CHECK(E.AttackerPosture == Approx(20.0f));
		CHECK(E.DefenderPosture == Approx(12.0f));
		E = ComputeParryExchange(Attack(10, 40), true, Parry, FDifficultyConfig{});
		CHECK(E.AttackerPosture == Approx(40.0f));
		CHECK(E.DefenderPosture == Approx(0.0f));

		FDifficultyConfig Easy;
		Easy.PostureToEnemyMultiplier = 2.0f;
		Easy.DamageToPlayerMultiplier = 0.5f;
		E = ComputeParryExchange(Attack(10, 40), false, Parry, Easy, true);
		CHECK(E.AttackerPosture == Approx(40.0f));
		CHECK(E.DefenderPosture == Approx(6.0f));
		E = ComputeParryExchange(Attack(10, 40), false, Parry, Easy, false); // enemy parried the player
		CHECK(E.AttackerPosture == Approx(20.0f));
		CHECK(E.DefenderPosture == Approx(12.0f));
	}
}

TEST_SUITE("HitStop")
{
	FHitStopConfig MakeHitStop()
	{
		FHitStopConfig C;
		C.Curve = {{0.0f, 0.0f}, {1.0f, 0.05f}, {3.0f, 0.12f}};
		C.MinDuration = 0.02f;
		C.MaxDuration = 0.1f;
		C.PerfectParryBonus = 0.04f;
		return C;
	}

	TEST_CASE("curve interpolation with clamping")
	{
		const FHitStopConfig C = MakeHitStop();
		CHECK(ComputeHitStopDuration(C, 0.0f) == Approx(0.02f));  // clamped to min
		CHECK(ComputeHitStopDuration(C, 1.0f) == Approx(0.05f));
		CHECK(ComputeHitStopDuration(C, 2.0f) == Approx(0.085f));
		CHECK(ComputeHitStopDuration(C, 10.0f) == Approx(0.1f)); // clamped to max
		CHECK(ComputeHitStopDuration(C, -5.0f) == Approx(0.02f));
		CHECK(ComputeHitStopDuration(C, std::numeric_limits<float>::infinity()) == Approx(0.02f));
		CHECK(ComputeHitStopDuration(C, 1.0f, true) == Approx(0.09f));
	}

	TEST_CASE("empty curve and inverted min/max")
	{
		FHitStopConfig C = MakeHitStop();
		C.Curve.clear();
		CHECK(ComputeHitStopDuration(C, 2.0f) == Approx(0.02f));
		C.MaxDuration = 0.0f; // max < min: min wins
		C.Curve = {{0.0f, 0.5f}};
		CHECK(ComputeHitStopDuration(C, 2.0f) == Approx(0.02f));
	}

	TEST_CASE("clock freezes game time, keeps the longest trigger")
	{
		FHitStopClock Clock;
		CHECK(Clock.Advance(Dt) == Approx(Dt));
		Clock.Trigger(0.0625f);
		CHECK(Clock.IsStopped());
		CHECK(Clock.Advance(Dt) == Approx(0.0f));
		Clock.Trigger(0.01f); // shorter: ignored
		CHECK(Clock.GetRemaining() == Approx(0.046875f));
		CHECK(Clock.Advance(0.0625f) == Approx(0.015625f)); // 0.046875 frozen, rest passes
		CHECK_FALSE(Clock.IsStopped());
		CHECK(Clock.Advance(-1.0f) == Approx(0.0f));

		FHitStopClock Slow(0.5f);
		Slow.Trigger(0.0625f);
		CHECK(Slow.Advance(0.0625f) == Approx(0.03125f));
	}
}

TEST_SUITE("DrumMeter")
{
	FDrumConfig MakeDrum()
	{
		FDrumConfig C;
		C.Notches = 4;
		C.PointsPerNotch = 100.0f;
		C.PerfectParryGain = 50.0f;
		C.PerfectDodgeGain = 40.0f;
		C.HitGain = 10.0f;
		C.DecayDelay = 2.0f;
		C.DecayPerSecond = 20.0f;
		C.bDecayKeepsFullNotches = true;
		return C;
	}

	TEST_CASE("gains and notches")
	{
		FDrumMeter M(MakeDrum());
		M.AddEvent(EDrumEvent::PerfectParry);
		M.AddEvent(EDrumEvent::PerfectParry);
		CHECK(M.GetFullNotches() == 1);
		M.AddEvent(EDrumEvent::HitLanded);
		M.AddEvent(EDrumEvent::PerfectDodge);
		CHECK(M.GetPoints() == Approx(150.0f));
		CHECK(M.GetMaxPoints() == Approx(400.0f));
		CHECK_FALSE(M.CanSurge());
		CHECK_FALSE(M.TrySurge());
	}

	TEST_CASE("surge spends every notch")
	{
		FDrumMeter M(MakeDrum());
		for (int I = 0; I < 10; ++I)
		{
			M.AddEvent(EDrumEvent::PerfectParry);
		}
		CHECK(M.GetPoints() == Approx(400.0f)); // capped
		CHECK(M.GetFullNotches() == 4);
		CHECK(M.CanSurge());
		CHECK(M.TrySurge());
		CHECK(M.GetPoints() == Approx(0.0f));
		CHECK_FALSE(M.TrySurge());
	}

	TEST_CASE("decay after the delay keeps full notches")
	{
		FDrumMeter M(MakeDrum());
		M.AddEvent(EDrumEvent::PerfectParry);
		M.AddEvent(EDrumEvent::PerfectParry);
		M.AddEvent(EDrumEvent::HitLanded); // 110
		M.Tick(2.0f);
		CHECK(M.GetPoints() == Approx(110.0f));
		M.Tick(1.0f);
		CHECK(M.GetPoints() == Approx(100.0f)); // floor at the completed notch
		M.NotifyCombatActivity();
		M.Tick(2.0f);
		CHECK(M.GetPoints() == Approx(100.0f));
	}

	TEST_CASE("decay to zero when notches are not protected")
	{
		FDrumConfig C = MakeDrum();
		C.bDecayKeepsFullNotches = false;
		FDrumMeter M(C);
		M.AddEvent(EDrumEvent::PerfectParry);
		M.AddEvent(EDrumEvent::PerfectParry);
		M.AddEvent(EDrumEvent::HitLanded);
		M.Tick(3.0f); // 1 s of decay
		CHECK(M.GetPoints() == Approx(90.0f));
		CHECK(M.GetFullNotches() == 0);
		M.Tick(100.0f);
		CHECK(M.GetPoints() == Approx(0.0f));
	}

	TEST_CASE("degenerate config never surges")
	{
		FDrumConfig C = MakeDrum();
		C.PointsPerNotch = 0.0f;
		FDrumMeter M(C);
		M.AddEvent(EDrumEvent::PerfectParry);
		CHECK(M.GetFullNotches() == 0);
		CHECK_FALSE(M.CanSurge());
	}
}
TEST_SUITE("Defense")
{
	TEST_CASE("guard reduces guardable hits; dodge and parry take precedence")
	{
		FDodgeConfig Dodge;
		Dodge.Recovery = 0.25f;
		FDefenseController D(Dodge, FParryConfig{});
		D.SetGuarding(true);
		CHECK(D.IsGuarding());
		FAttackData Normal = Attack(10, 10);
		FAttackData Unguardable = Attack(10, 10);
		Unguardable.bUnguardable = true;
		CHECK(D.ResolveIncoming(Normal) == EDefenseOutcome::Guarded);
		CHECK(D.ResolveIncoming(Unguardable) == EDefenseOutcome::Hit);
		REQUIRE(D.StartParry());
		CHECK(D.ResolveIncoming(Normal) == EDefenseOutcome::PerfectParry);
		Advance(D, 0.25f); // parry window over, guard still held
		CHECK(D.ResolveIncoming(Normal) == EDefenseOutcome::Guarded);
		Advance(D, 0.25f);
		REQUIRE(D.StartDodge());
		CHECK(D.ResolveIncoming(Normal) == EDefenseOutcome::Hit); // dodging: no guard
		Advance(D, 0.5f);
		CHECK(D.IsBusy()); // recovery after the dodge motion
		Advance(D, 0.25f);
		CHECK_FALSE(D.IsBusy());
		D.SetGuarding(false);
		CHECK(D.ResolveIncoming(Normal) == EDefenseOutcome::Hit);
	}
}

TEST_SUITE("Damage")
{
	TEST_CASE("guard and flat parry posture")
	{
		const FDamageResult Guarded = ApplyGuard(FDamageResult{100.0f, 20.0f}, FGuardConfig{0.7f, 1.5f});
		CHECK(Guarded.Health == Approx(30.0f));
		CHECK(Guarded.Posture == Approx(30.0f));

		FParryConfig Flat;
		Flat.AttackerPostureFlatOnParry = 20.0f;
		Flat.AttackerPostureFlatOnPerfectParry = 40.0f;
		Flat.AttackerPostureOnParry = 0.0f;
		Flat.AttackerPostureOnPerfectParry = 0.0f;
		CHECK(ComputeParryExchange(Attack(10, 99), false, Flat, FDifficultyConfig{}).AttackerPosture == Approx(20.0f));
		CHECK(ComputeParryExchange(Attack(10, 99), true, Flat, FDifficultyConfig{}).AttackerPosture == Approx(40.0f));
	}
}

TEST_SUITE("DrumMeter")
{
	TEST_CASE("design events, hit-taken loss and partial surge cost")
	{
		FDrumConfig C;
		C.Notches = 4;
		C.PointsPerNotch = 100.0f;
		C.PerfectParryGain = 50.0f;
		C.HitGain = 10.0f;
		C.HeavyHitGain = 15.0f;
		C.ParryGain = 25.0f;
		C.PostureBreakGain = 50.0f;
		C.PryBeatGain = 5.0f;
		C.HitTakenLoss = 30.0f;
		C.SurgeCostNotches = 2;
		FDrumMeter M(C);
		M.AddEvent(EDrumEvent::HeavyHit);
		M.AddEvent(EDrumEvent::Parry);
		M.AddEvent(EDrumEvent::PostureBreak);
		M.AddEvent(EDrumEvent::PryBeat);
		CHECK(M.GetPoints() == Approx(95.0f));
		M.OnHitTaken();
		CHECK(M.GetPoints() == Approx(65.0f));
		M.AddEvent(EDrumEvent::PostureBreak); // 115
		M.OnHitTaken();                       // floor at the full notch
		CHECK(M.GetPoints() == Approx(100.0f));
		CHECK(M.GetSurgeCost() == Approx(200.0f));
		CHECK_FALSE(M.CanSurge());
		M.AddEvent(EDrumEvent::PerfectParry);
		M.AddEvent(EDrumEvent::PerfectParry);
		M.AddEvent(EDrumEvent::HitLanded);
		REQUIRE(M.TrySurge());
		CHECK(M.GetPoints() == Approx(10.0f)); // 210 - 200

		C.bHitTakenKeepsFullNotches = false;
		C.SurgeCostNotches = 99; // clamped to all notches
		FDrumMeter Loose(C);
		Loose.AddEvent(EDrumEvent::PostureBreak);
		Loose.AddEvent(EDrumEvent::PostureBreak);
		Loose.OnHitTaken();
		CHECK(Loose.GetPoints() == Approx(70.0f));
		CHECK(Loose.GetSurgeCost() == Approx(400.0f));
	}
}
#endif
