// ProgressionTests.cpp - Lineage handover, crafting / upgrades, deterministic RNG.
#if defined(ARPGCORE_STANDALONE_TESTS)
#include "TestCommon.h"

#include "ArpgCore/Crafting.h"
#include "ArpgCore/Lineage.h"
#include "ArpgCore/Rng.h"

#include <string>
#include <vector>

using namespace ArpgCore;

namespace
{
FGeneration MakeFirstGeneration()
{
	FGeneration G;
	G.Index = 1;
	G.HeirId = "coi";
	G.PrimaryMovesetId = "pole";
	G.Skills.Ranks = {{"vo_1", 3}, {"trong_1", 2}, {"vay_1", 1}};
	G.Skills.UnspentPoints = 4;
	G.Equipped = {FItemInstance{"dao_nanh", ERarity::Rare, 3, 0}};
	return G;
}

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

FCraftingDatabase MakeDb()
{
	FCraftingDatabase Db;
	Db.Materials = {{"boar_hide", EMaterialCategory::BossPart}, {"bronze", EMaterialCategory::Bronze},
		{"reed", EMaterialCategory::Regional}, {"khoen_shard", EMaterialCategory::ShackleFragment}};
	Db.Recipes = {FRecipe{"giap_da_lon", "giap_da_lon", ERarity::Rare, {{"boar_hide", 1}, {"bronze", 2}}, 0.0f}};
	Db.Upgrade.MaxLevel = 2;
	Db.Upgrade.Terms = {FUpgradeCostTerm{"bronze", 2, 1}, FUpgradeCostTerm{"reed", 1, 0}};
	return Db;
}
} // namespace

TEST_SUITE("Lineage")
{
	TEST_CASE("handover keeps skills, stores the old moveset and Bảo khí")
	{
		const FGeneration First = MakeFirstGeneration();
		const TResult<FGeneration> Second = Handover(First, FHandoverRequest{"buong", "axe"}, FLineageConfig{});
		REQUIRE(Second.IsOk());
		const FGeneration& G2 = Second.GetValue();
		CHECK(G2.Index == 2);
		CHECK(G2.HeirId == "buong");
		CHECK(G2.PrimaryMovesetId == "axe");
		CHECK(G2.Skills.Ranks == First.Skills.Ranks); // 100%
		CHECK(G2.Skills.UnspentPoints == 4);
		CHECK(G2.FamilyMovesets == std::vector<std::string>{"pole"});
		CHECK(G2.Equipped.empty());
		REQUIRE(G2.Thap.size() == 1);
		CHECK(G2.Thap[0].ItemId == "dao_nanh");
		CHECK(G2.Thap[0].OriginGeneration == 1);
		CHECK(G2.Thap[0].UpgradeLevel == 3);

		FGeneration G2Mutable = G2;
		G2Mutable.Equipped.push_back(FItemInstance{"vong_xuong", ERarity::Rare, 0, 2});
		const TResult<FGeneration> Third = Handover(G2Mutable, FHandoverRequest{"nua", "twin_knives"}, FLineageConfig{});
		REQUIRE(Third.IsOk());
		CHECK(Third.GetValue().FamilyMovesets == std::vector<std::string>{"pole", "axe"});
		REQUIRE(Third.GetValue().Thap.size() == 2);
		CHECK(Third.GetValue().Thap[0].OriginGeneration == 1);
		CHECK(Third.GetValue().Thap[1].OriginGeneration == 2);
	}

	TEST_CASE("family movesets: dedupe, never equal to the new primary, capped oldest-first")
	{
		FGeneration G = MakeFirstGeneration();
		G.FamilyMovesets = {"spear", "pole", "axe"};
		FLineageConfig Config;
		Config.MaxFamilyMovesets = 2;
		const TResult<FGeneration> Next = Handover(G, FHandoverRequest{"heir", "axe"}, Config);
		REQUIRE(Next.IsOk());
		// {"spear","pole","axe"} -> move "pole" to the end -> drop "axe" (new primary) -> cap 2.
		CHECK(Next.GetValue().FamilyMovesets == std::vector<std::string>{"spear", "pole"});

		Config.MaxFamilyMovesets = 0;
		CHECK(Handover(G, FHandoverRequest{"heir", "axe"}, Config).GetValue().FamilyMovesets.empty());
	}

	TEST_CASE("retention parameter and keeping equipment")
	{
		FLineageConfig Config;
		Config.SkillRankRetention = 0.5f;
		Config.bStoreEquippedInThap = false;
		const TResult<FGeneration> Next = Handover(MakeFirstGeneration(), FHandoverRequest{"heir", "axe"}, Config);
		REQUIRE(Next.IsOk());
		const std::map<std::string, int> Expected{{"vo_1", 1}, {"trong_1", 1}};
		CHECK(Next.GetValue().Skills.Ranks == Expected);
		CHECK(Next.GetValue().Equipped.size() == 1);
		CHECK(Next.GetValue().Thap.empty());
	}

	TEST_CASE("invalid requests and config fail without throwing")
	{
		FLineageConfig Bad;
		Bad.SkillRankRetention = 1.5f;
		Bad.MaxFamilyMovesets = -1;
		const TResult<FGeneration> R = Handover(MakeFirstGeneration(), FHandoverRequest{"", ""}, Bad);
		CHECK_FALSE(R.IsOk());
		CHECK(R.GetErrors().size() == 4);
		CHECK(R.ErrorSummary().find("next_heir_id") != std::string::npos);
	}

	TEST_CASE("take from Thạp")
	{
		FGeneration G = Handover(MakeFirstGeneration(), FHandoverRequest{"buong", "axe"}, FLineageConfig{}).GetValue();
		CHECK_FALSE(TakeFromThap(G, 5).IsOk());
		REQUIRE(TakeFromThap(G, 0).IsOk());
		CHECK(G.Thap.empty());
		REQUIRE(G.Equipped.size() == 1);
		CHECK(G.Equipped[0].ItemId == "dao_nanh");
	}
}

TEST_SUITE("Crafting")
{
	TEST_CASE("valid database and validation errors")
	{
		CHECK(ValidateCraftingDatabase(MakeDb()).empty());

		FCraftingDatabase Db = MakeDb();
		Db.Materials.push_back({"bronze", EMaterialCategory::Bronze});
		Db.Materials.push_back({"", EMaterialCategory::Other});
		Db.Recipes.push_back(FRecipe{"shard_charm", "charm", ERarity::Rare, {{"khoen_shard", 1}}, 0.0f});
		Db.Recipes.push_back(FRecipe{"giap_da_lon", "", ERarity::Rare, {}, 2.0f});
		Db.Recipes.push_back(FRecipe{"", "x", ERarity::Rare, {{"unknown", 0}}, 0.0f});
		Db.Upgrade.MaxLevel = -1;
		Db.Upgrade.Terms.push_back(FUpgradeCostTerm{"khoen_shard", -1, -1});
		Db.Upgrade.RarityCostPercent[0] = -5;
		const std::vector<FError> E = ValidateCraftingDatabase(Db);
		CHECK(HasError(E, "duplicate material 'bronze'"));
		CHECK(HasError(E, "materials[5].id: must not be empty"));
		CHECK(HasError(E, "recipes[1].inputs[0]: shackle fragment 'khoen_shard' cannot be used"));
		CHECK(HasError(E, "duplicate recipe 'giap_da_lon'"));
		CHECK(HasError(E, "recipes[2].result: must not be empty"));
		CHECK(HasError(E, "recipes[2].inputs: must not be empty"));
		CHECK(HasError(E, "bonus_rarity_chance"));
		CHECK(HasError(E, "recipes[3].id: must not be empty"));
		CHECK(HasError(E, "unknown material 'unknown'"));
		CHECK(HasError(E, "amount must be > 0"));
		CHECK(HasError(E, "upgrade.max_level"));
		CHECK(HasError(E, "upgrade.terms[2]: amount must be >= 0"));
		CHECK(HasError(E, "upgrade.terms[2].amount_per_level"));
		CHECK(HasError(E, "rarity_cost_percent[0]"));
	}

	TEST_CASE("craft consumes materials atomically")
	{
		const FCraftingDatabase Db = MakeDb();
		FInventory Inv;
		FRng Rng(7);
		Inv.Add("boar_hide", 1);
		Inv.Add("bronze", 1);
		Inv.Add("bronze", -5); // ignored
		const TResult<FItemInstance> Fail = Craft(Db, "giap_da_lon", Inv, Rng);
		CHECK_FALSE(Fail.IsOk());
		CHECK(Inv.Count("boar_hide") == 1);
		CHECK(Inv.Count("bronze") == 1);

		Inv.Add("bronze", 1);
		const TResult<FItemInstance> Ok = Craft(Db, "giap_da_lon", Inv, Rng, 1);
		REQUIRE(Ok.IsOk());
		CHECK(Ok.GetValue().ItemId == "giap_da_lon");
		CHECK(Ok.GetValue().Rarity == ERarity::Rare);
		CHECK(Ok.GetValue().OriginGeneration == 1);
		CHECK(Inv.Count("boar_hide") == 0);
		CHECK(Inv.Count("bronze") == 0);

		CHECK_FALSE(Craft(Db, "nope", Inv, Rng).IsOk());
	}

	TEST_CASE("shackle fragments can never be crafted into power")
	{
		FCraftingDatabase Db = MakeDb();
		Db.Recipes.push_back(FRecipe{"shard_charm", "charm", ERarity::Legendary, {{"khoen_shard", 1}}, 0.0f});
		Db.Recipes.push_back(FRecipe{"empty", "x", ERarity::Common, {}, 0.0f});
		FInventory Inv;
		Inv.Add("khoen_shard", 5);
		FRng Rng(1);
		const TResult<FItemInstance> R = Craft(Db, "shard_charm", Inv, Rng);
		CHECK_FALSE(R.IsOk());
		CHECK(R.ErrorSummary().find("grants no power") != std::string::npos);
		CHECK(Inv.Count("khoen_shard") == 5);
		CHECK_FALSE(Craft(Db, "empty", Inv, Rng).IsOk());
	}

	TEST_CASE("upgrade cost formula and max level")
	{
		const FCraftingDatabase Db = MakeDb();
		// Rare = 150 %: level 0 -> bronze ceil(2 * 1.5) = 3, reed ceil(1 * 1.5) = 2.
		std::vector<FMaterialAmount> Cost = GetUpgradeCost(Db.Upgrade, ERarity::Rare, 0);
		REQUIRE(Cost.size() == 2);
		CHECK(Cost[0].Amount == 3);
		CHECK(Cost[1].Amount == 2);
		Cost = GetUpgradeCost(Db.Upgrade, ERarity::Rare, 3); // (2 + 3) * 1.5 = 7.5 -> 8
		CHECK(Cost[0].Amount == 8);
		Cost = GetUpgradeCost(Db.Upgrade, ERarity::Common, -4); // negative level treated as 0
		CHECK(Cost[0].Amount == 2);

		FItemInstance Item{"giap_da_lon", ERarity::Rare, 0, 1};
		FInventory Inv;
		CHECK_FALSE(Upgrade(Db, Item, Inv).IsOk());
		CHECK(Item.UpgradeLevel == 0);
		Inv.Add("bronze", 100);
		Inv.Add("reed", 100);
		REQUIRE(Upgrade(Db, Item, Inv).IsOk());
		REQUIRE(Upgrade(Db, Item, Inv).IsOk());
		CHECK(Item.UpgradeLevel == 2);
		CHECK(Inv.Count("bronze") == 100 - 3 - 5); // level 1: ceil(3 * 1.5) = 5
		const FStatus AtMax = Upgrade(Db, Item, Inv);
		CHECK_FALSE(AtMax.IsOk());
		CHECK(AtMax.ErrorSummary().find("max level") != std::string::npos);
	}

	TEST_CASE("zero-cost terms are skipped")
	{
		FUpgradeConfig U;
		U.Terms = {FUpgradeCostTerm{"bronze", 0, 0}};
		CHECK(GetUpgradeCost(U, ERarity::Common, 5).empty());
	}

	TEST_CASE("bonus rarity roll is deterministic per seed and never reaches Divine")
	{
		FCraftingDatabase Db = MakeDb();
		Db.Recipes[0].BonusRarityChance = 0.5f;
		Db.Recipes.push_back(FRecipe{"legend", "legend", ERarity::Legendary, {{"bronze", 1}}, 1.0f});
		auto RunBatch = [&Db](std::uint64_t Seed) {
			FRng Rng(Seed);
			FInventory Inv;
			Inv.Add("boar_hide", 100);
			Inv.Add("bronze", 300);
			std::vector<ERarity> Out;
			for (int I = 0; I < 50; ++I)
			{
				Out.push_back(Craft(Db, "giap_da_lon", Inv, Rng).GetValue().Rarity);
			}
			Out.push_back(Craft(Db, "legend", Inv, Rng).GetValue().Rarity);
			return Out;
		};
		const std::vector<ERarity> A = RunBatch(42);
		CHECK(A == RunBatch(42));
		CHECK(A != RunBatch(43));
		int Upgraded = 0;
		for (int I = 0; I < 50; ++I)
		{
			Upgraded += A[static_cast<std::size_t>(I)] == ERarity::Legendary ? 1 : 0;
		}
		CHECK(Upgraded > 10);
		CHECK(Upgraded < 40);
		CHECK(A.back() == ERarity::Legendary);
	}

	TEST_CASE("inventory aggregates repeated costs")
	{
		FInventory Inv;
		Inv.Add("bronze", 3);
		const std::vector<FMaterialAmount> Costs{{"bronze", 2}, {"bronze", 2}};
		CHECK_FALSE(Inv.HasAll(Costs));
		CHECK_FALSE(Inv.RemoveAll(Costs));
		CHECK(Inv.Count("bronze") == 3);
		CHECK(Inv.Count("missing") == 0);
	}
}

TEST_SUITE("Rng")
{
	TEST_CASE("SplitMix64 reference value and determinism")
	{
		FRng Zero(0);
		CHECK(Zero.NextU64() == 0xE220A8397B1DCDAFull); // published SplitMix64 output for seed 0
		FRng A(123);
		FRng B(123);
		for (int I = 0; I < 100; ++I)
		{
			CHECK(A.NextU64() == B.NextU64());
		}
		CHECK(A.GetState() == B.GetState());
	}

	TEST_CASE("ranges")
	{
		FRng R(9);
		for (int I = 0; I < 1000; ++I)
		{
			const float F = R.NextFloat01();
			CHECK(F >= 0.0f);
			CHECK(F < 1.0f);
			const int V = R.RangeInt(-3, 3);
			CHECK(V >= -3);
			CHECK(V <= 3);
		}
		CHECK(R.RangeInt(5, 5) == 5);
		CHECK(R.RangeInt(5, 1) == 5);
		CHECK_FALSE(R.Roll(0.0f));
		CHECK(R.Roll(1.0f));
	}
}
#endif
