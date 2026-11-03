// Config.h - Aggregate configuration for every ArpgCore system, plus semantic validation and
// helpers that build runtime objects from config.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/BossEncounter.h"
#include "ArpgCore/ComboGraph.h"
#include "ArpgCore/Crafting.h"
#include "ArpgCore/Damage.h"
#include "ArpgCore/Defense.h"
#include "ArpgCore/DrumMeter.h"
#include "ArpgCore/HitStop.h"
#include "ArpgCore/Lineage.h"
#include "ArpgCore/Result.h"
#include "ArpgCore/SecretGraph.h"

#include <string>
#include <vector>

namespace ArpgCore
{
struct FComboTransitionDef
{
	std::string From; // empty = root
	EInputType Input = EInputType::Light;
	float MinDelay = 0.0f;
	float MaxDelay = -1.0f;
	std::string To;
};

struct FCombatConfig
{
	FComboRunnerConfig Runner;
	std::vector<FComboMove> Moves;
	std::vector<FComboTransitionDef> Combo;
	FDodgeConfig Dodge;
	FParryConfig Parry;
};

struct FArpgConfig
{
	int SchemaVersion = 1;
	FCombatConfig Combat;
	std::vector<FWeaponConfig> Weapons;
	std::vector<FDifficultyConfig> Difficulties;
	FHitStopConfig HitStop;
	FDrumConfig Drum;
	std::vector<FBossConfig> Bosses;
	FLineageConfig Lineage;
	FCraftingDatabase Crafting;
	std::vector<FSecretGraphDef> Secrets;

	const FWeaponConfig* FindWeapon(const std::string& Id) const;
	const FDifficultyConfig* FindDifficulty(const std::string& Id) const;
	const FBossConfig* FindBoss(const std::string& Id) const;
};

/** Semantic checks across all sections (ranges, ordering, cross references). Empty = valid. */
ARPGCORE_API std::vector<FError> ValidateConfig(const FArpgConfig& Config);

/** Builds the combo graph from Moves + Combo transitions. */
ARPGCORE_API TResult<FComboGraph> BuildComboGraph(const FCombatConfig& Combat);
} // namespace ArpgCore
