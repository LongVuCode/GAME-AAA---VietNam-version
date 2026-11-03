// Lineage.cpp
#include "ArpgCore/Lineage.h"

#include <algorithm>
#include <cmath>
#include <functional>

namespace ArpgCore
{
const FSkillNodeDef* FSkillTreeDef::FindNode(const std::string& Id) const
{
	for (const FSkillNodeDef& Node : Nodes)
	{
		if (Node.Id == Id)
		{
			return &Node;
		}
	}
	return nullptr;
}

const FCharacterDef* FLineageConfig::FindCharacter(const std::string& Id) const
{
	for (const FCharacterDef& Character : Characters)
	{
		if (Character.Id == Id)
		{
			return &Character;
		}
	}
	return nullptr;
}

std::vector<FError> ValidateSkillTree(const FSkillTreeDef& Def)
{
	std::vector<FError> Errors;
	std::set<std::string> Branches;
	for (const FSkillBranchDef& Branch : Def.Branches)
	{
		if (Branch.Id.empty() || !Branches.insert(Branch.Id).second)
		{
			Errors.push_back(FError{"skill_tree.branches", "empty or duplicate branch '" + Branch.Id + "'"});
		}
	}
	std::set<std::string> Ids;
	for (std::size_t I = 0; I < Def.Nodes.size(); ++I)
	{
		const FSkillNodeDef& Node = Def.Nodes[I];
		const std::string Path = "skill_tree.nodes[" + std::to_string(I) + "]";
		if (Node.Id.empty() || !Ids.insert(Node.Id).second)
		{
			Errors.push_back(FError{Path + ".id", "empty or duplicate skill '" + Node.Id + "'"});
		}
		if (Branches.count(Node.Branch) == 0)
		{
			Errors.push_back(FError{Path + ".branch", "unknown branch '" + Node.Branch + "'"});
		}
		if (Node.Cost <= 0)
		{
			Errors.push_back(FError{Path + ".cost", "must be > 0"});
		}
		for (const std::string& Prereq : Node.Prereqs)
		{
			if (Def.FindNode(Prereq) == nullptr)
			{
				Errors.push_back(FError{Path + ".prereqs", "unknown skill '" + Prereq + "'"});
			}
		}
	}
	// Cycle detection (DFS colors).
	std::map<std::string, int> Color;
	std::function<bool(const FSkillNodeDef&)> HasCycle = [&](const FSkillNodeDef& Node) {
		int& C = Color[Node.Id];
		if (C == 1)
		{
			return true;
		}
		if (C == 2)
		{
			return false;
		}
		C = 1;
		for (const std::string& Prereq : Node.Prereqs)
		{
			const FSkillNodeDef* P = Def.FindNode(Prereq);
			if (P != nullptr && HasCycle(*P))
			{
				return true;
			}
		}
		Color[Node.Id] = 2;
		return false;
	};
	for (const FSkillNodeDef& Node : Def.Nodes)
	{
		if (Color[Node.Id] == 0 && HasCycle(Node))
		{
			Errors.push_back(FError{"skill_tree", "prerequisite cycle through '" + Node.Id + "'"});
			break;
		}
	}
	return Errors;
}

bool CanUnlockSkill(const FSkillTree& Tree, const FSkillTreeDef& Def, const std::string& NodeId)
{
	const FSkillNodeDef* Node = Def.FindNode(NodeId);
	if (Node == nullptr || Tree.Ranks.count(NodeId) != 0 || Tree.UnspentPoints < Node->Cost)
	{
		return false;
	}
	for (const FSkillBranchDef& Branch : Def.Branches)
	{
		if (Branch.Id == Node->Branch && !Branch.bAvailable)
		{
			return false;
		}
	}
	return std::all_of(Node->Prereqs.begin(), Node->Prereqs.end(),
		[&Tree](const std::string& Prereq) { return Tree.Ranks.count(Prereq) != 0; });
}

FStatus UnlockSkill(FSkillTree& Tree, const FSkillTreeDef& Def, const std::string& NodeId)
{
	if (!CanUnlockSkill(Tree, Def, NodeId))
	{
		return FStatus::Fail(FError{NodeId, "skill cannot be unlocked (unknown, owned, locked branch, prereqs or points)"});
	}
	Tree.UnspentPoints -= Def.FindNode(NodeId)->Cost;
	Tree.Ranks[NodeId] = 1;
	return OkStatus();
}

FGeneration MakeFirstGeneration(const FCharacterDef& Character)
{
	FGeneration G;
	G.Index = std::max(Character.Generation, 1);
	G.HeirId = Character.Id;
	G.PrimaryMovesetId = Character.StartWeapons.empty() ? std::string() : Character.StartWeapons.front();
	G.Weapons = Character.StartWeapons;
	G.WeaponSlots = Character.WeaponSlots;
	G.Skills.UnspentPoints = Character.StartSkillPoints;
	return G;
}

FHandoverRequest MakeHandoverRequest(const FCharacterDef& Next)
{
	FHandoverRequest R;
	R.NextHeirId = Next.Id;
	R.NextPrimaryMovesetId = Next.StartWeapons.empty() ? std::string() : Next.StartWeapons.front();
	R.NextStartWeapons = Next.StartWeapons;
	R.NextWeaponSlots = Next.WeaponSlots;
	R.BonusSkillPoints = Next.BonusSkillPointsOnHandoff;
	return R;
}

std::vector<FError> ValidateLineageConfig(const FLineageConfig& Config)
{
	std::vector<FError> Errors = ValidateSkillTree(Config.SkillTree);
	if (!(Config.SkillRankRetention >= 0.0f && Config.SkillRankRetention <= 1.0f))
	{
		Errors.push_back(FError{"skill_rank_retention", "must be in [0, 1]"});
	}
	if (Config.MaxFamilyMovesets < 0)
	{
		Errors.push_back(FError{"max_family_movesets", "must be >= 0"});
	}
	std::set<std::string> Ids;
	for (std::size_t I = 0; I < Config.Characters.size(); ++I)
	{
		const FCharacterDef& C = Config.Characters[I];
		const std::string Path = "characters[" + std::to_string(I) + "]";
		if (C.Id.empty() || !Ids.insert(C.Id).second)
		{
			Errors.push_back(FError{Path + ".id", "empty or duplicate character '" + C.Id + "'"});
		}
		if (C.WeaponSlots < 1 || static_cast<int>(C.StartWeapons.size()) > C.WeaponSlots)
		{
			Errors.push_back(FError{Path + ".weapon_slots", "must be >= 1 and hold the start weapons"});
		}
		if (C.StartSkillPoints < 0 || C.BonusSkillPointsOnHandoff < 0)
		{
			Errors.push_back(FError{Path, "skill points must be >= 0"});
		}
	}
	for (std::size_t I = 0; I < Config.HouseMoves.size(); ++I)
	{
		const FHouseMoveDef& M = Config.HouseMoves[I];
		if (M.Id.empty() || Config.FindCharacter(M.LearnedBy) == nullptr)
		{
			Errors.push_back(FError{"house_moves[" + std::to_string(I) + "]", "empty id or unknown learned_by"});
		}
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

	if (Request.NextWeaponSlots < 0 || Request.BonusSkillPoints < 0)
	{
		return TResult<FGeneration>::Fail(FError{"request", "weapon slots and bonus points must be >= 0"});
	}

	// Skill tree ("Nghề nhà").
	Next.Skills.UnspentPoints = Previous.Skills.UnspentPoints + Request.BonusSkillPoints;
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

	// Weapons and house moves.
	Next.WeaponSlots = Request.NextWeaponSlots > 0 ? Request.NextWeaponSlots : Previous.WeaponSlots;
	if (Config.bCarryWeapons)
	{
		Next.Weapons = Previous.Weapons;
	}
	for (const std::string& Weapon : Request.NextStartWeapons)
	{
		if (std::find(Next.Weapons.begin(), Next.Weapons.end(), Weapon) == Next.Weapons.end())
		{
			Next.Weapons.push_back(Weapon);
		}
	}
	if (Config.bCarryHouseMoves)
	{
		for (const std::string& MoveId : Previous.HouseMoves)
		{
			bool bInheritable = true;
			for (const FHouseMoveDef& Def : Config.HouseMoves)
			{
				bInheritable = Def.Id == MoveId ? Def.bInheritable : bInheritable;
			}
			if (bInheritable)
			{
				Next.HouseMoves.insert(MoveId);
			}
		}
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
