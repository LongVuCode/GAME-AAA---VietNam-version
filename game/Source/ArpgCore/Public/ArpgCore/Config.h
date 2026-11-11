// Config.h - Aggregate configuration for every ArpgCore system, plus semantic validation and
// helpers that build runtime objects from config. Filled from design/data/*.json by
// LoadDesignData (DesignDataLoader.h).
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/BossEncounter.h"
#include "ArpgCore/ComboGraph.h"
#include "ArpgCore/Crafting.h"
#include "ArpgCore/Damage.h"
#include "ArpgCore/Defense.h"
#include "ArpgCore/DrumMeter.h"
#include "ArpgCore/Enemy.h"
#include "ArpgCore/HitStop.h"
#include "ArpgCore/Lineage.h"
#include "ArpgCore/Posture.h"
#include "ArpgCore/Result.h"
#include "ArpgCore/SecretGraph.h"

#include <string>
#include <vector>

namespace ArpgCore
{
struct FComboTransitionDef
{
	std::string From; // move id, "" = root, "@dodge" / "@perfect_parry" = context nodes
	EInputType Input = EInputType::Light;
	float MinDelay = 0.0f;
	float MaxDelay = -1.0f;
	std::string To;
};

/** "Hồi trống" of a weapon (drum_burst). Totals are spread over Hits. */
struct FDrumBurstDef
{
	std::string Id;
	int Hits = 1;
	float DamageTotal = 0.0f;
	float PostureDamageTotal = 0.0f;
	float Duration = 1.0f;
	bool bSuperArmor = false;
	bool bInvulnerable = false;
	float Weight = HitWeightHeavy;
};

/** Moveset of one weapon. */
struct FMovesetConfig
{
	std::string WeaponId;
	std::vector<FComboMove> Moves;
	std::vector<FComboTransitionDef> Combo;
	FDrumBurstDef Burst;
};

struct FCombatConfig
{
	FComboRunnerConfig Runner;
	float ComboPauseThreshold = 0.35f; // pause that selects a pause branch ("L,L,pause,H")
	float HoldThreshold = 0.25f;       // press longer than this = hold (game layer)
	FDodgeConfig Dodge;
	FParryConfig Parry;
	FGuardConfig Guard;
};

struct FPlayerConfig
{
	float MaxHealth = 300.0f;
	FPostureConfig Posture; // StaggerDuration = guard-break stun
	float HitstunLight = 0.35f;
	float HitstunHeavy = 0.7f;
	int HealCharges = 4;
	float HealRatio = 0.4f;
	float HealUseTime = 1.0f;
};

struct FArpgConfig
{
	int SchemaVersion = 1;
	FCombatConfig Combat;
	FPlayerConfig Player;
	std::vector<FWeaponConfig> Weapons;
	std::vector<FMovesetConfig> Movesets;
	std::vector<FDifficultyConfig> Difficulties;
	std::string DefaultDifficultyId;
	FHitStopConfig HitStop;
	FDrumConfig Drum;
	std::vector<FEnemyConfig> Enemies;
	std::vector<FBossConfig> Bosses;
	FLineageConfig Lineage;
	FCraftingDatabase Crafting;
	std::vector<FSecretGraphDef> Secrets;

	ARPGCORE_API const FWeaponConfig* FindWeapon(const std::string& Id) const;
	ARPGCORE_API const FMovesetConfig* FindMoveset(const std::string& WeaponId) const;
	ARPGCORE_API const FDifficultyConfig* FindDifficulty(const std::string& Id) const;
	ARPGCORE_API const FEnemyConfig* FindEnemy(const std::string& Id) const;
	ARPGCORE_API const FBossConfig* FindBoss(const std::string& Id) const;
};

/** Semantic checks across all sections (ranges, ordering, cross references, combo ambiguity,
 *  secret softlocks, boss finishability, shackle-fragment rewards). Empty = valid. */
ARPGCORE_API std::vector<FError> ValidateConfig(const FArpgConfig& Config);

/** Builds the combo graph of one moveset. */
ARPGCORE_API TResult<FComboGraph> BuildComboGraph(const FMovesetConfig& Moveset);

/** Runner config with the combat tuning (buffer, link windows, context windows). */
inline FComboRunnerConfig MakeRunnerConfig(const FCombatConfig& Combat) { return Combat.Runner; }
} // namespace ArpgCore
