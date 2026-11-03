// FerryGameMode.h - Spawns enemies at the graybox markers (tag "FerrySpawn" + enemy id), hands out
// attack tokens (enemy_ai.max_simultaneous_attackers) and respawns the player at the last bonfire.
// NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"

#include "FerryGameMode.generated.h"

class AFerryEnemy;

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

	/** Console: re-reads design/data/*.json (actors spawned afterwards use the new data). VERIFY: Exec on GameMode. */
	UFUNCTION(Exec)
	void FerryReloadData();

private:
	void SpawnEnemiesFromMarkers();
	void RespawnPlayer(TWeakObjectPtr<AController> Controller);

	TArray<TWeakObjectPtr<AFerryEnemy>> TokenHolders;
	TSet<TWeakObjectPtr<AActor>> FinishedMarkers;
	TArray<TWeakObjectPtr<AActor>> CheckpointMarkers;
	TWeakObjectPtr<AActor> LastCheckpoint;
	FTimerHandle RespawnTimer;
	float CheckpointScanTimer = 0.0f;
	bool bPlayerDead = false;
};
