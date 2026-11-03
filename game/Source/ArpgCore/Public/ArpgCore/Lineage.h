// Lineage.h - Inheritance between generations of the ferry family (design: lineage.json).
// Handover keeps the skill tree (100% by default), weapons and house moves ("Đòn nhà"), records the
// previous primary moveset as a family moveset, and moves owned Bảo khí into the family jar ("Thạp"),
// grouped by generation; later generations can take them out again.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/ComboGraph.h"
#include "ArpgCore/Crafting.h"
#include "ArpgCore/Result.h"

#include <map>
#include <set>
#include <string>
#include <vector>

namespace ArpgCore
{
struct FSkillTree
{
	std::map<std::string, int> Ranks; // skill node id -> rank (1 = unlocked)
	int UnspentPoints = 0;
};

struct FSkillBranchDef
{
	std::string Id;
	bool bAvailable = true; // e.g. the Vảy branch is locked in the demo
};

struct FSkillNodeDef
{
	std::string Id;
	std::string Branch;
	int Cost = 1;
	std::vector<std::string> Prereqs;
	std::string EffectType; // applied by the game layer (e.g. "drum_gain_bonus")
	float EffectValue = 0.0f;
};

struct FSkillTreeDef
{
	std::vector<FSkillBranchDef> Branches;
	std::vector<FSkillNodeDef> Nodes;

	const FSkillNodeDef* FindNode(const std::string& Id) const;
};

/** Unknown branches/prereqs, non-positive cost, prerequisite cycles. */
ARPGCORE_API std::vector<FError> ValidateSkillTree(const FSkillTreeDef& Def);
ARPGCORE_API bool CanUnlockSkill(const FSkillTree& Tree, const FSkillTreeDef& Def, const std::string& NodeId);
/** Spends Cost points and sets rank 1. Fails without side effects. */
ARPGCORE_API FStatus UnlockSkill(FSkillTree& Tree, const FSkillTreeDef& Def, const std::string& NodeId);

/** A move of the family ("Đòn nhà"), usable with every weapon once unlocked. */
struct FHouseMoveDef
{
	std::string Id;
	std::string LearnedBy;   // character id
	std::string UnlockFlag;  // flag that unlocks it (becomes FComboMove::RequiredUnlock)
	std::string Input;       // design input string, e.g. "perfect_parry,H"
	FComboMove Move;
	bool bInheritable = true;
};

struct FCharacterDef
{
	std::string Id;
	int Generation = 1;
	int WeaponSlots = 1;
	std::vector<std::string> StartWeapons;
	int StartSkillPoints = 0;
	int BonusSkillPointsOnHandoff = 0;
};

struct FLineageConfig
{
	float SkillRankRetention = 1.0f; // fraction of each rank kept (floor); design value = 1.0 (100%)
	int MaxFamilyMovesets = 3;       // oldest dropped first when exceeded
	bool bStoreEquippedInThap = true;
	bool bCarryWeapons = true;
	bool bCarryHouseMoves = true;
	FSkillTreeDef SkillTree;
	std::vector<FCharacterDef> Characters;
	std::vector<FHouseMoveDef> HouseMoves;

	const FCharacterDef* FindCharacter(const std::string& Id) const;
};

struct FGeneration
{
	int Index = 1;                 // 1 = first heir
	std::string HeirId;            // data id of the character
	std::string PrimaryMovesetId;  // moveset (weapon) of the current main style
	std::vector<std::string> FamilyMovesets; // previous primary movesets, oldest first
	std::vector<std::string> Weapons;        // weapon ids owned
	int WeaponSlots = 1;
	std::set<std::string> HouseMoves;        // learned house move ids
	FSkillTree Skills;
	std::vector<FItemInstance> Equipped;
	std::vector<FItemInstance> Thap; // sorted by OriginGeneration (stable)
};

struct FHandoverRequest
{
	std::string NextHeirId;
	std::string NextPrimaryMovesetId;
	std::vector<std::string> NextStartWeapons;
	int NextWeaponSlots = 0;       // 0 = keep the previous count
	int BonusSkillPoints = 0;
};

/** First generation from a character definition. */
ARPGCORE_API FGeneration MakeFirstGeneration(const FCharacterDef& Character);
/** Handover request for the next character definition (its first start weapon is the primary moveset). */
ARPGCORE_API FHandoverRequest MakeHandoverRequest(const FCharacterDef& Next);

/** Produces the next generation. Fails on empty ids or an invalid config. Pure function. */
ARPGCORE_API TResult<FGeneration> Handover(const FGeneration& Previous, const FHandoverRequest& Request,
	const FLineageConfig& Config);

/** Moves the item at ThapIndex from the Thạp to Equipped. */
ARPGCORE_API FStatus TakeFromThap(FGeneration& Generation, std::size_t ThapIndex);

ARPGCORE_API std::vector<FError> ValidateLineageConfig(const FLineageConfig& Config);
} // namespace ArpgCore
