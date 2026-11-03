// Crafting.cpp
#include "ArpgCore/Crafting.h"

#include <set>

namespace ArpgCore
{
namespace
{
std::string Idx(const std::string& Path, std::size_t Index)
{
	return Path + "[" + std::to_string(Index) + "]";
}

/** Shared checks for a material reference used as a cost/input. */
void CheckMaterialRef(const FCraftingDatabase& Db, const std::string& MaterialId, int Amount, bool bAllowZero,
	const std::string& Path, std::vector<FError>& Errors)
{
	const FMaterialDef* Def = Db.FindMaterial(MaterialId);
	if (Def == nullptr)
	{
		Errors.push_back(FError{Path, "unknown material '" + MaterialId + "'"});
	}
	else if (Def->Category == EMaterialCategory::ShackleFragment)
	{
		Errors.push_back(FError{Path, "shackle fragment '" + MaterialId + "' cannot be used: it grants no power"});
	}
	if (Amount < 0 || (!bAllowZero && Amount == 0))
	{
		Errors.push_back(FError{Path, bAllowZero ? "amount must be >= 0" : "amount must be > 0"});
	}
}
} // namespace

const FMaterialDef* FCraftingDatabase::FindMaterial(const std::string& Id) const
{
	for (const FMaterialDef& Def : Materials)
	{
		if (Def.Id == Id)
		{
			return &Def;
		}
	}
	return nullptr;
}

const FRecipe* FCraftingDatabase::FindRecipe(const std::string& Id) const
{
	for (const FRecipe& Recipe : Recipes)
	{
		if (Recipe.Id == Id)
		{
			return &Recipe;
		}
	}
	return nullptr;
}

void FInventory::Add(const std::string& MaterialId, int Amount)
{
	if (Amount > 0)
	{
		Counts[MaterialId] += Amount;
	}
}

int FInventory::Count(const std::string& MaterialId) const
{
	const auto It = Counts.find(MaterialId);
	return It == Counts.end() ? 0 : It->second;
}

bool FInventory::HasAll(const std::vector<FMaterialAmount>& Costs) const
{
	std::map<std::string, int> Needed;
	for (const FMaterialAmount& Cost : Costs)
	{
		Needed[Cost.MaterialId] += Cost.Amount;
	}
	for (const auto& [Id, Amount] : Needed)
	{
		if (Count(Id) < Amount)
		{
			return false;
		}
	}
	return true;
}

bool FInventory::RemoveAll(const std::vector<FMaterialAmount>& Costs)
{
	if (!HasAll(Costs))
	{
		return false;
	}
	for (const FMaterialAmount& Cost : Costs)
	{
		Counts[Cost.MaterialId] -= Cost.Amount;
		if (Counts[Cost.MaterialId] == 0)
		{
			Counts.erase(Cost.MaterialId);
		}
	}
	return true;
}

std::vector<FError> ValidateCraftingDatabase(const FCraftingDatabase& Db)
{
	std::vector<FError> Errors;
	std::set<std::string> Seen;
	for (std::size_t I = 0; I < Db.Materials.size(); ++I)
	{
		const FMaterialDef& Def = Db.Materials[I];
		const std::string Path = Idx("materials", I);
		if (Def.Id.empty())
		{
			Errors.push_back(FError{Path + ".id", "must not be empty"});
		}
		else if (!Seen.insert(Def.Id).second)
		{
			Errors.push_back(FError{Path + ".id", "duplicate material '" + Def.Id + "'"});
		}
	}

	Seen.clear();
	for (std::size_t I = 0; I < Db.Recipes.size(); ++I)
	{
		const FRecipe& Recipe = Db.Recipes[I];
		const std::string Path = Idx("recipes", I);
		if (Recipe.Id.empty())
		{
			Errors.push_back(FError{Path + ".id", "must not be empty"});
		}
		else if (!Seen.insert(Recipe.Id).second)
		{
			Errors.push_back(FError{Path + ".id", "duplicate recipe '" + Recipe.Id + "'"});
		}
		if (Recipe.ResultItemId.empty())
		{
			Errors.push_back(FError{Path + ".result", "must not be empty"});
		}
		if (Recipe.Inputs.empty())
		{
			Errors.push_back(FError{Path + ".inputs", "must not be empty"});
		}
		for (std::size_t J = 0; J < Recipe.Inputs.size(); ++J)
		{
			CheckMaterialRef(Db, Recipe.Inputs[J].MaterialId, Recipe.Inputs[J].Amount, false, Idx(Path + ".inputs", J), Errors);
		}
		if (!(Recipe.BonusRarityChance >= 0.0f && Recipe.BonusRarityChance <= 1.0f))
		{
			Errors.push_back(FError{Path + ".bonus_rarity_chance", "must be in [0, 1]"});
		}
	}

	if (Db.Upgrade.MaxLevel < 0)
	{
		Errors.push_back(FError{"upgrade.max_level", "must be >= 0"});
	}
	for (std::size_t I = 0; I < Db.Upgrade.Terms.size(); ++I)
	{
		const FUpgradeCostTerm& Term = Db.Upgrade.Terms[I];
		const std::string Path = Idx("upgrade.terms", I);
		CheckMaterialRef(Db, Term.MaterialId, Term.BaseAmount, true, Path, Errors);
		if (Term.AmountPerLevel < 0)
		{
			Errors.push_back(FError{Path + ".amount_per_level", "must be >= 0"});
		}
	}
	for (std::size_t I = 0; I < RarityCount; ++I)
	{
		if (Db.Upgrade.RarityCostPercent[I] < 0)
		{
			Errors.push_back(FError{Idx("upgrade.rarity_cost_percent", I), "must be >= 0"});
		}
	}
	return Errors;
}

std::vector<FMaterialAmount> GetUpgradeCost(const FUpgradeConfig& Config, ERarity Rarity, int CurrentLevel)
{
	std::vector<FMaterialAmount> Costs;
	const long long Percent = Config.RarityCostPercent[static_cast<std::size_t>(Rarity)];
	const long long Level = CurrentLevel < 0 ? 0 : CurrentLevel;
	for (const FUpgradeCostTerm& Term : Config.Terms)
	{
		const long long Raw = (static_cast<long long>(Term.BaseAmount) + static_cast<long long>(Term.AmountPerLevel) * Level) * Percent;
		const long long Amount = Raw <= 0 ? 0 : (Raw + 99) / 100; // ceil
		if (Amount > 0)
		{
			Costs.push_back(FMaterialAmount{Term.MaterialId, static_cast<int>(Amount)});
		}
	}
	return Costs;
}

TResult<FItemInstance> Craft(const FCraftingDatabase& Db, const std::string& RecipeId, FInventory& Inventory, FRng& Rng,
	int Generation)
{
	const FRecipe* Recipe = Db.FindRecipe(RecipeId);
	if (Recipe == nullptr)
	{
		return TResult<FItemInstance>::Fail(FError{"recipe", "unknown recipe '" + RecipeId + "'"});
	}
	std::vector<FError> Errors;
	for (std::size_t J = 0; J < Recipe->Inputs.size(); ++J)
	{
		CheckMaterialRef(Db, Recipe->Inputs[J].MaterialId, Recipe->Inputs[J].Amount, false, Idx("inputs", J), Errors);
	}
	if (Recipe->Inputs.empty())
	{
		Errors.push_back(FError{"inputs", "recipe has no inputs"});
	}
	if (!Errors.empty())
	{
		return TResult<FItemInstance>::Fail(std::move(Errors));
	}
	if (!Inventory.RemoveAll(Recipe->Inputs))
	{
		return TResult<FItemInstance>::Fail(FError{"inventory", "missing materials for '" + RecipeId + "'"});
	}

	FItemInstance Item;
	Item.ItemId = Recipe->ResultItemId;
	Item.Rarity = Recipe->Rarity;
	Item.OriginGeneration = Generation;
	if (Recipe->BonusRarityChance > 0.0f && Rng.Roll(Recipe->BonusRarityChance) && Item.Rarity < ERarity::Legendary)
	{
		// Divine ("Thần khí") only comes from secret chains, never from a roll.
		Item.Rarity = static_cast<ERarity>(static_cast<int>(Item.Rarity) + 1);
	}
	return TResult<FItemInstance>::Ok(std::move(Item));
}

FStatus Upgrade(const FCraftingDatabase& Db, FItemInstance& Item, FInventory& Inventory)
{
	if (Item.UpgradeLevel >= Db.Upgrade.MaxLevel)
	{
		return FStatus::Fail(FError{"upgrade", "already at max level"});
	}
	const std::vector<FMaterialAmount> Costs = GetUpgradeCost(Db.Upgrade, Item.Rarity, Item.UpgradeLevel);
	if (!Inventory.RemoveAll(Costs))
	{
		return FStatus::Fail(FError{"inventory", "missing upgrade materials"});
	}
	++Item.UpgradeLevel;
	return OkStatus();
}
} // namespace ArpgCore
