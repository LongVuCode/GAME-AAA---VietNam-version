// FerryKhoenComponent.h - Boss side of the "khoen" (shackle) and the pry ("cạy") finisher. Wraps
// ArpgCore::FBossEncounter (health floor, posture, cracks, phases, pry rhythm, K0 fallback) so the boss
// actor and the HUD never touch those rules directly. The shackle grants the player nothing and has no
// shard counter on the UI (VERDICT V9). NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#pragma once

#include "Components/ActorComponent.h"
#include "CoreMinimal.h"

#include "ArpgCore/BossEncounter.h"
#include "Combat/FerryCombatTypes.h"

#include "FerryKhoenComponent.generated.h"

DECLARE_MULTICAST_DELEGATE_OneParam(FOnFerryPryEvent, EFerryPryResult /*Result*/);

UCLASS(ClassGroup = (Ferry))
class PROJECTFERRY_API UFerryKhoenComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UFerryKhoenComponent();

	/** bFeatureEnabled = feature flag feature_khoen (ferry.Khoen.Enabled). bAutoPry: difficulty pry_auto. */
	void InitializeBoss(const ArpgCore::FBossConfig& Config, const ArpgCore::FDifficultyConfig& Difficulty, bool bFeatureEnabled);
	bool IsInitialized() const { return Encounter.IsSet(); }

	ArpgCore::FBossHitResult ReceivePlayerHit(const ArpgCore::FAttackData& Attack, const ArpgCore::FWeaponConfig& Weapon);
	ArpgCore::FBossHitResult ReceivePostureDamage(float Amount);

	bool CanBeginPry() const;
	bool BeginPry();
	EFerryPryResult InputPryBeat();
	/** K0 fallback (shackle disabled): shove finisher during the final stagger. */
	bool CanPerformFinisher() const;
	bool PerformFinisher();

	/**
	 * Advanced by the owner (the component does not tick itself).
	 * GameDt: hit-stop-adjusted delta for the fight. RealDt: undilated delta used to judge the pry beats
	 * against the drum the player hears (ArpgCore clock contract, QA S2).
	 */
	EFerryPryResult Advance(float GameDt, float RealDt);

	// --- Views (HUD / AI) ------------------------------------------------------------------------------
	EFerryBossOutcome GetOutcome() const;
	bool IsFinished() const { return GetOutcome() != EFerryBossOutcome::InProgress; }
	bool IsShackleEnabled() const;
	bool IsPrying() const;
	bool IsStaggered() const;
	float GetHealthRatio() const;
	float GetPostureRatio() const;
	int32 GetCracks() const;
	int32 GetCracksToOpen() const;
	int32 GetBeatsHit() const;
	int32 GetPryBeats() const;
	float GetPryElapsed() const;
	float GetCurrentBeatTime() const;
	float GetBeatHalfWindow() const;
	float GetBeatInterval() const;
	float GetSilenceAfter() const;
	int32 GetPhaseIndex() const;
	const ArpgCore::FBossPhase* GetPhase() const;
	const ArpgCore::FBossConfig* GetConfig() const;

	FOnFerryPryEvent OnPryEvent;

private:
	static EFerryPryResult Convert(ArpgCore::EPryResult Result);

	TOptional<ArpgCore::FBossEncounter> Encounter;
};
