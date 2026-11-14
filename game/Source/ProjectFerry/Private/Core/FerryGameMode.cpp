// FerryGameMode.cpp - NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#include "Core/FerryGameMode.h"
#include "Sample/FerrySampleQuestComponent.h"

#include "Combat/FerryCombatComponent.h"
#include "Combat/FerryKhoenComponent.h"
#include "Core/FerryCharacter.h"
#include "Core/FerryHUD.h"
#include "Data/FerryDataSubsystem.h"
#include "Enemy/FerryEnemy.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "ProjectFerry.h"
#include "TimerManager.h"

namespace
{
const FName SpawnTag(TEXT("FerrySpawn"));
const FName CheckpointTag(TEXT("FerryCheckpoint"));
// Presentation placeholders (not in the design schema yet).
constexpr float CheckpointActivateRadiusCm = 300.0f;
constexpr float RespawnDelaySeconds = 3.0f;
} // namespace

AFerryGameMode::AFerryGameMode()
{
	SampleQuest = CreateDefaultSubobject<UFerrySampleQuestComponent>(TEXT("SampleQuest"));
	DefaultPawnClass = AFerryCharacter::StaticClass();
	HUDClass = AFerryHUD::StaticClass();
	PrimaryActorTick.bCanEverTick = true;
}

void AFerryGameMode::StartPlay()
{
	Super::StartPlay();
	if (SampleQuest && SampleQuest->HasRealisticBossBeenFreed())
	{
		WorldFlags.Add(TEXT("flag_boss_lon_loi_freed"));
		ApplyWorldFlagsToPlayer();
	}
	for (TActorIterator<AActor> It(GetWorld()); It; ++It)
	{
		if (It->ActorHasTag(CheckpointTag))
		{
			CheckpointMarkers.Add(*It);
		}
	}
	SpawnEnemiesFromMarkers();
}

void AFerryGameMode::SpawnEnemiesFromMarkers(bool bOnlyRealisticBoss)
{
	const UFerryDataSubsystem* DataSubsystem = UFerryDataSubsystem::Get(this);
	if (DataSubsystem == nullptr || !DataSubsystem->IsLoaded())
	{
		UE_LOG(LogFerry, Error, TEXT("no design data: enemies are not spawned (see LogFerry errors above)"));
		return;
	}
	int32 Spawned = 0;
	int32 Markers = 0;
	int32 Index = 0;
	for (TActorIterator<AActor> It(GetWorld()); It; ++It)
	{
		AActor* Marker = *It;
		if (!Marker->ActorHasTag(SpawnTag) || Marker->Tags.Num() < 2)
		{
			continue;
		}
		++Markers;
		if (FinishedMarkers.Contains(Marker))
		{
			continue;
		}
		const FName EnemyId = Marker->Tags[1]; // build_graybox_longbien.py writes [FerrySpawn, <enemy id>, <zone id>]
		if (bOnlyRealisticBoss && EnemyId != FName(TEXT("boss_lon_loi_dam"))) continue;
		if (SampleQuest && SampleQuest->IsRealisticLevel())
		{
			if (EnemyId == FName(TEXT("boss_lon_loi_dam")) && !SampleQuest->ShouldSpawnRealisticBoss()) continue;
			bool bAlreadyAlive = false;
			for (TActorIterator<AFerryEnemy> EnemyIt(GetWorld()); EnemyIt; ++EnemyIt)
			{
				if (!EnemyIt->IsActorBeingDestroyed() && EnemyIt->SpawnMarker.Get() == Marker) { bAlreadyAlive = true; break; }
			}
			if (bAlreadyAlive) continue;
		}
		const FTransform Transform(Marker->GetActorRotation(), Marker->GetActorLocation() + FVector(0.0f, 0.0f, 100.0f));
		AFerryEnemy* Enemy = GetWorld()->SpawnActorDeferred<AFerryEnemy>(AFerryEnemy::StaticClass(), Transform, nullptr, nullptr,
			ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn);
		if (Enemy == nullptr)
		{
			continue;
		}
		Enemy->SetEnemyId(EnemyId, Index++);
		Enemy->SpawnMarker = Marker;
		Enemy->FinishSpawning(Transform);
		++Spawned;
	}
	if (Markers == 0)
	{
		UE_LOG(LogFerry, Warning, TEXT("no spawn markers (tag FerrySpawn): run Content/Python/build_graybox_longbien.py first"));
	}
	UE_LOG(LogFerry, Log, TEXT("spawned %d enemies from %d markers"), Spawned, Markers);
}

void AFerryGameMode::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	// Sample progress owns checkpoints; proximity must not overwrite a saved milestone.
	if (SampleQuest && SampleQuest->IsActive()) return;
	CheckpointScanTimer -= DeltaSeconds;
	if (CheckpointScanTimer > 0.0f || bPlayerDead)
	{
		return;
	}
	CheckpointScanTimer = 0.5f;
	const APlayerController* PlayerController = GetWorld()->GetFirstPlayerController();
	const APawn* Pawn = PlayerController != nullptr ? PlayerController->GetPawn() : nullptr;
	if (Pawn == nullptr)
	{
		return;
	}
	for (const TWeakObjectPtr<AActor>& Checkpoint : CheckpointMarkers)
	{
		if (Checkpoint.IsValid() && Checkpoint != LastCheckpoint
			&& FVector::Dist(Checkpoint->GetActorLocation(), Pawn->GetActorLocation()) <= CheckpointActivateRadiusCm)
		{
			LastCheckpoint = Checkpoint;
			UE_LOG(LogFerry, Log, TEXT("checkpoint reached: %s"), *Checkpoint->GetName());
		}
	}
}

bool AFerryGameMode::TryAcquireAttackToken(AFerryEnemy* Enemy)
{
	TokenHolders.RemoveAll([](const TWeakObjectPtr<AFerryEnemy>& Holder) { return !Holder.IsValid() || Holder->IsFinished(); });
	if (TokenHolders.Contains(Enemy))
	{
		return true;
	}
	const UFerryDataSubsystem* DataSubsystem = UFerryDataSubsystem::Get(this);
	const int32 MaxAttackers = (DataSubsystem != nullptr && DataSubsystem->IsLoaded()) ? DataSubsystem->GetData()->Tuning.MaxSimultaneousAttackers : 1;
	if (TokenHolders.Num() >= MaxAttackers)
	{
		return false;
	}
	TokenHolders.Add(Enemy);
	return true;
}

void AFerryGameMode::ReleaseAttackToken(AFerryEnemy* Enemy)
{
	TokenHolders.Remove(Enemy);
}

void AFerryGameMode::NotifyEnemyFinished(AFerryEnemy* Enemy)
{
	ReleaseAttackToken(Enemy);
	if (SampleQuest) SampleQuest->NotifyRealisticBossFreed(Enemy);
	const UFerryDataSubsystem* DataSubsystem = UFerryDataSubsystem::Get(this);
	const FFerryEnemyView* View = (DataSubsystem != nullptr && DataSubsystem->IsLoaded())
		? DataSubsystem->GetData()->FindEnemy(Enemy->GetEnemyId()) : nullptr;
	// A finished boss never comes back; regular enemies follow respawns_at_checkpoint.
	if (Enemy->SpawnMarker.IsValid() && (Enemy->IsBoss() || (View != nullptr && !View->bRespawnsAtCheckpoint)))
	{
		FinishedMarkers.Add(Enemy->SpawnMarker);
	}
	if (Enemy->IsBoss() && View != nullptr && Enemy->GetKhoen() != nullptr)
	{
		const EFerryBossOutcome Outcome = Enemy->GetKhoen()->GetOutcome();
		const FName Flag = Outcome == EFerryBossOutcome::Freed ? View->FreedFlag : (Outcome == EFerryBossOutcome::Fled ? View->FledFlag : NAME_None);
		if (!Flag.IsNone())
		{
			WorldFlags.Add(Flag);
			ApplyWorldFlagsToPlayer();
		}
	}
}

void AFerryGameMode::ApplyWorldFlagsToPlayer()
{
	const APlayerController* PlayerController = GetWorld()->GetFirstPlayerController();
	const APawn* Pawn = PlayerController != nullptr ? PlayerController->GetPawn() : nullptr;
	UFerryCombatComponent* Combat = Pawn != nullptr ? Pawn->FindComponentByClass<UFerryCombatComponent>() : nullptr;
	if (Combat != nullptr)
	{
		for (const FName& Flag : WorldFlags)
		{
			Combat->AddUnlock(Flag);
		}
	}
}

void AFerryGameMode::NotifyPlayerDied(AController* Controller)
{
	if (bPlayerDead)
	{
		return;
	}
	bPlayerDead = true;
	FTimerDelegate Delegate = FTimerDelegate::CreateUObject(this, &AFerryGameMode::RespawnPlayer, TWeakObjectPtr<AController>(Controller));
	GetWorldTimerManager().SetTimer(RespawnTimer, Delegate, RespawnDelaySeconds, false);
}

void AFerryGameMode::RespawnPlayer(TWeakObjectPtr<AController> Controller)
{
	bPlayerDead = false;
	if (!Controller.IsValid())
	{
		return;
	}
	if (APawn* OldPawn = Controller->GetPawn())
	{
		Controller->UnPossess();
		OldPawn->Destroy();
	}
	// Enemies reset: everything still alive is removed and markers are re-spawned (except finished ones).
	TokenHolders.Reset();
	TArray<AFerryEnemy*> ToRemove;
	for (TActorIterator<AFerryEnemy> It(GetWorld()); It; ++It)
	{
		ToRemove.Add(*It);
	}
	for (AFerryEnemy* Enemy : ToRemove)
	{
		Enemy->Destroy();
	}
	if (LastCheckpoint.IsValid())
	{
		const FTransform Transform(LastCheckpoint->GetActorRotation(), LastCheckpoint->GetActorLocation() + FVector(0.0f, 0.0f, 100.0f));
		RestartPlayerAtTransform(Controller.Get(), Transform);
	}
	else
	{
		RestartPlayer(Controller.Get());
	}
	ApplyWorldFlagsToPlayer();
	if (SampleQuest) SampleQuest->OnPlayerSpawned(Controller->GetPawn());
	SpawnEnemiesFromMarkers();
}

void AFerryGameMode::FerryReloadData()
{
	if (UFerryDataSubsystem* DataSubsystem = UFerryDataSubsystem::Get(this))
	{
		const bool bOk = DataSubsystem->Reload();
		UE_LOG(LogFerry, Log, TEXT("FerryReloadData: %s"), bOk ? TEXT("ok") : TEXT("FAILED (previous data kept)"));
	}
}

void AFerryGameMode::FerrySampleReset()
{
	if (SampleQuest) SampleQuest->ResetSample();
	if (SampleQuest && SampleQuest->IsRealisticLevel())
	{
		FinishedMarkers.Reset();
		WorldFlags.Remove(TEXT("flag_boss_lon_loi_freed"));
		GetWorldTimerManager().ClearTimer(RespawnTimer);
		if (APlayerController* Player = GetWorld()->GetFirstPlayerController()) RespawnPlayer(TWeakObjectPtr<AController>(Player));
	}
}

void AFerryGameMode::RefreshRealisticEncounter()
{
	if (SampleQuest && SampleQuest->IsRealisticLevel()) SpawnEnemiesFromMarkers(true);
}
