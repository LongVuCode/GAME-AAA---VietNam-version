// FerryDesignData.h - Design data as seen by the game module, and the loader that reads it.
// NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
//
// Split of responsibilities (D-008, D-020):
// - Gameplay rules/values: ArpgCore::LoadDesignData() parses combat_tuning / weapons / enemies / items /
//   lineage / secrets into ArpgCore::FArpgConfig. ArpgCore does no I/O, so this loader reads the files and
//   hands it the text.
// - Presentation fields that ArpgCore deliberately ignores (display strings {vi, en}, attack ranges and
//   arcs, lock-on distances, movement speeds, telegraph colour cues): read here with UE's Json module.
// Missing presentation fields fall back to the defaults in the structs below and produce a warning
// (never silently): the defaults are placeholders, the data files are the source of truth.
#pragma once

#include "CoreMinimal.h"

#include "ArpgCore/Config.h"

/** A display string in both languages (strings.json, names in other files). */
struct PROJECTFERRY_API FFerryLocText
{
	FString Vi;
	FString En;

	bool IsEmpty() const { return Vi.IsEmpty() && En.IsEmpty(); }
	/** Picks the language; falls back to the other one when empty. */
	const FString& Pick(bool bEnglish) const { return (bEnglish ? (En.IsEmpty() ? Vi : En) : (Vi.IsEmpty() ? En : Vi)); }
};

/** weapons.json moves[]: fields the game layer needs besides ArpgCore's timing/damage. */
struct FFerryMoveView
{
	FName Id;
	FString Input; // "L", "H", "L,L,pause,H", "dodge,L", "perfect_parry,L"
	float RangeM = 2.0f;
	float ArcDeg = 60.0f;
	bool bHeavyInput = false; // the last input of the sequence is H (drum gain "heavy_hit")
};

struct FFerryWeaponView
{
	FName Id;
	int32 Slot = 0;
	FFerryLocText Name;
	TMap<FName, FFerryMoveView> Moves;
	float BurstRangeM = 2.0f; // drum burst has no range in data: longest move range of the weapon
};

/** enemies.json attacks[]: presentation / AI fields. */
struct FFerryEnemyAttackView
{
	FName Id;
	float RangeM = 2.0f;
	bool bColorCue = false;    // telegraph.color_cue != "none" (red-bronze glow for unparryable attacks)
	float EndsInStumbleS = 0.0f;
	float PushbackM = 0.0f;
};

struct FFerryEnemyView
{
	FName Id;
	FFerryLocText Name;
	FName Rank;            // normal / elite / boss
	FName DefeatBehavior;  // flee / dissipate / pry_then_walk_away
	bool bRespawnsAtCheckpoint = true;
	TMap<FName, FFerryEnemyAttackView> Attacks;
};

/** combat_tuning.json fields used only by the game layer. */
struct FFerryPresentationTuning
{
	float WalkSpeedMps = 2.2f;
	float RunSpeedMps = 5.0f;
	float DodgeDistanceM = 3.5f;
	float LockMaxDistanceM = 15.0f;
	float LockAcquireConeDeg = 60.0f;
	float LockBreakDistanceM = 20.0f;
	float LockBreakAfterLosLostS = 1.5f;
	int32 MaxSimultaneousAttackers = 2;
	float AttackTokenCooldownS = 1.2f;
	bool bHitStopAppliesToAttacker = true;
	bool bHitStopAppliesToTarget = true;
	bool bPlayerInvulnerableDuringPry = true;
	/** Not in the data yet (pry.range_m): how close the player must be to start the pry. */
	float PryRangeM = 3.0f;
};

/** Everything loaded from design/data. Immutable once built; shared with TSharedPtr<const ...>. */
struct PROJECTFERRY_API FFerryDesignData
{
	ArpgCore::FArpgConfig Core;
	FFerryPresentationTuning Tuning;
	TMap<FName, FFerryWeaponView> Weapons;
	TArray<FName> WeaponsBySlot; // ascending slot
	TMap<FName, FFerryEnemyView> Enemies;
	TMap<FName, FFerryLocText> UiStrings;   // strings.json "ui"
	TMap<FName, FFerryLocText> Difficulties; // display names of difficulty presets

	const FFerryWeaponView* FindWeapon(FName Id) const { return Weapons.Find(Id); }
	const FFerryEnemyView* FindEnemy(FName Id) const { return Enemies.Find(Id); }
};

struct PROJECTFERRY_API FFerryDesignDataLoadReport
{
	FString DataDirectory;
	TArray<FString> Errors;
	TArray<FString> Warnings;
};

class PROJECTFERRY_API FFerryDesignDataLoader
{
public:
	/**
	 * Where design JSON is read from, first existing wins:
	 *  1. -FerryDataDir="<dir>" on the command line;
	 *  2. <ProjectDir>/../design/data (running from the repo checkout: editor, PIE, local builds);
	 *  3. <ProjectContentDir>/Data/Design (copy staged into packaged builds, see DefaultGame.ini).
	 */
	static FString ResolveDataDirectory();

	/** Loads from ResolveDataDirectory(). Errors/warnings are also written to LogFerry. Null on failure. */
	static TSharedPtr<const FFerryDesignData> LoadFromDisk(FFerryDesignDataLoadReport& OutReport);
	static TSharedPtr<const FFerryDesignData> LoadFromDirectory(const FString& Directory, FFerryDesignDataLoadReport& OutReport);
};
