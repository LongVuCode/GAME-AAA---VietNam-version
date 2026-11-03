// ConfigTests.cpp - Semantic validation, the design-data loader on the REAL design/data/*.json
// (path from the repo root, passed by CMake), loader error paths (mutated copies of the real data),
// the real secret chain, and bot fights against Lợn Lòi Đầm with the real tuning (khoen on / off).
#if defined(ARPGCORE_STANDALONE_TESTS)
#include "TestCommon.h"

#include "ArpgCore/BossEncounter.h"
#include "ArpgCore/ComboGraph.h"
#include "ArpgCore/Config.h"
#include "ArpgCore/DesignDataLoader.h"
#include "ArpgCore/Defense.h"
#include "ArpgCore/DrumMeter.h"
#include "ArpgCore/HitStop.h"
#include "ArpgCore/Lineage.h"
#include "ArpgCore/Rng.h"
#include "ArpgCore/SecretGraph.h"

#include <nlohmann/json.hpp>

#include <cmath>
#include <functional>
#include <map>
#include <string>
#include <vector>

using namespace ArpgCore;
using ArpgCoreTest::Dt;
using doctest::Approx;
using FJson = nlohmann::json;

namespace
{
bool HasError(const std::vector<FError>& Errors, const std::string& Needle)
{
	for (const FError& E : Errors)
	{
		if ((E.Path + ": " + E.Message).find(Needle) != std::string::npos)
		{
			return true;
		}
	}
	return false;
}

std::string Dump(const std::vector<FError>& Errors)
{
	std::string Out;
	for (const FError& E : Errors)
	{
		Out += E.Path + ": " + E.Message + "\n";
	}
	return Out;
}

std::string ReadDesign(const std::string& Name)
{
	std::ifstream File(std::string(ARPGCORE_DESIGN_DATA_DIR) + "/" + Name + ".json", std::ios::binary);
	REQUIRE_MESSAGE(File.good(), "missing design file " << Name);
	std::ostringstream Buffer;
	Buffer << File.rdbuf();
	return Buffer.str();
}

/** Owns the text of the six design files (optionally edited) and loads them. */
struct FDesignFiles
{
	std::map<std::string, std::string> Text;

	FDesignFiles()
	{
		for (const char* Name : {"combat_tuning", "weapons", "enemies", "items", "lineage", "secrets"})
		{
			Text[Name] = ReadDesign(Name);
		}
	}

	/** Parses one file, lets Fn edit it, writes it back. */
	FDesignFiles& Edit(const std::string& Name, const std::function<void(FJson&)>& Fn)
	{
		FJson J = FJson::parse(Text[Name]);
		Fn(J);
		Text[Name] = J.dump();
		return *this;
	}

	TResult<FArpgConfig> Load(std::vector<FError>* Warnings = nullptr) const
	{
		FDesignDataSources S;
		S.CombatTuning = Text.at("combat_tuning");
		S.Weapons = Text.at("weapons");
		S.Enemies = Text.at("enemies");
		S.Items = Text.at("items");
		S.Lineage = Text.at("lineage");
		S.Secrets = Text.at("secrets");
		return LoadDesignData(S, Warnings);
	}
};

FArpgConfig LoadReal()
{
	const TResult<FArpgConfig> R = FDesignFiles().Load();
	INFO(R.ErrorSummary());
	REQUIRE(R.IsOk());
	return R.GetValue();
}

std::vector<FError> LoadErrors(FDesignFiles& Files)
{
	const TResult<FArpgConfig> R = Files.Load();
	REQUIRE_FALSE(R.IsOk());
	return R.GetErrors();
}

FJson& Boss(FJson& Enemies)
{
	for (FJson& E : Enemies["enemies"])
	{
		if (E["id"] == "boss_lon_loi_dam")
		{
			return E;
		}
	}
	FAIL("boss_lon_loi_dam missing from enemies.json");
	return Enemies;
}

const FComboTransitionDef* FindTransitionTo(const FMovesetConfig& Set, const std::string& To)
{
	for (const FComboTransitionDef& T : Set.Combo)
	{
		if (T.To == To)
		{
			return &T;
		}
	}
	return nullptr;
}

struct FBotResult
{
	EBossOutcome Outcome = EBossOutcome::InProgress;
	float Seconds = 0.0f;
	int PryAttempts = 0;
	int PostureBreaks = 0;
	int HitsTaken = 0;
	std::vector<FMaterialAmount> Drops;
};

/** A deterministic, imperfect player against Lợn Lòi Đầm, using only data values. */
FBotResult RunBossBot(const FArpgConfig& Config, bool bKhoen, std::uint64_t Seed, const std::string& DifficultyId,
	float Skill)
{
	FBossConfig BossConfig = *Config.FindBoss("boss_lon_loi_dam");
	BossConfig.Shackle.bEnabled = bKhoen; // feature_khoen on / off
	const FDifficultyConfig& Difficulty = *Config.FindDifficulty(DifficultyId);
	const FMovesetConfig& Spear = *Config.FindMoveset("wp_giao_dong");
	const FWeaponConfig& Weapon = *Config.FindWeapon("wp_giao_dong");
	const TResult<FComboGraph> GraphResult = BuildComboGraph(Spear);
	REQUIRE(GraphResult.IsOk());
	const FComboGraph& Graph = GraphResult.GetValue();

	FRng Rng(Seed);
	FBossEncounter Boss(BossConfig, Difficulty);
	FComboRunner Runner(Graph, Config.Combat.Runner);
	FDefenseController Defense(Config.Combat.Dodge, Config.Combat.Parry, Difficulty.ParryWindowScale);
	FDrumMeter Drum(Config.Drum);
	FHitStopClock HitStop(Config.HitStop.TimeScaleDuringStop);

	FBotResult Out;
	float Time = 0.0f;
	float NextAttackAt = 2.0f;
	float ImpactAt = -1.0f;
	float ReactAt = -1.0f;
	bool bReactParry = false;
	const FEnemyAttack* Pending = nullptr;
	const float MaxSeconds = 20.0f * 60.0f;

	while (Boss.GetOutcome() == EBossOutcome::InProgress && Time < MaxSeconds)
	{
		const float GameDt = HitStop.Advance(Dt);
		Time += Dt;
		Defense.Tick(GameDt);
		Drum.Tick(GameDt);
		const EPryResult Pry = Boss.Tick(GameDt);
		if (Pry == EPryResult::BeatHit || Pry == EPryResult::Freed)
		{
			HitStop.Trigger(Pry == EPryResult::Freed ? Config.HitStop.PryReleaseDuration : Config.HitStop.PryBeatDuration);
		}

		// Pry: press on the current slot with probability Skill, otherwise let it pass (miss + retry).
		if (Boss.GetShackle().GetState() == EShackleState::Prying)
		{
			const FShackle& S = Boss.GetShackle();
			if (S.GetPryElapsed() >= S.GetCurrentTargetTime() - 0.5f * Dt && S.GetPryElapsed() < S.GetCurrentTargetTime() + 0.5f * Dt
				&& Rng.Roll(Skill))
			{
				const EPryResult R = Boss.InputPryBeat();
				if (R == EPryResult::BeatHit || R == EPryResult::Freed)
				{
					Drum.AddEvent(EDrumEvent::PryBeat);
					HitStop.Trigger(R == EPryResult::Freed ? Config.HitStop.PryReleaseDuration : Config.HitStop.PryBeatDuration);
				}
			}
			continue;
		}
		if (Boss.CanBeginPry())
		{
			REQUIRE(Boss.BeginPry());
			++Out.PryAttempts;
			Pending = nullptr;
			continue;
		}
		if (Boss.CanPerformFinisher())
		{
			REQUIRE(Boss.PerformFinisher());
			break;
		}

		// Boss attacks from the current phase moveset (not while staggered).
		if (Boss.GetPosture().IsStaggered())
		{
			Pending = nullptr;
			NextAttackAt = Time + 1.0f;
		}
		else if (Pending == nullptr && Time >= NextAttackAt && Boss.GetPhase() != nullptr)
		{
			const std::vector<std::string>& Moveset = Boss.GetPhase()->Moveset;
			const std::string& Id = Moveset[static_cast<std::size_t>(Rng.RangeInt(0, static_cast<int>(Moveset.size()) - 1))];
			for (const FEnemyAttack& A : BossConfig.Attacks)
			{
				Pending = A.Id == Id ? &A : Pending;
			}
			REQUIRE(Pending != nullptr);
			ImpactAt = Time + (Pending->Windup + Pending->Hold) * Boss.GetPhase()->TelegraphTimeMult / Difficulty.EnemySpeedMultiplier;
			bReactParry = !Pending->Attack.bUnparryable && Rng.Roll(0.6f);
			ReactAt = Rng.Roll(Skill) ? ImpactAt - (bReactParry ? 0.03125f : 0.09375f) : -1.0f; // else: no reaction
		}
		if (Pending != nullptr && ReactAt >= 0.0f && Time >= ReactAt && Runner.TryCancelForDefense())
		{
			if (bReactParry ? Defense.StartParry() : Defense.StartDodge())
			{
				ReactAt = -1.0f;
			}
		}
		if (Pending != nullptr && Time >= ImpactAt)
		{
			const EDefenseOutcome Result = Defense.ResolveIncoming(Pending->Attack);
			if (Result == EDefenseOutcome::PerfectParry || Result == EDefenseOutcome::Parried)
			{
				const bool bPerfect = Result == EDefenseOutcome::PerfectParry;
				const FParryExchange X = ComputeParryExchange(Pending->Attack, bPerfect, Config.Combat.Parry, Difficulty);
				Out.PostureBreaks += Boss.ReceivePostureDamage(X.AttackerPosture).bPostureBroken ? 1 : 0;
				Drum.AddEvent(bPerfect ? EDrumEvent::PerfectParry : EDrumEvent::Parry);
				if (bPerfect)
				{
					Runner.NotifyPerfectParry();
				}
			}
			else if (Result == EDefenseOutcome::PerfectDodge)
			{
				Drum.AddEvent(EDrumEvent::PerfectDodge);
				Runner.NotifyDodge();
			}
			else if (Result == EDefenseOutcome::Hit)
			{
				++Out.HitsTaken;
				Drum.OnHitTaken();
			}
			Pending = nullptr;
			NextAttackAt = Time + 1.5f + 0.5f * Rng.NextFloat01();
		}

		// Player offense: Hồi trống when full, otherwise light combos.
		if (!Defense.IsBusy() && !Runner.IsActing() && Drum.TrySurge())
		{
			FAttackData Burst;
			Burst.BaseDamage = Spear.Burst.DamageTotal;
			Burst.BasePostureDamage = Spear.Burst.PostureDamageTotal;
			Out.PostureBreaks += Boss.ReceivePlayerHit(Burst, Weapon).bPostureBroken ? 1 : 0;
		}
		if (!Defense.IsBusy() && !Runner.IsActing())
		{
			Runner.PressInput(Rng.Roll(0.2f) ? EInputType::Heavy : EInputType::Light);
		}
		const FComboTickResult T = Runner.Tick(GameDt);
		if (T.bHitWindowOpened)
		{
			const FAttackData& Move = Graph.GetMove(Runner.GetCurrentMove()).Attack;
			const FBossHitResult Hit = Boss.ReceivePlayerHit(Move, Weapon);
			Out.PostureBreaks += Hit.bPostureBroken ? 1 : 0;
			Drum.AddEvent(Move.Weight >= HitWeightHeavy ? EDrumEvent::HeavyHit : EDrumEvent::HitLanded);
			if (Hit.bPostureBroken)
			{
				Drum.AddEvent(EDrumEvent::PostureBreak);
			}
			HitStop.Trigger(ComputeHitStopDuration(Config.HitStop, Move.Weight));
		}
	}
	Out.Outcome = Boss.GetOutcome();
	Out.Seconds = Time;
	Out.Drops = Boss.GetOutcomeDrops();
	return Out;
}
} // namespace

TEST_SUITE("Config")
{
	TEST_CASE("default config is valid")
	{
		const std::vector<FError> E = ValidateConfig(FArpgConfig{});
		INFO(Dump(E));
		CHECK(E.empty());
	}

	TEST_CASE("each section reports its own errors")
	{
		FArpgConfig C;
		C.SchemaVersion = 2;
		C.Combat.Runner.InputBufferCapacity = 0;
		C.Combat.Dodge.IFrameEnd = 2.0f;
		C.Combat.Dodge.PerfectWindow = 5.0f;
		C.Combat.Parry.Window = 1.0f;
		C.Combat.Guard.DamageReduction = 2.0f;
		C.Player.MaxHealth = 0.0f;
		C.Player.HealRatio = 2.0f;
		FMovesetConfig Set;
		Set.WeaponId = "w";
		FComboMove Bad;
		Bad.Id = "m";
		Bad.Timing = FActionTiming{0, 0, 0, 0.3f, 0.1f};
		Bad.Attack.BaseDamage = -1.0f;
		Set.Moves = {Bad, Bad};
		Set.Combo = {FComboTransitionDef{"", EInputType::Light, 0, -1, "ghost"}};
		Set.Burst.Hits = 0;
		FMovesetConfig Orphan;
		Orphan.WeaponId = "no_weapon";
		C.Movesets = {Set, Orphan};
		C.Weapons = {FWeaponConfig{"w", -1, 1}, FWeaponConfig{"w", 1, 1}};
		FDifficultyConfig Diff;
		Diff.Id = "";
		Diff.ParryWindowScale = 0.0f;
		C.Difficulties = {Diff};
		C.DefaultDifficultyId = "missing";
		C.HitStop.Curve = {{1.0f, 0.1f}, {0.5f, -0.1f}};
		C.HitStop.MaxDuration = -1.0f;
		C.HitStop.TimeScaleDuringStop = 2.0f;
		C.Drum.Notches = 0;
		C.Drum.PointsPerNotch = 0.0f;
		FEnemyConfig Enemy;
		Enemy.Id = "crab";
		Enemy.MaxHealth = 0.0f;
		FEnemyAttack Pinch;
		Pinch.Id = "pinch";
		Pinch.Hits = 0;
		Pinch.Active = 0.0f;
		Enemy.Attacks = {Pinch};
		C.Enemies = {Enemy};
		FBossConfig B;
		B.Id = "boss";
		B.MaxHealth = 0.0f;
		B.Posture.PostureAfterStagger = 1.0f;
		B.Shackle.PryBeats = 0;
		B.Shackle.BeatHalfWindow = 1.0f;
		B.FreedDrops = {FMaterialAmount{"ghost_mat", 0}};
		FBossPhase P1;
		P1.Id = "p1";
		FBossPhase P2;
		P2.Id = "";
		P2.EnterHealthRatioAtMost = 2.0f;
		P2.SpeedMult = 0.0f;
		B.Phases = {P1, P2, FBossPhase{"p3", true, -1, -1.0f, -1.0f, 1.0f, 1.0f, 0.0f, {}}};
		FBossConfig Stuck = B;
		Stuck.Id = "stuck";
		Stuck.MaxHealth = 100.0f;
		Stuck.HealthFloor = 1.0f;
		Stuck.bHealthFloorForcesFinalStagger = false;
		Stuck.Shackle.bEnabled = false;
		Stuck.FreedDrops = {};
		Stuck.Phases.clear();
		FBossConfig NoFallback = Stuck;
		NoFallback.Id = "no_fallback";
		NoFallback.bHealthFloorForcesFinalStagger = true;
		NoFallback.FreedDrops = {FMaterialAmount{"ghost_mat", 1}};
		C.Bosses = {B, B, Stuck, NoFallback};
		C.Lineage.SkillRankRetention = -1.0f;
		C.Lineage.Characters = {FCharacterDef{"coi", 1, 1, {"spear_missing"}, 0, 0}};
		C.Crafting.Recipes.push_back(FRecipe{"r", "x", ERarity::Rare, {}, 0.0f});
		FSecretGraphDef BadSecret;
		BadSecret.Id = "s";
		C.Secrets = {BadSecret};

		const std::vector<FError> E = ValidateConfig(C);
		INFO(Dump(E));
		CHECK(HasError(E, "schema_version"));
		CHECK(HasError(E, "combat.input_buffer_capacity"));
		CHECK(HasError(E, "combat.dodge: requires"));
		CHECK(HasError(E, "combat.dodge.perfect_window"));
		CHECK(HasError(E, "combat.parry.duration"));
		CHECK(HasError(E, "combat.guard.damage_reduction"));
		CHECK(HasError(E, "player.max_health"));
		CHECK(HasError(E, "player.heal_ratio"));
		CHECK(HasError(E, "movesets[0].moves[0]: action must last > 0 s"));
		CHECK(HasError(E, "movesets[0].moves[0].cancel_start"));
		CHECK(HasError(E, "movesets[0].moves[0].damage"));
		CHECK(HasError(E, "movesets[0].moves[1].id: duplicate id"));
		CHECK(HasError(E, "movesets[0].moves[1].id: empty or duplicate move id"));
		CHECK(HasError(E, "movesets[0].combo[0].to: unknown move 'ghost'"));
		CHECK(HasError(E, "movesets[0].drum_burst.hits"));
		CHECK(HasError(E, "movesets[1].weapon_id: no weapon with this id"));
		CHECK(HasError(E, "weapons[0].damage_multiplier"));
		CHECK(HasError(E, "weapons[1].id: duplicate id"));
		CHECK(HasError(E, "difficulties[0].id: must not be empty"));
		CHECK(HasError(E, "difficulties[0].parry_window_scale"));
		CHECK(HasError(E, "difficulty.default: unknown difficulty"));
		CHECK(HasError(E, "hit_stop.curve[1].weight"));
		CHECK(HasError(E, "hit_stop.curve[1].duration"));
		CHECK(HasError(E, "hit_stop.max_duration"));
		CHECK(HasError(E, "hit_stop.time_scale_during_stop"));
		CHECK(HasError(E, "drum.notches"));
		CHECK(HasError(E, "drum.points_per_notch"));
		CHECK(HasError(E, "enemies[0].max_health"));
		CHECK(HasError(E, "enemies[0].attacks[0].hits"));
		CHECK(HasError(E, "enemies[0].attacks[0].active"));
		CHECK(HasError(E, "bosses[0].max_health"));
		CHECK(HasError(E, "bosses[0].health_floor"));
		CHECK(HasError(E, "bosses[0].posture.posture_after_stagger"));
		CHECK(HasError(E, "bosses[0].shackle.pry_beats"));
		CHECK(HasError(E, "bosses[0].shackle.beat_half_window"));
		CHECK(HasError(E, "bosses[0].freed_drops[0]: unknown material"));
		CHECK(HasError(E, "bosses[0].freed_drops[0].amount"));
		CHECK(HasError(E, "bosses[0].phases[1].id"));
		CHECK(HasError(E, "bosses[0].phases[1].enter.hp_ratio_at_most"));
		CHECK(HasError(E, "bosses[0].phases[1].speed_mult"));
		CHECK(HasError(E, "bosses[0].phases[2].enter: needs at least one condition"));
		CHECK(HasError(E, "bosses[1].id: duplicate id"));
		CHECK(HasError(E, "bosses[2]: health floor without shackle or forced final stagger"));
		CHECK(HasError(E, "bosses[3].fled_drops: a boss with drops needs fallback drops"));
		CHECK(HasError(E, "lineage.skill_rank_retention"));
		CHECK(HasError(E, "lineage.characters[0].start_weapons: unknown weapon"));
		CHECK(HasError(E, "crafting.recipes[0].inputs"));
		CHECK(HasError(E, "secrets[0].nodes: no ending node"));
	}

	TEST_CASE("ambiguous combo is reported through ValidateConfig")
	{
		FArpgConfig C;
		C.Weapons = {FWeaponConfig{"w", 1, 1}};
		FMovesetConfig Set;
		Set.WeaponId = "w";
		FComboMove A;
		A.Id = "a";
		FComboMove B;
		B.Id = "b";
		Set.Moves = {A, B};
		Set.Combo = {FComboTransitionDef{"", EInputType::Light, 0, -1, "a"}, FComboTransitionDef{"", EInputType::Light, 0, -1, "b"}};
		C.Movesets = {Set};
		CHECK(HasError(ValidateConfig(C), "movesets[0].combo: ambiguous"));
	}

	TEST_CASE("lookups")
	{
		const FArpgConfig C = LoadReal();
		CHECK(C.FindWeapon("wp_riu_xeo") != nullptr);
		CHECK(C.FindWeapon("sword") == nullptr);
		CHECK(C.FindMoveset("wp_riu_xeo") != nullptr);
		CHECK(C.FindMoveset("sword") == nullptr);
		CHECK(C.FindDifficulty("diff_nghe_chuyen") != nullptr);
		CHECK(C.FindDifficulty("nightmare") == nullptr);
		CHECK(C.FindEnemy("en_cua_cang_bun") != nullptr);
		CHECK(C.FindEnemy("ho_tinh") == nullptr);
		CHECK(C.FindBoss("boss_lon_loi_dam") != nullptr);
		CHECK(C.FindBoss("ho_tinh") == nullptr);
	}
}

TEST_SUITE("DesignData")
{
	TEST_CASE("the real design/data files load and map onto ArpgCore")
	{
		std::vector<FError> Warnings;
		const TResult<FArpgConfig> R = FDesignFiles().Load(&Warnings);
		INFO(R.ErrorSummary());
		REQUIRE(R.IsOk());
		const FArpgConfig& C = R.GetValue();
		CHECK(HasError(Warnings, "weapons[0].moves[4].charge: heavy charge levels are not modeled"));

		// combat_tuning
		CHECK(C.Combat.Runner.InputBufferWindow == Approx(0.15f));
		CHECK(C.Combat.ComboPauseThreshold == Approx(0.35f));
		CHECK(C.Combat.Dodge.IFrameEnd == Approx(0.25f));
		CHECK(C.Combat.Dodge.Recovery == Approx(0.15f));
		CHECK(C.Combat.Runner.AfterDodgeWindow == Approx(0.6f));
		CHECK(C.Combat.Runner.DefenseCancelDelay == Approx(0.1f));
		CHECK(C.Combat.Parry.Window == Approx(0.15f));
		CHECK(C.Combat.Parry.PerfectWindow == Approx(0.06f));
		CHECK(C.Combat.Parry.AttackerPostureFlatOnParry == Approx(20.0f));
		CHECK(C.Combat.Parry.AttackerPostureFlatOnPerfectParry == Approx(40.0f));
		CHECK(C.Combat.Runner.AfterPerfectParryWindow == Approx(0.6f));
		CHECK(C.Combat.Guard.DamageReduction == Approx(0.7f));
		CHECK(C.Player.MaxHealth == Approx(300.0f));
		CHECK(C.Player.Posture.StaggerDuration == Approx(1.2f));
		CHECK(C.Player.HealCharges == 4);
		CHECK(C.Drum.Notches == 4);
		CHECK(C.Drum.HeavyHitGain == Approx(15.0f));
		CHECK(C.Drum.PostureBreakGain == Approx(50.0f));
		CHECK(C.Drum.HitTakenLoss == Approx(30.0f));
		CHECK(C.Drum.SurgeCostNotches == 4);
		CHECK(ComputeHitStopDuration(C.HitStop, HitWeightMedium) == Approx(0.07f));
		CHECK(ComputeHitStopDuration(C.HitStop, HitWeightFinisher) == Approx(0.12f));
		CHECK(C.HitStop.PryReleaseDuration == Approx(0.12f));
		REQUIRE(C.Difficulties.size() == 4);
		CHECK(C.DefaultDifficultyId == "diff_cheo_do");
		CHECK(C.FindDifficulty("diff_nghe_chuyen")->bPryAuto);
		CHECK(C.FindDifficulty("diff_nghe_chuyen")->ParryWindowScale == Approx(2.0f));
		CHECK(C.FindDifficulty("diff_nguoc_nuoc")->DamageToPlayerMultiplier == Approx(1.4f));

		// weapons -> combo graphs
		REQUIRE(C.Movesets.size() == 2);
		const FMovesetConfig& Spear = *C.FindMoveset("wp_giao_dong");
		CHECK(Spear.Burst.Hits == 4);
		CHECK(FindTransitionTo(Spear, "sp_l1")->From.empty());
		CHECK(FindTransitionTo(Spear, "sp_l3")->From == "sp_l2");
		CHECK(FindTransitionTo(Spear, "sp_b1")->From == "sp_l2");
		CHECK(FindTransitionTo(Spear, "sp_b1")->MinDelay == Approx(0.35f));
		CHECK(FindTransitionTo(Spear, "sp_d1")->From == "@dodge");
		CHECK(FindTransitionTo(Spear, "sp_c1")->From == "@perfect_parry");
		CHECK(FindTransitionTo(Spear, "hm_chong_sao")->From == "@perfect_parry");
		const TResult<FComboGraph> Graph = BuildComboGraph(Spear);
		REQUIRE(Graph.IsOk());
		CHECK(Graph.GetValue().GetMove(Graph.GetValue().FindMove("sp_l4")).RequiredUnlock == "sk_vo_noi_don");
		CHECK(Graph.GetValue().GetMove(Graph.GetValue().FindMove("hm_chong_sao")).RequiredUnlock == "flag_boss_lon_loi_freed");

		// enemies
		CHECK(C.Enemies.size() == 3);
		CHECK(C.FindEnemy("en_cua_cang_bun")->Attacks[2].Attack.bUnparryable);
		CHECK(C.FindEnemy("en_u_bun")->Posture.MaxPosture == Approx(160.0f));
		const FBossConfig& Boar = *C.FindBoss("boss_lon_loi_dam");
		CHECK(Boar.MaxHealth == Approx(2000.0f));
		CHECK(Boar.HealthFloor == Approx(1.0f));
		CHECK(Boar.bHealthFloorForcesFinalStagger);
		REQUIRE(Boar.Phases.size() == 2);
		CHECK(Boar.Phases[1].EnterCracksAtLeast == 2);
		CHECK(Boar.Phases[1].EnterHealthRatioAtMost == Approx(0.5f));
		CHECK(Boar.Phases[1].MaxPosture == Approx(260.0f));
		CHECK(Boar.Shackle.bEnabled);
		CHECK(Boar.ShackleFeatureFlag == "feature_khoen");
		CHECK(Boar.Shackle.CracksToOpen == 3);
		CHECK(Boar.Shackle.PryBeats == 3);
		CHECK(Boar.Shackle.BeatInterval == Approx(60.0f / 84.0f));
		CHECK(Boar.Shackle.BeatHalfWindow == Approx(0.15f));
		CHECK(Boar.Shackle.MissRetriesPerBeat == 2);
		CHECK(Boar.Shackle.MissPostureRecoverFraction == Approx(0.5f));
		REQUIRE(Boar.FreedDrops.size() == 1);
		CHECK(Boar.FreedDrops[0].MaterialId == "mat_nanh_rung");
		CHECK(Boar.FledDrops.size() == 1);

		// items, lineage, secrets
		CHECK(C.Crafting.FindMaterial("mat_nanh_rung")->Category == EMaterialCategory::BossPart);
		CHECK(C.Crafting.FindRecipe("rcp_nanh_dam")->Rarity == ERarity::Rare);
		CHECK(C.Crafting.FindItem("bk_nanh_dam")->BaseLevel == 1);
		CHECK(C.Crafting.FindItem("bk_nanh_dam")->MaxLevel == 2);
		REQUIRE(C.Crafting.FindUpgradeRecipe("bk_nanh_dam", 2) != nullptr);
		CHECK(C.Crafting.FindUpgradeRecipe("bk_nanh_dam", 2)->Inputs.size() == 2); // the item itself is not an input
		CHECK(C.Lineage.SkillRankRetention == Approx(1.0f));
		CHECK(C.Lineage.Characters.size() == 2);
		CHECK(C.Lineage.SkillTree.Nodes.size() == 8);
		CHECK(C.Lineage.HouseMoves.size() == 1);
		REQUIRE(C.Secrets.size() == 1);
		CHECK(C.Secrets[0].Nodes[0].bIsStart);
		CHECK(C.Secrets[0].Nodes[1].HintKeys[2] == "secrets.sec_lo_bo_hoang.sn_trap_a.hint3");
	}

	TEST_CASE("the real secret chain has no softlock (ArpgCore checker) and can be finished with hints")
	{
		const FArpgConfig C = LoadReal();
		for (const FSecretGraphDef& Def : C.Secrets)
		{
			CAPTURE(Def.Id);
			const TResult<FSecretGraph> G = FSecretGraph::Create(Def);
			REQUIRE(G.IsOk());
			const FSoftlockReport Report = G.GetValue().CheckNoSoftlock();
			INFO(Dump(Report.Problems));
			CHECK(Report.bOk);
			CHECK(Report.bExhaustive);
			CHECK(Report.StatesExplored > 1);

			FSecretProgress P = G.GetValue().MakeInitialProgress();
			for (int Guard = 0; Guard < 20 && !G.GetValue().IsFinished(P); ++Guard)
			{
				const std::optional<std::string> Hint = G.GetValue().GetHint(P, 3);
				REQUIRE(Hint.has_value());
				const std::string NodeId = Hint->substr(std::string("secrets." + Def.Id + ".").size(),
					Hint->rfind(".hint") - std::string("secrets." + Def.Id + ".").size());
				REQUIRE(G.GetValue().Complete(P, NodeId).IsOk());
			}
			CHECK(G.GetValue().IsFinished(P));
		}
	}

	TEST_CASE("Lợn Lòi Đầm bot fights with real tuning always end (khoen on: Freed, off: Fled)")
	{
		const FArpgConfig C = LoadReal();
		for (const bool bKhoen : {true, false})
		{
			for (std::uint64_t Seed = 1; Seed <= 8; ++Seed)
			{
				CAPTURE(bKhoen);
				CAPTURE(Seed);
				const float Skill = 0.5f + 0.05f * static_cast<float>(Seed); // 55% .. 90% accuracy
				const FBotResult R = RunBossBot(C, bKhoen, Seed, C.DefaultDifficultyId, Skill);
				INFO("seconds=" << R.Seconds << " pries=" << R.PryAttempts << " breaks=" << R.PostureBreaks << " hits_taken=" << R.HitsTaken);
				CHECK(R.Outcome == (bKhoen ? EBossOutcome::Freed : EBossOutcome::Fled));
				REQUIRE(R.Drops.size() == 1);
				CHECK(R.Drops[0].MaterialId == "mat_nanh_rung");
				CHECK(R.Seconds < 20.0f * 60.0f);
				if (bKhoen)
				{
					CHECK(R.PryAttempts >= 1);
				}
			}
		}
		// Storyteller difficulty pries automatically.
		const FBotResult Story = RunBossBot(C, true, 99, "diff_nghe_chuyen", 0.0f);
		CHECK(Story.Outcome == EBossOutcome::Freed);
		CHECK(Story.PryAttempts == 1);
	}

	TEST_CASE("slice on real data: craft Nanh Đầm, upgrade with the secret reward, hand over Cói -> Bương")
	{
		const FArpgConfig C = LoadReal();
		FInventory Inv;
		Inv.Add("mat_nanh_rung", 1);
		Inv.Add("mat_dong_lo_lang", 1);
		Inv.Add("mat_day_may", 3);
		FRng Rng(2026);
		TResult<FItemInstance> Fang = Craft(C.Crafting, "rcp_nanh_dam", Inv, Rng, 1);
		REQUIRE(Fang.IsOk());
		CHECK(Fang.GetValue().UpgradeLevel == 1);
		CHECK(Fang.GetValue().Rarity == ERarity::Rare);
		CHECK_FALSE(Upgrade(C.Crafting, Fang.GetValue(), Inv).IsOk()); // needs Sáp ong cũ from the secret
		Inv.Add("mat_sap_ong_cu", 1);
		REQUIRE(Upgrade(C.Crafting, Fang.GetValue(), Inv).IsOk());
		CHECK(Fang.GetValue().UpgradeLevel == 2);

		FGeneration Coi = MakeFirstGeneration(*C.Lineage.FindCharacter("chr_coi"));
		REQUIRE(UnlockSkill(Coi.Skills, C.Lineage.SkillTree, "sk_vo_noi_don").IsOk());
		Coi.Skills.UnspentPoints += 2; // sp_boss_freed
		Coi.HouseMoves.insert("hm_chong_sao");
		Coi.Equipped.push_back(Fang.GetValue());
		const TResult<FGeneration> Buong = Handover(Coi, MakeHandoverRequest(*C.Lineage.FindCharacter("chr_buong")), C.Lineage);
		REQUIRE(Buong.IsOk());
		const FGeneration& B = Buong.GetValue();
		CHECK(B.HeirId == "chr_buong");
		CHECK(B.Weapons == std::vector<std::string>{"wp_giao_dong", "wp_riu_xeo"});
		CHECK(B.Skills.Ranks.count("sk_vo_noi_don") == 1);
		CHECK(B.Skills.UnspentPoints == 1 + 2 + 1); // 2 - 1 spent + 2 freed + 1 bonus
		CHECK(B.HouseMoves.count("hm_chong_sao") == 1);
		REQUIRE(B.Thap.size() == 1);
		CHECK(B.Thap[0].ItemId == "bk_nanh_dam");
		CHECK_FALSE(UnlockSkill(Coi.Skills, C.Lineage.SkillTree, "sk_vo_danh_the").IsOk()); // prereq missing
	}
}

TEST_SUITE("DesignDataLoader")
{
	TEST_CASE("malformed and non-object files")
	{
		FDesignFiles Files;
		Files.Text["items"] = ArpgCoreTest::ReadFixture("malformed.json");
		Files.Text["secrets"] = "[1, 2]";
		const std::vector<FError> E = LoadErrors(Files);
		INFO(Dump(E));
		CHECK(HasError(E, "items: malformed JSON"));
		CHECK(HasError(E, "secrets: expected object at root"));
	}

	TEST_CASE("missing fields and wrong types carry file-qualified paths")
	{
		FDesignFiles Files;
		Files.Edit("combat_tuning", [](FJson& J) {
			J["schema_version"] = 2;
			J["input"].erase("buffer_s");
			J["player"]["hp_max"] = "lots";
			J["dodge"]["iframe_start_s"] = 1e300;
			J["drum_rhythm"]["segments"] = 2.5;
			J["drum_rhythm"]["keeps_full_segments_on_hit"] = "yes";
			J["difficulty"]["presets"][0]["id"] = 7;
			J["guard"] = 3;
			J["pry"]["bpm"] = 0;
		});
		Files.Edit("lineage", [](FJson& J) {
			J["characters"][0]["start_weapons"] = {1};
			J["characters"][1]["generation"] = 99999999999LL;
			J["characters"][1]["weapon_slots"] = -99999999999LL;
			J["skill_tree"]["nodes"] = {1};
		});
		const std::vector<FError> E = LoadErrors(Files);
		INFO(Dump(E));
		CHECK(HasError(E, "combat_tuning.schema_version: unsupported schema version"));
		CHECK(HasError(E, "combat_tuning.input.buffer_s: missing required field"));
		CHECK(HasError(E, "combat_tuning.player.hp_max: expected number"));
		CHECK(HasError(E, "combat_tuning.dodge.iframe_start_s: number out of range"));
		CHECK(HasError(E, "combat_tuning.drum_rhythm.segments: expected integer"));
		CHECK(HasError(E, "combat_tuning.drum_rhythm.keeps_full_segments_on_hit: expected boolean"));
		CHECK(HasError(E, "combat_tuning.difficulty.presets[0].id: expected string"));
		CHECK(HasError(E, "combat_tuning.guard: expected object"));
		CHECK(HasError(E, "combat_tuning.pry.bpm: must be > 0"));
		CHECK(HasError(E, "lineage.characters[0].start_weapons[0]: expected string"));
		CHECK(HasError(E, "lineage.characters[1].generation: integer out of range"));
		CHECK(HasError(E, "lineage.characters[1].weapon_slots: integer out of range"));
		CHECK(HasError(E, "lineage.skill_tree.nodes[0]: expected object"));
	}

	TEST_CASE("design rules ArpgCore enforces: pry failure, shards, drops, inputs")
	{
		FDesignFiles Files;
		Files.Edit("combat_tuning", [](FJson& J) { J["pry"]["on_fail"] = "boss_recovers_all"; });
		Files.Edit("enemies", [](FJson& J) {
			FJson& B = Boss(J);
			B["khoen"]["on_pry_success"]["shard_handling"] = "becomes_item";
			B["khoen"]["on_pry_success"]["drops"][0]["chance"] = 0.5;
			B["khoen"]["pry_beats"] = 4;
			B["khoen"]["pry_condition"]["khoen_cracks_at_least"] = 5;
			B["khoen"]["crack_on"] = "hit";
			B["phases"][1]["enter"]["conditions"][0] = FJson{{"rage", 1}};
			B["phases"][0]["enter"]["type"] = "sometimes";
		});
		Files.Edit("weapons", [](FJson& J) {
			J["weapons"][0]["moves"][0]["hit_weight"] = "colossal";
			J["weapons"][0]["moves"][1]["chain_index"] = 7;
			J["weapons"][0]["moves"][5]["input"] = "L,H,pause,H";
			J["weapons"][0]["moves"][6]["input"] = "dodge,L,L";
			J["weapons"][1]["moves"][5]["input"] = "L,L,pause,dodge";
			J["weapons"][1]["moves"][6]["input"] = "H,H,H,H,L";
		});
		Files.Edit("items", [](FJson& J) {
			J["rarities"][0]["id"] = "mythic";
			J["recipes"][0]["type"] = "transmute";
			J["recipes"][1]["output"] = FJson::object();
		});
		Files.Edit("secrets", [](FJson& J) {
			J["chains"][0]["clues"][0]["consumable"] = true;
			J["locations"][1]["revisitable"] = false;
			J["chains"][0]["nodes"][1]["hints"][0]["tier"] = 4;
		});
		Files.Edit("lineage", [](FJson& J) { J["house_moves"][0]["unlock"]["type"] = "level"; });
		const std::vector<FError> E = LoadErrors(Files);
		INFO(Dump(E));
		CHECK(HasError(E, "combat_tuning.pry.on_fail: unsupported value 'boss_recovers_all'"));
		CHECK(HasError(E, "on_pry_success.shard_handling: unsupported value 'becomes_item'"));
		CHECK(HasError(E, "drops[0].chance: boss drops must be guaranteed"));
		CHECK(HasError(E, "khoen.pry_beats: must equal combat_tuning.pry.beats"));
		CHECK(HasError(E, "khoen_cracks_at_least: more cracks than crack_stages"));
		CHECK(HasError(E, "khoen.crack_on: unsupported value 'hit'"));
		CHECK(HasError(E, "unknown phase condition"));
		CHECK(HasError(E, "enter.type: unknown value 'sometimes'"));
		CHECK(HasError(E, "weapons[0].moves[0].hit_weight: unknown value 'colossal'"));
		CHECK(HasError(E, "weapons[0].moves[1].chain_index: no move with chain_index 6"));
		CHECK(HasError(E, "weapons[0].moves[5].input: unsupported input sequence 'L,H,pause,H'"));
		CHECK(HasError(E, "weapons[0].moves[6].input: unsupported input sequence 'dodge,L,L'"));
		CHECK(HasError(E, "weapons[1].moves[5].input: must end with L or H"));
		CHECK(HasError(E, "weapons[1].moves[6].input: no chain move for prefix"));
		CHECK(HasError(E, "items.rarities[0].id: unknown value 'mythic'"));
		CHECK(HasError(E, "items.recipes[0].type: unknown value 'transmute'"));
		CHECK(HasError(E, "items.recipes[1].output.item: missing required field"));
		CHECK(HasError(E, "secrets.chains[0].clues[0].consumable: clues are never consumed"));
		CHECK(HasError(E, "location: node placed where the player cannot return"));
		CHECK(HasError(E, "hints[0].tier: must be 1..3"));
		CHECK(HasError(E, "lineage.house_moves[0].unlock.type: unsupported value 'level'"));
	}

	TEST_CASE("semantic errors from ValidateConfig surface through the loader")
	{
		FDesignFiles Files;
		Files.Edit("combat_tuning", [](FJson& J) { J["guard"]["perfect_parry_window_s"] = 0.5; });
		Files.Edit("enemies", [](FJson& J) {
			FJson& B = Boss(J);
			B.erase("khoen");
			B["hp_floor_forces_final_stagger"] = false;
		});
		Files.Edit("secrets", [](FJson& J) { J["chains"][0]["nodes"][5]["requires"]["all"] = {"clue_vet_bay", "clue_never"}; });
		Files.Edit("items", [](FJson& J) { J["recipes"][0]["inputs"].erase(0); });
		const std::vector<FError> E = LoadErrors(Files);
		INFO(Dump(E));
		CHECK(HasError(E, "combat.parry.perfect_window"));
		CHECK(HasError(E, "health floor without shackle or forced final stagger"));
		CHECK(HasError(E, "clue 'clue_never' is never granted"));
		CHECK(HasError(E, "needs a part shed by a freed boss"));
	}

	TEST_CASE("optional sections and defaults")
	{
		FDesignFiles Files;
		Files.Edit("combat_tuning", [](FJson& J) { J.erase("healing"); });
		Files.Edit("enemies", [](FJson& J) { J["enemies"][0].erase("stagger_duration_s"); });
		const TResult<FArpgConfig> R = Files.Load();
		INFO(R.ErrorSummary());
		REQUIRE(R.IsOk());
		CHECK(R.GetValue().Player.HealCharges == 4); // default kept
		CHECK(R.GetValue().Enemies[0].Posture.StaggerDuration == Approx(2.5f)); // from enemy_the_defaults
	}
}
#endif
