// Crafting.h - Materials, Bảo khí recipes, rarity, +N upgrades with integer cost formula, and a
// deterministic (seeded) bonus-rarity roll. Shackle fragments are never valid crafting inputs.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/Result.h"
#include "ArpgCore/Rng.h"

#include <array>
#include <cstdint>
#include <map>
#include <string>
#include <vector>

namespace ArpgCore
{
/** Thường → Tốt → Quý → Hiếm → Huyền thoại → Thần khí (GDD §6). */
enum class ERarity : std::uint8_t
{
	Common,
	Good,
	Precious,
	Rare,
	Legendary,
	Divine,
};
inline constexpr std::size_t RarityCount = 6;

enum class EMaterialCategory : std::uint8_t
{
	BossPart,        // shed by a freed boss
	Bronze,
	Regional,
	ShackleFragment, // "mảnh khoen": story-only, grants no power (VERDICT §3)
	Other,
};

struct FMaterialDef
{
	std::string Id;
	EMaterialCategory Category = EMaterialCategory::Other;
};

struct FMaterialAmount
{
	std::string MaterialId;
	int Amount = 1;
};

struct FRecipe
{
	std::string Id;
	std::string ResultItemId;
	ERarity Rarity = ERarity::Rare;
	std::vector<FMaterialAmount> Inputs;
	/** Chance (0..1) to roll one rarity tier higher. Never rolls into Divine. */
	float BonusRarityChance = 0.0f;
};

/** Cost of one material for going from level L to L+1: ceil((Base + PerLevel * L) * RarityPercent / 100). */
struct FUpgradeCostTerm
{
	std::string MaterialId;
	int BaseAmount = 1;
	int AmountPerLevel = 1;
};

struct FUpgradeConfig
{
	int MaxLevel = 10;
	std::vector<FUpgradeCostTerm> Terms;
	std::array<int, RarityCount> RarityCostPercent{100, 100, 125, 150, 200, 250};
};

struct FCraftingDatabase
{
	std::vector<FMaterialDef> Materials;
	std::vector<FRecipe> Recipes;
	FUpgradeConfig Upgrade;

	const FMaterialDef* FindMaterial(const std::string& Id) const;
	const FRecipe* FindRecipe(const std::string& Id) const;
};

/** One crafted Bảo khí instance. */
struct FItemInstance
{
	std::string ItemId;
	ERarity Rarity = ERarity::Common;
	int UpgradeLevel = 0;
	int OriginGeneration = 0; // lineage generation that crafted / owned it first
};

class ARPGCORE_API FInventory
{
public:
	void Add(const std::string& MaterialId, int Amount);
	int Count(const std::string& MaterialId) const;
	bool HasAll(const std::vector<FMaterialAmount>& Costs) const;
	/** Removes all costs atomically; returns false and changes nothing if any is missing. */
	bool RemoveAll(const std::vector<FMaterialAmount>& Costs);

private:
	std::map<std::string, int> Counts;
};

/** Duplicate ids, unknown materials, non-positive amounts, shackle fragments used as input, etc. */
ARPGCORE_API std::vector<FError> ValidateCraftingDatabase(const FCraftingDatabase& Db);

ARPGCORE_API std::vector<FMaterialAmount> GetUpgradeCost(const FUpgradeConfig& Config, ERarity Rarity, int CurrentLevel);

ARPGCORE_API TResult<FItemInstance> Craft(const FCraftingDatabase& Db, const std::string& RecipeId,
	FInventory& Inventory, FRng& Rng, int Generation = 0);

/** Upgrades by one level, spending materials. Fails without side effects. */
ARPGCORE_API FStatus Upgrade(const FCraftingDatabase& Db, FItemInstance& Item, FInventory& Inventory);
} // namespace ArpgCore
