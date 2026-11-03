// Lineage.cpp
#include "ArpgCore/Lineage.h"

#include <algorithm>
#include <cmath>

namespace ArpgCore
{
std::vector<FError> ValidateLineageConfig(const FLineageConfig& Config)
{
	std::vector<FError> Errors;
	if (!(Config.SkillRankRetention >= 0.0f && Config.SkillRankRetention <= 1.0f))
	{
		Errors.push_back(FError{"skill_rank_retention", "must be in [0, 1]"});
	}
	if (Config.MaxFamilyMovesets < 0)
	{
		Errors.push_back(FError{"max_family_movesets", "must be >= 0"});
	}
	return Errors;
}

TResult<FGeneration> Handover(const FGeneration& Previous, const FHandoverRequest& Request, const FLineageConfig& Config)
{
	std::vector<FError> Errors = ValidateLineageConfig(Config);
	if (Request.NextHeirId.empty())
	{
		Errors.push_back(FError{"next_heir_id", "must not be empty"});
	}
	if (Request.NextPrimaryMovesetId.empty())
	{
		Errors.push_back(FError{"next_primary_moveset_id", "must not be empty"});
	}
	if (!Errors.empty())
	{
		return TResult<FGeneration>::Fail(std::move(Errors));
	}

	FGeneration Next;
	Next.Index = Previous.Index + 1;
	Next.HeirId = Request.NextHeirId;
	Next.PrimaryMovesetId = Request.NextPrimaryMovesetId;

	// Skill tree ("Nghề nhà").
	Next.Skills.UnspentPoints = Previous.Skills.UnspentPoints;
	for (const auto& [NodeId, Rank] : Previous.Skills.Ranks)
	{
		const int Kept = Config.SkillRankRetention >= 1.0f
			? Rank
			: static_cast<int>(std::floor(static_cast<float>(Rank) * Config.SkillRankRetention));
		if (Kept > 0)
		{
			Next.Skills.Ranks[NodeId] = Kept;
		}
	}

	// Family movesets ("Đòn nhà"): previous primary appended, newest last, no duplicates.
	Next.FamilyMovesets = Previous.FamilyMovesets;
	if (!Previous.PrimaryMovesetId.empty())
	{
		std::erase(Next.FamilyMovesets, Previous.PrimaryMovesetId);
		Next.FamilyMovesets.push_back(Previous.PrimaryMovesetId);
	}
	std::erase(Next.FamilyMovesets, Next.PrimaryMovesetId);
	const std::size_t MaxFamily = static_cast<std::size_t>(Config.MaxFamilyMovesets);
	if (Next.FamilyMovesets.size() > MaxFamily)
	{
		Next.FamilyMovesets.erase(Next.FamilyMovesets.begin(),
			Next.FamilyMovesets.begin() + static_cast<std::ptrdiff_t>(Next.FamilyMovesets.size() - MaxFamily));
	}

	// Bảo khí -> Thạp.
	Next.Thap = Previous.Thap;
	if (Config.bStoreEquippedInThap)
	{
		for (FItemInstance Item : Previous.Equipped)
		{
			if (Item.OriginGeneration <= 0)
			{
				Item.OriginGeneration = Previous.Index;
			}
			Next.Thap.push_back(std::move(Item));
		}
	}
	else
	{
		Next.Equipped = Previous.Equipped;
	}
	std::stable_sort(Next.Thap.begin(), Next.Thap.end(),
		[](const FItemInstance& A, const FItemInstance& B) { return A.OriginGeneration < B.OriginGeneration; });
	return TResult<FGeneration>::Ok(std::move(Next));
}

FStatus TakeFromThap(FGeneration& Generation, std::size_t ThapIndex)
{
	if (ThapIndex >= Generation.Thap.size())
	{
		return FStatus::Fail(FError{"thap", "index out of range"});
	}
	Generation.Equipped.push_back(Generation.Thap[ThapIndex]);
	Generation.Thap.erase(Generation.Thap.begin() + static_cast<std::ptrdiff_t>(ThapIndex));
	return OkStatus();
}
} // namespace ArpgCore
