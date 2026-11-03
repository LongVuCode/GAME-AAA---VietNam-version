// FerryCombatComponent.h - Player combat: wraps ArpgCore (combo runner + action timeline, dodge/parry/guard,
// posture "Thế", drum meter "Nhịp trống", damage, hit-stop clock). The component contains no combat math
// of its own; it routes input and hits into ArpgCore and turns the results into UE side effects.
// NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
//
// Hit-stop: per-actor CustomTimeDilation (attacker and target), driven by ArpgCore::FHitStopClock.
// Global time dilation is NOT used: it would also freeze unrelated enemies and the camera.
#pragma once

#include "Components/ActorComponent.h"
#include "CoreMinimal.h"

#include "ArpgCore/ComboGraph.h"
#include "ArpgCore/Config.h"
#include "ArpgCore/Defense.h"
#include "ArpgCore/DrumMeter.h"
#include "ArpgCore/HitStop.h"
#include "ArpgCore/Posture.h"
#include "Combat/FerryCombatTypes.h"
#include "Data/FerryDesignData.h"

#include "FerryCombatComponent.generated.h"

class AFerryEnemy;

DECLARE_MULTICAST_DELEGATE(FOnFerryPlayerDied);
/** A move (combo move or drum burst hit) started: the owner should face its target. */
DECLARE_MULTICAST_DELEGATE(FOnFerryActionStarted);
/** A dodge started; the owner moves the character (distance / duration from data). */
DECLARE_MULTICAST_DELEGATE_TwoParams(FOnFerryDodgeStarted, float /*DistanceCm*/, float /*DurationSeconds*/);

UCLASS(ClassGroup = (Ferry), meta = (BlueprintSpawnableComponent))
class PROJECTFERRY_API UFerryCombatComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UFerryCombatComponent();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

	/** (Re)initializes every ArpgCore object from the current design data. Returns false without data. */
	bool InitializeFromData();
	/** Switches the moveset (weapons.json id). Resets the combo. */
	bool EquipWeapon(FName WeaponId);
	FName GetEquippedWeapon() const { return EquippedWeapon; }
	/** Skill / world-flag unlocks for moves with RequiredUnlock (e.g. the house move after the boss is freed). */
	void AddUnlock(FName UnlockId);

	// --- Input (called by AFerryCharacter) -------------------------------------------------------
	void PressLight();
	void PressHeavy();
	bool PressDodge();
	/** Tap = parry window ("Đỡ nhịp"); holding keeps guard ("Đỡ") up until ReleaseParry. */
	bool PressParry();
	void ReleaseParry();
	bool PressDrum();
	/** While locked (pry finisher) the player performs no actions; incoming hits may be ignored. */
	void SetActionLock(bool bLocked, bool bInvulnerable);

	// --- Incoming -------------------------------------------------------------------------------
	/** Resolves an enemy attack landing now (one hit of it). Applies damage, posture, drum, hit-stop. */
	EFerryDefenseOutcome ReceiveEnemyAttack(const ArpgCore::FAttackData& Attack, AActor* Attacker);
	/** Starts / extends this actor's hit-stop (see header comment). */
	void TriggerHitStop(float Duration);
	/** Called by the game mode after a respawn. */
	void ResetForRespawn();

	// --- State (HUD, character) ---------------------------------------------------------------------
	float GetHealth() const { return Health; }
	float GetMaxHealth() const;
	float GetPostureRatio() const;
	bool IsPostureBroken() const;
	int32 GetDrumFullNotches() const;
	int32 GetDrumNotchCount() const;
	float GetDrumPoints() const;
	float GetDrumPointsPerNotch() const;
	bool CanDrumSurge() const;
	bool IsDead() const { return bDead; }
	bool IsDodging() const;
	bool IsGuarding() const;
	/** True while attacking, bursting, stunned, staggered, locked or dead (no free movement). */
	bool IsBusy() const;
	bool IsReady() const { return Data.IsValid(); }
	const FFerryPresentationTuning* GetTuning() const { return Data.IsValid() ? &Data->Tuning : nullptr; }
	const ArpgCore::FDifficultyConfig& GetDifficulty() const { return Difficulty; }
	const ArpgCore::FHitStopConfig* GetHitStopConfig() const { return Data.IsValid() ? &Data->Core.HitStop : nullptr; }

	FOnFerryPlayerDied OnDied;
	FOnFerryActionStarted OnActionStarted;
	FOnFerryDodgeStarted OnDodgeStarted;

private:
	void SweepHit(const ArpgCore::FAttackData& Attack, float RangeM, float ArcDeg, bool bHeavy);
	void TickBurst(float GameDt);
	void ResetRunner();
	void ApplyHitTaken(const ArpgCore::FDamageResult& Damage, const ArpgCore::FAttackData& Attack);
	void Die();

	TSharedPtr<const FFerryDesignData> Data;
	const FFerryWeaponView* WeaponView = nullptr; // points into *Data (kept alive by Data)
	FName EquippedWeapon;

	ArpgCore::FDifficultyConfig Difficulty;
	ArpgCore::FWeaponConfig Weapon;
	ArpgCore::FDrumBurstDef Burst;
	ArpgCore::FComboGraph Graph;                    // must outlive Runner (declared before it)
	TUniquePtr<ArpgCore::FComboRunner> Runner;
	TOptional<ArpgCore::FDefenseController> Defense;
	TOptional<ArpgCore::FPosture> Posture;
	TOptional<ArpgCore::FDrumMeter> Drum;
	ArpgCore::FHitStopClock HitStopClock;

	float Health = 0.0f;
	float StunRemaining = 0.0f;
	bool bDead = false;
	bool bActionLocked = false;
	bool bInvulnerableLock = false;

	int32 BurstHitsLeft = 0;
	float BurstTimer = 0.0f;
	float BurstInterval = 0.0f;

	TSet<TWeakObjectPtr<AActor>> HitThisAction;
	TSet<FName> Unlocks; // survives respawn and weapon swaps (game-instance progress is not saved yet)
};
