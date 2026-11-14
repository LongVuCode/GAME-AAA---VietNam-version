#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Data/FerryDesignData.h"
#include "FerrySampleQuestComponent.generated.h"

class APawn;
class AFerryEnemy;

/** Small, marker-driven quest for the new sample map only. Values/text live in ue_sample_0_5.json. */
UCLASS()
class PROJECTFERRY_API UFerrySampleQuestComponent : public UActorComponent
{
	GENERATED_BODY()
public:
	UFerrySampleQuestComponent();
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;
	bool IsActive() const { return bActive; }
	bool IsRealisticLevel() const { return bRealisticLevel; }
	bool HasRealisticBossBeenFreed() const { return bRealisticLevel && bRealisticBossFreed; }
	bool ShouldSpawnRealisticBoss() const;
	void NotifyRealisticBossFreed(const AFerryEnemy* Enemy);
	/** Returns true in the sample, including when no target is close, so legacy debug interaction cannot run. */
	bool Interact(APawn* Player);
	FText GetObjective() const;
	FText GetHint(const APawn* Player) const;
	FText GetSubtitle() const;
	FText GetJournalText() const;
	FText GetJournalToggleHint() const;
	bool IsJournalOpen() const { return bJournalOpen; }
	void ToggleJournal();
	void ResetSample();
	void OnPlayerSpawned(APawn* Player);

private:
	bool LoadConfiguration();
	FText Text(const TCHAR* Key) const;
	AActor* FindMarker(FName Tag, FName Id = NAME_None) const;
	AActor* FindNearestInteraction(const APawn* Player) const;
	void SetStage(int32 NewStage, const TCHAR* SubtitleKey);
	bool SaveProgress();
	void ReconstructWorld();
	void UpdateCheckpoint();
	FName CheckpointId() const;
	void ShowSubtitle(const TCHAR* Key);
	void CloseJournal();

	bool bActive = false;
	bool bRealisticLevel = false;
	bool bRealisticBossFreed = false;
	bool bJournalOpen = false;
	bool bJournalOwnsPause = false;
	bool bConfigurationFailed = false;
	bool bRestorePending = false;
	bool bSaveFailed = false;
	bool bPreserveUnreadableSave = false;
	int32 Stage = 0;
	float InteractionRadiusCm = 350.0f;
	float LookoutRadiusCm = 600.0f;
	float SubtitleSeconds = 9.0f;
	float FallResetZCm = -400.0f;
	FString SaveSlot = TEXT("FerrySample05_v1");
	TMap<FName, FFerryLocText> Strings;
	FName SubtitleKey;
	double SubtitleUntil = 0.0;
};
