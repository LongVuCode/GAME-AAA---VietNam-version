// BossEncounter.h - Glue for a boss fight: health + posture + shackle. With the shackle enabled the
// boss cannot die from damage (health floor) and the fight ends only when Freed; with it disabled
// the fight ends by health (Defeated).
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/Crafting.h"
#include "ArpgCore/Damage.h"
#include "ArpgCore/Posture.h"
#include "ArpgCore/Shackle.h"

#include <cstdint>
#include <string>
#include <vector>

namespace ArpgCore
{
struct FBossConfig
{
	std::string Id;
	float MaxHealth = 1000.0f;
	float HealthFloorWhileShackled = 1.0f;
	FPostureConfig Posture;
	FShackleConfig Shackle;
	/** Materials the boss sheds when freed (boss parts only; validated against crafting data). */
	std::vector<FMaterialAmount> FreedDrops;
};

enum class EBossOutcome : std::uint8_t
{
	InProgress,
	Freed,
	Defeated,
};

struct FBossHitResult
{
	FDamageResult Applied;
	bool bPostureBroken = false;
	bool bShackleCracked = false;
};

class ARPGCORE_API FBossEncounter
{
public:
	FBossEncounter(const FBossConfig& InConfig, const FDifficultyConfig& InDifficulty);

	/** A player hit (weapon + attack). Ignored once the fight is over or while prying. */
	FBossHitResult ReceivePlayerHit(const FAttackData& Attack, const FWeaponConfig& Weapon);
	/** Raw posture damage (e.g. from a parry exchange), already scaled by the caller. */
	FBossHitResult ReceivePostureDamage(float Amount);

	bool CanBeginPry() const;
	bool BeginPry();
	EPryResult InputPryBeat();
	/** Advances posture (stagger paused while prying) and the pry clock. */
	EPryResult Tick(float DeltaSeconds);

	EBossOutcome GetOutcome() const { return Outcome; }
	float GetHealth() const { return Health; }
	const FPosture& GetPosture() const { return Posture; }
	const FShackle& GetShackle() const { return Shackle; }
	/** Drops granted on Freed (empty before). */
	std::vector<FMaterialAmount> GetFreedDrops() const;
	const FBossConfig& GetConfig() const { return Config; }

private:
	FBossHitResult OnPostureResult(bool bBroken);
	void HandlePryResult(EPryResult Result);

	FBossConfig Config;
	FDifficultyConfig Difficulty;
	FPosture Posture;
	FShackle Shackle;
	float Health;
	EBossOutcome Outcome = EBossOutcome::InProgress;
};
} // namespace ArpgCore
