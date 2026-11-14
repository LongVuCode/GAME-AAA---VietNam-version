// FerryGameMode.h - Spawns enemies at the graybox markers (tag "FerrySpawn" + enemy id), hands out
// attack tokens (enemy_ai.max_simultaneous_attackers) and respawns the player at the last bonfire.
// NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"

#include "FerryGameMode.generated.h"

class AFerryEnemy;
class UFerrySampleQuestComponent;

UCLASS()
class PROJECTFERRY_API AFerryGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AFerryGameMode();

	virtual void StartPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	bool TryAcquireAttackToken(AFerryEnemy* Enemy);
	void ReleaseAttackToken(AFerryEnemy* Enemy);
	/** Defeated / fled / freed: markers of enemies that do not respawn are remembered. */
	void NotifyEnemyFinished(AFerryEnemy* Enemy);
	void NotifyPlayerDied(AController* Controller);
	bool IsPlayerDead() const { return bPlayerDead; }
	UFerrySampleQuestComponent* GetSampleQuest() const { return SampleQuest; }
	void SetSampleCheckpoint(AActor* Marker) { LastCheckpoint = Marker; }
	/** Refresh only the opt-in level06 encounter; skips living/finished markers. */
	void RefreshRealisticEncounter();

	UFUNCTION(Exec)
	void FerrySampleReset();

	/** Console: re-reads design/data/*.json (actors spawned afterwards use the new data). VERIFY: Exec on GameMode. */
	UFUNCTION(Exec)
	void FerryReloadData();

private:
	UPROPERTY(VisibleAnywhere) TObjectPtr<UFerrySampleQuestComponent> SampleQuest;
	void SpawnEnemiesFromMarkers(bool bOnlyRealisticBoss = false);
	void RespawnPlayer(TWeakObjectPtr<AController> Controller);
	void ApplyWorldFlagsToPlayer();

	TArray<TWeakObjectPtr<AFerryEnemy>> TokenHolders;
	TSet<TWeakObjectPtr<AActor>> FinishedMarkers;
	TArray<TWeakObjectPtr<AActor>> CheckpointMarkers;
	TWeakObjectPtr<AActor> LastCheckpoint;
	TSet<FName> WorldFlags; // e.g. flag_boss_lon_loi_freed; re-applied to the respawned player
	FTimerHandle RespawnTimer;
	float CheckpointScanTimer = 0.0f;
	bool bPlayerDead = false;
};
