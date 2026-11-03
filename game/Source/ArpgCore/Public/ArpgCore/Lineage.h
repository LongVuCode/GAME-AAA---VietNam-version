// Lineage.h - Inheritance between generations of the ferry family: the skill tree carries over
// (100% by default), the previous moveset becomes a family moveset ("Đòn nhà"), and owned Bảo khí
// go into the family storage jar ("Thạp"), ordered by generation.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/Crafting.h"
#include "ArpgCore/Result.h"

#include <map>
#include <string>
#include <vector>

namespace ArpgCore
{
struct FSkillTree
{
	std::map<std::string, int> Ranks; // skill node id -> rank
	int UnspentPoints = 0;
};

struct FLineageConfig
{
	float SkillRankRetention = 1.0f; // fraction of each rank kept (floor); design value = 1.0 (100%)
	int MaxFamilyMovesets = 3;       // oldest dropped first when exceeded
	bool bStoreEquippedInThap = true;
};

struct FGeneration
{
	int Index = 1;                 // 1 = first heir
	std::string HeirId;            // data id of the character
	std::string PrimaryMovesetId;  // moveset of the current weapon style
	std::vector<std::string> FamilyMovesets; // "Đòn nhà", oldest first
	FSkillTree Skills;
	std::vector<FItemInstance> Equipped;
	std::vector<FItemInstance> Thap; // sorted by OriginGeneration (stable)
};

struct FHandoverRequest
{
	std::string NextHeirId;
	std::string NextPrimaryMovesetId;
};

/** Produces the next generation. Fails on empty ids or an invalid config. Pure function. */
ARPGCORE_API TResult<FGeneration> Handover(const FGeneration& Previous, const FHandoverRequest& Request,
	const FLineageConfig& Config);

/** Moves the item at ThapIndex from the Thạp to Equipped. */
ARPGCORE_API FStatus TakeFromThap(FGeneration& Generation, std::size_t ThapIndex);

ARPGCORE_API std::vector<FError> ValidateLineageConfig(const FLineageConfig& Config);
} // namespace ArpgCore
