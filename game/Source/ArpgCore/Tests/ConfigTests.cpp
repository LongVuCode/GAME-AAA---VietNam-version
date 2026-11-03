// ConfigTests.cpp - Semantic validation, JSON loader (fixtures), and an end-to-end integration run.
#if defined(ARPGCORE_STANDALONE_TESTS)
#include "TestCommon.h"

#include "ArpgCore/BossEncounter.h"
#include "ArpgCore/ComboGraph.h"
#include "ArpgCore/Config.h"
#include "ArpgCore/ConfigLoader.h"
#include "ArpgCore/Defense.h"
#include "ArpgCore/DrumMeter.h"
#include "ArpgCore/HitStop.h"
#include "ArpgCore/Lineage.h"
#include "ArpgCore/Rng.h"
#include "ArpgCore/SecretGraph.h"

#include <string>
#include <vector>

using namespace ArpgCore;
using doctest::Approx;

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

FArpgConfig LoadValid()
{
	std::vector<FError> Warnings;
	const TResult<FArpgConfig> R = LoadConfigFromJson(ArpgCoreTest::ReadFixture("valid_config.json"), &Warnings);
	INFO(R.ErrorSummary());
	REQUIRE(R.IsOk());
	CHECK(Warnings.empty());
	return R.GetValue();
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
		C.Combat.Moves.push_back(FComboMove{"m", FActionTiming{0, 0, 0, 0.3f, 0.1f}, FAttackData{-1, 1, 1, false, false}});
		C.Combat.Moves.push_back(FComboMove{"m", {}, {}});
		C.Combat.Combo.push_back(FComboTransitionDef{"", EInputType::Light, 0, -1, "ghost"});
		C.Combat.Dodge.IFrameEnd = 2.0f;
		C.Combat.Dodge.PerfectWindow = 5.0f;
		C.Combat.Parry.Window = 1.0f;
		C.Weapons = {FWeaponConfig{"w", -1, 1}, FWeaponConfig{"w", 1, 1}};
		C.Difficulties = {FDifficultyConfig{"", 1, 1, 1, 0, 1}};
		C.HitStop.Curve = {{1.0f, 0.1f}, {0.5f, -0.1f}};
		C.HitStop.MaxDuration = -1.0f;
		C.HitStop.TimeScaleDuringStop = 2.0f;
		C.Drum.Notches = 0;
		C.Drum.PointsPerNotch = 0.0f;
		FBossConfig Boss;
		Boss.Id = "boss";
		Boss.MaxHealth = 0.0f;
		Boss.Posture.PostureAfterStagger = 1.0f;
		Boss.Shackle.PryBeats = 0;
		Boss.Shackle.BeatHalfWindow = 1.0f;
		Boss.FreedDrops = {FMaterialAmount{"ghost_mat", 0}};
		C.Bosses = {Boss, Boss};
		C.Lineage.SkillRankRetention = -1.0f;
		C.Crafting.Recipes.push_back(FRecipe{"r", "x", ERarity::Rare, {}, 0.0f});
		FSecretGraphDef Bad;
		Bad.Id = "s";
		C.Secrets = {Bad};

		const std::vector<FError> E = ValidateConfig(C);
		INFO(Dump(E));
		CHECK(HasError(E, "schema_version"));
		CHECK(HasError(E, "combat.input_buffer_capacity"));
		CHECK(HasError(E, "combat.moves[0]: action must last > 0 s"));
		CHECK(HasError(E, "combat.moves[0].cancel_start"));
		CHECK(HasError(E, "combat.moves[0].damage"));
		CHECK(HasError(E, "combat.moves[1].id: duplicate id"));
		CHECK(HasError(E, "combat.moves[1].id: empty or duplicate move id"));
		CHECK(HasError(E, "combat.combo[0].to: unknown move 'ghost'"));
		CHECK(HasError(E, "combat.dodge: requires"));
		CHECK(HasError(E, "combat.dodge.perfect_window"));
		CHECK(HasError(E, "combat.parry.duration"));
		CHECK(HasError(E, "weapons[0].damage_multiplier"));
		CHECK(HasError(E, "weapons[1].id: duplicate id"));
		CHECK(HasError(E, "difficulties[0].id: must not be empty"));
		CHECK(HasError(E, "difficulties[0].parry_window_scale"));
		CHECK(HasError(E, "hit_stop.curve[1].weight"));
		CHECK(HasError(E, "hit_stop.curve[1].duration"));
		CHECK(HasError(E, "hit_stop.max_duration"));
		CHECK(HasError(E, "hit_stop.time_scale_during_stop"));
		CHECK(HasError(E, "drum.notches"));
		CHECK(HasError(E, "drum.points_per_notch"));
		CHECK(HasError(E, "bosses[0].max_health"));
		CHECK(HasError(E, "bosses[0].health_floor_while_shackled"));
		CHECK(HasError(E, "bosses[0].posture.posture_after_stagger"));
		CHECK(HasError(E, "bosses[0].shackle.pry_beats"));
		CHECK(HasError(E, "bosses[0].shackle.beat_half_window"));
		CHECK(HasError(E, "bosses[0].freed_drops[0]: unknown material"));
		CHECK(HasError(E, "bosses[0].freed_drops[0].amount"));
		CHECK(HasError(E, "bosses[1].id: duplicate id"));
		CHECK(HasError(E, "lineage.skill_rank_retention"));
		CHECK(HasError(E, "crafting.recipes[0].inputs"));
		CHECK(HasError(E, "secrets[0].nodes: no ending node"));
	}

	TEST_CASE("ambiguous combo is reported through ValidateConfig")
	{
		FArpgConfig C;
		C.Combat.Moves = {FComboMove{"a", {}, {}}, FComboMove{"b", {}, {}}};
		C.Combat.Combo = {FComboTransitionDef{"", EInputType::Light, 0, -1, "a"}, FComboTransitionDef{"", EInputType::Light, 0, -1, "b"}};
		CHECK(HasError(ValidateConfig(C), "combat.combo: ambiguous"));
	}

	TEST_CASE("lookups")
	{
		const FArpgConfig C = LoadValid();
		CHECK(C.FindWeapon("pole") != nullptr);
		CHECK(C.FindWeapon("sword") == nullptr);
		CHECK(C.FindDifficulty("story") != nullptr);
		CHECK(C.FindDifficulty("nightmare") == nullptr);
		CHECK(C.FindBoss("lon_loi_dam") != nullptr);
		CHECK(C.FindBoss("ho_tinh") == nullptr);
	}
}

TEST_SUITE("ConfigLoader")
{
	TEST_CASE("valid fixture loads every section")
	{
		const FArpgConfig C = LoadValid();
		CHECK(C.Combat.Runner.InputBufferWindow == Approx(0.25f));
		CHECK(C.Combat.Runner.ChainLinkWindow == Approx(0.5f));
		REQUIRE(C.Combat.Moves.size() == 6);
		CHECK(C.Combat.Moves[4].Id == "heavy_1");
		CHECK(C.Combat.Moves[4].Timing.CancelStart == Approx(0.5625f));
		CHECK(C.Combat.Moves[4].Attack.Weight == Approx(3.0f));
		CHECK(C.Combat.Combo.size() == 6);
		CHECK(C.Combat.Combo[3].MinDelay == Approx(0.45f));
		CHECK(C.Combat.Dodge.IFrameStart == Approx(0.0625f));
		CHECK(C.Combat.Parry.PerfectWindow == Approx(0.0625f));
		CHECK(C.Weapons.size() == 2);
		CHECK(C.FindWeapon("pole")->PostureMultiplier == Approx(1.25f));
		CHECK(C.Difficulties.size() == 3);
		CHECK(C.FindDifficulty("normal")->DamageToPlayerMultiplier == Approx(1.0f)); // defaults kept
		CHECK(C.FindDifficulty("story")->PryBeatWindowScale == Approx(1.5f));
		CHECK(C.HitStop.Curve.size() == 3);
		CHECK(C.HitStop.MaxDuration == Approx(0.15f));
		CHECK(C.Drum.Notches == 4);
		const FBossConfig* Boss = C.FindBoss("lon_loi_dam");
		REQUIRE(Boss != nullptr);
		CHECK(Boss->Posture.MaxPosture == Approx(120.0f));
		CHECK(Boss->Shackle.CracksToOpen == 2);
		CHECK(Boss->Shackle.bEnabled);
		CHECK(Boss->FreedDrops.size() == 1);
		CHECK(C.Lineage.MaxFamilyMovesets == 3);
		CHECK(C.Crafting.Materials.size() == 4);
		CHECK(C.Crafting.FindMaterial("khoen_shard")->Category == EMaterialCategory::ShackleFragment);
		CHECK(C.Crafting.Recipes[0].Rarity == ERarity::Rare);
		CHECK(C.Crafting.Upgrade.RarityCostPercent[static_cast<std::size_t>(ERarity::Legendary)] == 200);
		REQUIRE(C.Secrets.size() == 1);
		CHECK(C.Secrets[0].Nodes[3].bIsEnding);
		CHECK(C.Secrets[0].Nodes[3].HintKeys[2] == "hint.demo.cache.3");
		CHECK(BuildComboGraph(C.Combat).IsOk());
	}

	TEST_CASE("malformed JSON is an error value, not an exception")
	{
		const TResult<FArpgConfig> R = LoadConfigFromJson(ArpgCoreTest::ReadFixture("malformed.json"));
		CHECK_FALSE(R.IsOk());
		CHECK(R.ErrorSummary().find("malformed JSON") != std::string::npos);
		CHECK_FALSE(LoadConfigFromJson("").IsOk());
		const TResult<FArpgConfig> NotObject = LoadConfigFromJson("[1, 2]");
		CHECK(NotObject.ErrorSummary().find("<root>: expected object") != std::string::npos);
	}

	TEST_CASE("type errors carry JSON paths")
	{
		const TResult<FArpgConfig> R = LoadConfigFromJson(ArpgCoreTest::ReadFixture("wrong_types.json"));
		REQUIRE_FALSE(R.IsOk());
		const std::vector<FError>& E = R.GetErrors();
		INFO(Dump(E));
		CHECK(HasError(E, "combat.input_buffer_capacity: must be >= 1"));
		CHECK(HasError(E, "combat.moves[0].startup: expected number"));
		CHECK(HasError(E, "combat.moves[1].id: missing required string"));
		CHECK(HasError(E, "combat.combo[0].input: unknown value 'kick' (allowed: light, heavy)"));
		CHECK(HasError(E, "combat.dodge: expected object"));
		CHECK(HasError(E, "weapons: expected array"));
		CHECK(HasError(E, "bosses[0].shackle.enabled: expected boolean"));
		CHECK(HasError(E, "bosses[0].shackle.cracks_to_open: expected integer"));
		CHECK(HasError(E, "crafting.recipes[0].rarity: unknown value 'mythic'"));
		CHECK(HasError(E, "crafting.recipes[0].inputs[0]: expected object"));
		CHECK(HasError(E, "secrets[0].initial_clues[0]: expected string"));
		CHECK(HasError(E, "secrets[0].nodes[0].hints: at most 3 hint tiers"));
	}

	TEST_CASE("semantic errors: windows, shackle fragment reward, softlocked secret")
	{
		const TResult<FArpgConfig> R = LoadConfigFromJson(ArpgCoreTest::ReadFixture("semantic_errors.json"));
		REQUIRE_FALSE(R.IsOk());
		const std::vector<FError>& E = R.GetErrors();
		INFO(Dump(E));
		CHECK(HasError(E, "combat.parry.perfect_window"));
		CHECK(HasError(E, "bosses[0].shackle.beat_half_window"));
		CHECK(HasError(E, "bosses[0].freed_drops[0]: shackle fragments are never a reward"));
		CHECK(HasError(E, "secrets[0].trap: softlock"));
	}

	TEST_CASE("unknown keys warn; partial config keeps defaults; numeric ranges")
	{
		std::vector<FError> Warnings;
		const TResult<FArpgConfig> R = LoadConfigFromJson(
			R"({"drum": {"notches": 5, "colour": "red"}, "extra": 1, "hit_stop": {"curve": []}})", &Warnings);
		REQUIRE(R.IsOk());
		CHECK(R.GetValue().Drum.Notches == 5);
		CHECK(R.GetValue().Drum.PointsPerNotch == Approx(100.0f));
		CHECK(R.GetValue().HitStop.Curve.empty());
		CHECK(HasError(Warnings, "drum.colour: unknown key"));
		CHECK(HasError(Warnings, "extra: unknown key"));

		const TResult<FArpgConfig> Big = LoadConfigFromJson(
			R"({"drum": {"notches": 99999999999, "points_per_notch": 1e300}, "lineage": {"max_family_movesets": -99999999999}, "crafting": {"upgrade": {"max_level": 18446744073709551615}}})");
		REQUIRE_FALSE(Big.IsOk());
		CHECK(HasError(Big.GetErrors(), "drum.notches: integer out of range"));
		CHECK(HasError(Big.GetErrors(), "drum.points_per_notch: number out of range"));
		CHECK(HasError(Big.GetErrors(), "lineage.max_family_movesets: integer out of range"));
		CHECK(HasError(Big.GetErrors(), "crafting.upgrade.max_level: integer out of range"));

		const TResult<FArpgConfig> Missing = LoadConfigFromJson(R"({"crafting": {"materials": [{"id": "x"}]}, "bosses": [{}]})");
		CHECK(HasError(Missing.GetErrors(), "crafting.materials[0].category: missing required string"));
		CHECK(HasError(Missing.GetErrors(), "bosses[0].id: missing required string"));

		const TResult<FArpgConfig> Unsigned = LoadConfigFromJson(R"({"drum": {"notches": 6}, "schema_version": 1})");
		REQUIRE(Unsigned.IsOk());
		CHECK(Unsigned.GetValue().Drum.Notches == 6);
	}
}

TEST_SUITE("Integration")
{
	TEST_CASE("fixture-driven slice: combo the boar, pry the khoen, craft, hand over, finish a secret")
	{
		const FArpgConfig Config = LoadValid();
		const FWeaponConfig& Pole = *Config.FindWeapon("pole");
		const FDifficultyConfig& Normal = *Config.FindDifficulty("normal");
		const TResult<FComboGraph> GraphResult = BuildComboGraph(Config.Combat);
		REQUIRE(GraphResult.IsOk());
		const FComboGraph& Graph = GraphResult.GetValue();

		FComboRunner Runner(Graph, Config.Combat.Runner);
		FBossEncounter Boss(*Config.FindBoss("lon_loi_dam"), Normal);
		FDrumMeter Drum(Config.Drum);
		FHitStopClock HitStop(Config.HitStop.TimeScaleDuringStop);
		FDefenseController Defense(Config.Combat.Dodge, Config.Combat.Parry, Normal.ParryWindowScale);

		// The boar attacks once: a perfect parry chips its posture and fills the drum.
		REQUIRE(Defense.StartParry());
		FAttackData Charge;
		Charge.BasePostureDamage = 30.0f;
		const EDefenseOutcome Outcome = Defense.ResolveIncoming(Charge);
		CHECK(Outcome == EDefenseOutcome::PerfectParry);
		const FParryExchange Exchange = ComputeParryExchange(Charge, true, Config.Combat.Parry, Normal);
		Boss.ReceivePostureDamage(Exchange.AttackerPosture);
		Drum.AddEvent(EDrumEvent::PerfectParry);
		HitStop.Trigger(ComputeHitStopDuration(Config.HitStop, 1.0f, true));

		int Hits = 0;
		int Steps = 0;
		bool bPressedThisMove = false;
		while (Boss.GetOutcome() == EBossOutcome::InProgress && Steps < 64 * 120)
		{
			++Steps;
			const float GameDt = HitStop.Advance(ArpgCoreTest::Dt);
			Drum.Tick(GameDt);
			Defense.Tick(GameDt);
			Boss.Tick(GameDt);

			if (Boss.GetShackle().GetState() == EShackleState::Prying)
			{
				const FShackle& S = Boss.GetShackle();
				if (S.GetPryElapsed() >= S.GetBeatTime(S.GetBeatsHit()) - 1e-6f)
				{
					Boss.InputPryBeat();
				}
				continue;
			}
			if (Boss.CanBeginPry())
			{
				REQUIRE(Boss.BeginPry());
				continue;
			}

			if (!Runner.IsActing() && !bPressedThisMove)
			{
				Runner.PressInput(EInputType::Light);
				bPressedThisMove = true;
			}
			const FComboTickResult T = Runner.Tick(GameDt);
			if (T.StartedMove != FComboGraph::RootNode)
			{
				bPressedThisMove = false;
			}
			if (T.bHitWindowOpened)
			{
				const FAttackData& Move = Graph.GetMove(Runner.GetCurrentMove()).Attack;
				Boss.ReceivePlayerHit(Move, Pole);
				Drum.AddEvent(EDrumEvent::HitLanded);
				HitStop.Trigger(ComputeHitStopDuration(Config.HitStop, Move.Weight));
				++Hits;
			}
		}
		INFO("hits=" << Hits << " steps=" << Steps);
		REQUIRE(Boss.GetOutcome() == EBossOutcome::Freed);
		CHECK(Boss.GetHealth() >= 1.0f);
		CHECK(Drum.GetPoints() > 0.0f);

		// Freed drops -> craft the boar Bảo khí (shackle shards are never part of it).
		FInventory Inventory;
		for (const FMaterialAmount& Drop : Boss.GetFreedDrops())
		{
			Inventory.Add(Drop.MaterialId, Drop.Amount);
		}
		Inventory.Add("bronze", 10);
		Inventory.Add("reed_fiber", 10);
		FRng Rng(2026);
		TResult<FItemInstance> Item = Craft(Config.Crafting, "giap_da_lon", Inventory, Rng, 1);
		REQUIRE(Item.IsOk());
		REQUIRE(Upgrade(Config.Crafting, Item.GetValue(), Inventory).IsOk());
		CHECK(Item.GetValue().UpgradeLevel == 1);

		// Hand over to the next generation: the armor goes to the Thạp.
		FGeneration Coi;
		Coi.HeirId = "coi";
		Coi.PrimaryMovesetId = "pole";
		Coi.Skills.Ranks = {{"vo_combo_1", 1}};
		Coi.Equipped = {Item.GetValue()};
		const TResult<FGeneration> Next = Handover(Coi, FHandoverRequest{"buong", "axe"}, Config.Lineage);
		REQUIRE(Next.IsOk());
		CHECK(Next.GetValue().Thap.size() == 1);
		CHECK(Next.GetValue().FamilyMovesets == std::vector<std::string>{"pole"});

		// Secret chain from data: follow tier-3 hints to the end.
		const TResult<FSecretGraph> Secret = FSecretGraph::Create(Config.Secrets[0]);
		REQUIRE(Secret.IsOk());
		FSecretProgress Progress = Secret.GetValue().MakeInitialProgress();
		for (int Guard = 0; Guard < 10 && !Secret.GetValue().IsFinished(Progress); ++Guard)
		{
			const std::vector<std::string> Available = Secret.GetValue().GetAvailableNodes(Progress);
			REQUIRE_FALSE(Available.empty());
			REQUIRE(Secret.GetValue().GetHint(Progress, 3).has_value());
			REQUIRE(Secret.GetValue().Complete(Progress, Available.front()).IsOk());
		}
		CHECK(Secret.GetValue().IsFinished(Progress));
	}
}
#endif
