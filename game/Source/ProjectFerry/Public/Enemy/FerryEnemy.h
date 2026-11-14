// FerryEnemy.h - Graybox enemy (regular, elite or boss) driven by a small C++ FSM that reads its moveset
// from enemies.json through ArpgCore (timings, damage, parryability) and the presentation view (ranges,
// telegraph colour cue). No StateTree, no navmesh in this version: the enemy steers straight at the player.
// NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"

#include "ArpgCore/ActionTimeline.h"
#include "ArpgCore/Enemy.h"
#include "ArpgCore/HitStop.h"
#include "ArpgCore/Posture.h"
#include "ArpgCore/Rng.h"
#include "Combat/FerryCombatTypes.h"
#include "Data/FerryDesignData.h"

#include "FerryEnemy.generated.h"

class UFerryKhoenComponent;
class UFerryRealisticVisualComponent;
class UMaterialInstanceDynamic;
class UStaticMeshComponent;

UENUM(BlueprintType)
enum class EFerryEnemyState : uint8
{
	Idle,
	Chase,
	Attack,
	Recover,         // short pause after an attack / interrupt
	Staggered,       // posture broken
	PhaseTransition, // boss phase change beat (still gameplay)
	Prying,          // boss pinned by the pry finisher
	Leaving,         // flee / walk away (freed) / dissipate
	Gone,
};

UCLASS()
class PROJECTFERRY_API AFerryEnemy : public ACharacter
{
	GENERATED_BODY()

public:
	AFerryEnemy();

	/** Must be called before FinishSpawning (AFerryGameMode does this). */
	void SetEnemyId(FName InEnemyId, int32 InSpawnIndex);
	FName GetEnemyId() const { return EnemyId; }

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

	// --- Combat interface (player side calls these) ---------------------------------------------------
	FFerryHitReport ReceivePlayerHit(const FFerryPlayerHit& Hit);
	void ReceivePostureDamage(float Amount);
	void TriggerHitStop(float Duration);

	bool IsTargetable() const;
	bool IsBoss() const { return bIsBoss; }
	bool IsFinished() const { return State == EFerryEnemyState::Leaving || State == EFerryEnemyState::Gone; }
	float GetHealthRatio() const;
	float GetPostureRatio() const;
	float GetBodyRadius() const;
	FText GetDisplayName() const;
	EFerryEnemyState GetState() const { return State; }
	UFerryKhoenComponent* GetKhoen() const { return Khoen; }
	/** Spawn marker this enemy came from (respawn bookkeeping). */
	TWeakObjectPtr<AActor> SpawnMarker;
	/** Boss only: the player started the pry; the boss is pinned until the pry ends. */
	void NotifyPryStarted();

protected:
	UPROPERTY(VisibleAnywhere, Category = "Ferry")
	TObjectPtr<UStaticMeshComponent> BodyVisual;

	UPROPERTY(VisibleAnywhere, Category = "Ferry")
	TObjectPtr<UFerryKhoenComponent> Khoen;

	UPROPERTY(VisibleAnywhere, Category = "Ferry")
	TObjectPtr<UFerryRealisticVisualComponent> RealisticVisual;

	UPROPERTY(VisibleInstanceOnly, Category = "Ferry")
	FName EnemyId;

	UPROPERTY(VisibleInstanceOnly, Category = "Ferry")
	EFerryEnemyState State = EFerryEnemyState::Idle;

private:
	bool InitializeFromData();
	// Keep the pry clock on world time while AI/combat uses hit-stop-scaled time.
	void TickAi(float GameDt, float RealDt);
	void TickAttack(float GameDt);
	bool TryStartAttack(float DistanceCm);
	void EndAttack(float RecoverSeconds);
	void ResolveAttackHit();
	void EnterState(EFerryEnemyState NewState, float Duration = 0.0f);
	void BeginLeaving();
	void UpdateTelegraphVisual();
	void FacePlayer(float GameDt, float TurnRateDegPerSec);
	APawn* GetPlayerPawn() const;
	float GetSpeedMult() const;
	float GetTelegraphMult() const;
	const TArray<int32>& GetActiveMoveset() const;
	void HandlePryResult(EFerryPryResult Result);

	TSharedPtr<const FFerryDesignData> Data;
	const FFerryEnemyView* View = nullptr; // points into *Data
	ArpgCore::FDifficultyConfig Difficulty;
	ArpgCore::FHitStopClock HitStopClock;
	ArpgCore::FRng Rng;
	int32 SpawnIndex = 0;
	bool bIsBoss = false;

	// Regular enemy rules (bosses use UFerryKhoenComponent / ArpgCore::FBossEncounter instead).
	ArpgCore::FEnemyConfig EnemyConfig;
	TOptional<ArpgCore::FPosture> Posture;
	float Health = 0.0f;

	// Attacks (enemy config or boss config) and AI bookkeeping.
	std::vector<ArpgCore::FEnemyAttack> Attacks;
	TArray<float> Cooldowns;
	TArray<int32> AllAttackIndices;
	TArray<int32> PhaseMoveset;
	int32 PhaseMovesetFor = -1;
	int32 CurrentAttack = INDEX_NONE;
	int32 HitsResolved = 0;
	ArpgCore::FActionTimeline AttackTimeline;
	bool bHasToken = false;
	float StateTimer = 0.0f;
	int32 LastPhaseIndex = -1; // -1: phase 0 moveset not resolved yet
	FVector LeaveStartScale = FVector::OneVector;

	UPROPERTY(Transient)
	TObjectPtr<UMaterialInstanceDynamic> BodyMaterial;
};
