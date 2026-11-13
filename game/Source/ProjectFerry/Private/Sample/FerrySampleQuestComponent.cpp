#include "Sample/FerrySampleQuestComponent.h"

#include "Sample/FerrySampleSaveGame.h"
#include "Sample/FerrySampleProgress.h"
#include "Core/FerryGameMode.h"
#include "Data/FerryDataSubsystem.h"
#include "Dom/JsonObject.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "ProjectFerry.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

UFerrySampleQuestComponent::UFerrySampleQuestComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	PrimaryComponentTick.TickInterval = 0.15f;
}

AActor* UFerrySampleQuestComponent::FindMarker(FName Tag, FName Id) const
{
	for (TActorIterator<AActor> It(GetWorld()); It; ++It)
	{
		if (It->ActorHasTag(Tag) && (Id.IsNone() || It->ActorHasTag(Id))) return *It;
	}
	return nullptr;
}

bool UFerrySampleQuestComponent::LoadConfiguration()
{
	const FString Path = FPaths::Combine(FFerryDesignDataLoader::ResolveDataDirectory(), TEXT("ue_sample_0_5.json"));
	FString Json;
	TSharedPtr<FJsonObject> Root;
	if (!FFileHelper::LoadFileToString(Json, *Path)
		|| !FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Json), Root) || !Root.IsValid())
	{
		UE_LOG(LogFerry, Error, TEXT("sample: cannot read configuration %s"), *Path);
		return false;
	}
	const TSharedPtr<FJsonObject>* Settings = nullptr;
	const TSharedPtr<FJsonObject>* StringObject = nullptr;
	if (!Root->TryGetObjectField(TEXT("settings"), Settings) || !Root->TryGetObjectField(TEXT("strings"), StringObject)) return false;
	double Value = 0;
	if ((*Settings)->TryGetNumberField(TEXT("interact_radius_cm"), Value) && Value > 0) InteractionRadiusCm = static_cast<float>(Value);
	if ((*Settings)->TryGetNumberField(TEXT("lookout_radius_cm"), Value) && Value > 0) LookoutRadiusCm = static_cast<float>(Value);
	if ((*Settings)->TryGetNumberField(TEXT("subtitle_duration_s"), Value) && Value > 0) SubtitleSeconds = static_cast<float>(Value);
	if ((*Settings)->TryGetNumberField(TEXT("fall_reset_z_cm"), Value)) FallResetZCm = static_cast<float>(Value);
	FString ConfigSlot;
	if ((*Settings)->TryGetStringField(TEXT("save_slot"), ConfigSlot) && ConfigSlot == TEXT("FerrySample05_v1")) SaveSlot = ConfigSlot;
	// A fixed, isolated slot prevents malformed data from targeting unrelated saves.
	for (const auto& Pair : (*StringObject)->Values)
	{
		const TSharedPtr<FJsonObject>* Localized = nullptr;
		if (!Pair.Value->TryGetObject(Localized)) continue;
		FFerryLocText Entry;
		(*Localized)->TryGetStringField(TEXT("vi"), Entry.Vi);
		(*Localized)->TryGetStringField(TEXT("en"), Entry.En);
		Strings.Add(FName(*Pair.Key), MoveTemp(Entry));
	}
	const TCHAR* Required[] = {TEXT("objective_start"), TEXT("objective_route"), TEXT("objective_help"), TEXT("objective_bridge"),
		TEXT("objective_return"), TEXT("objective_complete"), TEXT("hint_nan"), TEXT("hint_help"), TEXT("hint_bridge"),
		TEXT("talk_nan"), TEXT("help_done"), TEXT("bridge_done"), TEXT("return_done"), TEXT("blocked_bridge"), TEXT("save_failed"),
		TEXT("journal_toggle_hint"), TEXT("journal_title"), TEXT("journal_start"), TEXT("journal_route"),
		TEXT("journal_help"), TEXT("journal_bridge"), TEXT("journal_return"), TEXT("journal_complete")};
	for (const TCHAR* Key : Required)
	{
		const FFerryLocText* Entry = Strings.Find(FName(Key));
		if (!Entry || Entry->Vi.IsEmpty() || Entry->En.IsEmpty())
		{
			UE_LOG(LogFerry, Error, TEXT("sample: missing vi/en string %s"), Key);
			return false;
		}
	}
	return true;
}

void UFerrySampleQuestComponent::BeginPlay()
{
	Super::BeginPlay();
	if (!FindMarker(TEXT("FerrySampleRoot"))) { SetComponentTickEnabled(false); return; }
	bActive = true;
	if (!LoadConfiguration())
	{
		bConfigurationFailed = true;
		SetComponentTickEnabled(false);
		UE_LOG(LogFerry, Error, TEXT("sample: configuration invalid; sample interaction disabled, legacy fallback blocked"));
		return;
	}
	if (UGameplayStatics::DoesSaveGameExist(SaveSlot, 0))
	{
		const UFerrySampleSaveGame* Save = Cast<UFerrySampleSaveGame>(UGameplayStatics::LoadGameFromSlot(SaveSlot, 0));
		if (Save && Save->SchemaVersion == 1 && FerrySampleProgress::IsValid(Save->Stage)) Stage = Save->Stage;
		else
		{
			bSaveFailed = true;
			bPreserveUnreadableSave = true;
			UE_LOG(LogFerry, Warning, TEXT("sample: invalid/unsupported save; starting at zero in memory; unreadable save is preserved until explicit FerrySampleReset"));
		}
	}
	ReconstructWorld();
	bRestorePending = true;
	UE_LOG(LogFerry, Log, TEXT("sample: active, stage=%d"), Stage);
}

FText UFerrySampleQuestComponent::Text(const TCHAR* Key) const
{
	const FFerryLocText* Entry = Strings.Find(FName(Key));
	const UFerryDataSubsystem* Data = UFerryDataSubsystem::Get(this);
	return Entry ? FText::FromString(Entry->Pick(Data && Data->IsEnglish())) : FText::FromString(FString(TEXT("#")) + Key);
}

void UFerrySampleQuestComponent::ShowSubtitle(const TCHAR* Key)
{
	SubtitleKey = FName(Key);
	SubtitleUntil = GetWorld()->GetTimeSeconds() + SubtitleSeconds;
}

FText UFerrySampleQuestComponent::GetSubtitle() const
{
	if (bSaveFailed) return Text(TEXT("save_failed"));
	return GetWorld()->GetTimeSeconds() < SubtitleUntil ? Text(*SubtitleKey.ToString()) : FText::GetEmpty();
}

FText UFerrySampleQuestComponent::GetObjective() const
{
	if (bConfigurationFailed) return NSLOCTEXT("ProjectFerry", "SampleConfigurationError", "Sample configuration unavailable. Check LogFerry and ue_sample_0_5.json.");
	const TCHAR* Keys[] = {TEXT("objective_start"), TEXT("objective_route"), TEXT("objective_help"),
		TEXT("objective_bridge"), TEXT("objective_return"), TEXT("objective_complete")};
	return Text(Keys[FMath::Clamp(Stage, 0, 5)]);
}

AActor* UFerrySampleQuestComponent::FindNearestInteraction(const APawn* Player) const
{
	if (!Player) return nullptr;
	AActor* Best = nullptr;
	double BestDistance = FMath::Square(static_cast<double>(InteractionRadiusCm));
	for (TActorIterator<AActor> It(GetWorld()); It; ++It)
	{
		if (!It->ActorHasTag(TEXT("FerrySampleInteract"))) continue;
		const double Distance = FVector::DistSquared(Player->GetActorLocation(), It->GetActorLocation());
		if (Distance < BestDistance) { BestDistance = Distance; Best = *It; }
	}
	return Best;
}

FText UFerrySampleQuestComponent::GetHint(const APawn* Player) const
{
	if (bConfigurationFailed) return FText::GetEmpty();
	const AActor* Marker = FindNearestInteraction(Player);
	if (!Marker) return FText::GetEmpty();
	if (Marker->ActorHasTag(TEXT("nan"))) return Text(TEXT("hint_nan"));
	if (Marker->ActorHasTag(TEXT("help"))) return Text(TEXT("hint_help"));
	if (Marker->ActorHasTag(TEXT("bridge"))) return Text(TEXT("hint_bridge"));
	return FText::GetEmpty();
}

bool UFerrySampleQuestComponent::SaveProgress()
{
	if (bPreserveUnreadableSave)
	{
		bSaveFailed = true;
		UE_LOG(LogFerry, Error, TEXT("sample: unreadable save preserved; use FerrySampleReset to explicitly replace it"));
		return false;
	}
	UFerrySampleSaveGame* Save = Cast<UFerrySampleSaveGame>(UGameplayStatics::CreateSaveGameObject(UFerrySampleSaveGame::StaticClass()));
	if (!Save) { bSaveFailed = true; return false; }
	Save->Stage = Stage;
	const bool bSaved = UGameplayStatics::SaveGameToSlot(Save, SaveSlot, 0);
	bSaveFailed = !bSaved;
	if (!bSaved) UE_LOG(LogFerry, Error, TEXT("sample: save failed, stage %d is only in memory"), Stage);
	return bSaved;
}

FName UFerrySampleQuestComponent::CheckpointId() const
{
	return Stage == 5 ? FName(TEXT("start")) : Stage >= 4 ? FName(TEXT("bridge")) : Stage >= 3 ? FName(TEXT("help")) : FName(TEXT("start"));
}

void UFerrySampleQuestComponent::UpdateCheckpoint()
{
	AFerryGameMode* Mode = Cast<AFerryGameMode>(GetOwner());
	AActor* Marker = FindMarker(TEXT("FerrySampleCheckpoint"), CheckpointId());
	if (Mode && Marker) Mode->SetSampleCheckpoint(Marker);
}

void UFerrySampleQuestComponent::ReconstructWorld()
{
	for (TActorIterator<AActor> It(GetWorld()); It; ++It)
	{
		const bool bDeck = It->ActorHasTag(TEXT("FerrySampleBridgeDeck"));
		const bool bRaised = It->ActorHasTag(TEXT("FerrySampleBridgeRaised"));
		const bool bObstacle = It->ActorHasTag(TEXT("FerrySampleHelpObstacle"));
		const bool bBefore = (It->ActorHasTag(TEXT("FerrySampleNpcBeforeHelp")) || It->ActorHasTag(TEXT("FerrySampleTrappedVisual")));
		const bool bAfter = (It->ActorHasTag(TEXT("FerrySampleNpcAfterHelp")) || It->ActorHasTag(TEXT("FerrySampleHelpedVisual")));
		if (!(bDeck || bRaised || bObstacle || bBefore || bAfter)) continue;
		const bool bVisible = bDeck ? Stage >= 4 : bRaised ? Stage < 4 : bAfter ? Stage >= 3 : Stage < 3;
		It->SetActorHiddenInGame(!bVisible);
		// NPC visuals/raised preview stay non-blocking; only deck/obstacle provide gameplay collision.
		It->SetActorEnableCollision(bVisible && (bDeck || bObstacle));
	}
	UpdateCheckpoint();
}

void UFerrySampleQuestComponent::SetStage(int32 NewStage, const TCHAR* Key)
{
	if (NewStage > Stage)
	{
		Stage = FMath::Clamp(NewStage, 0, 5);
		ReconstructWorld();
		SaveProgress();
		UE_LOG(LogFerry, Log, TEXT("sample: stage=%d"), Stage);
	}
	ShowSubtitle(Key);
}

bool UFerrySampleQuestComponent::Interact(APawn* Player)
{
	if (!bActive) return false;
	if (bConfigurationFailed || bJournalOpen) return true;
	AActor* Marker = FindNearestInteraction(Player);
	if (!Marker) return true;
	if (Marker->ActorHasTag(TEXT("nan")))
	{
		if (Stage >= 4) SetStage(FerrySampleProgress::Next(Stage, FerrySampleProgress::EAction::TalkToNan), TEXT("return_done"));
		else if (Stage < 3) SetStage(FerrySampleProgress::Next(Stage, FerrySampleProgress::EAction::TalkToNan), TEXT("talk_nan"));
		else ShowSubtitle(TEXT("help_done"));
	}
	else if (Marker->ActorHasTag(TEXT("help"))) SetStage(FerrySampleProgress::Next(Stage, FerrySampleProgress::EAction::HelpPerson), TEXT("help_done"));
	else if (Marker->ActorHasTag(TEXT("bridge")))
	{
		if (Stage >= 3) SetStage(FerrySampleProgress::Next(Stage, FerrySampleProgress::EAction::LowerBridge), TEXT("bridge_done"));
		else ShowSubtitle(TEXT("blocked_bridge"));
	}
	return true;
}

void UFerrySampleQuestComponent::OnPlayerSpawned(APawn* Player)
{
	if (!bActive || bConfigurationFailed || !Player) return;
	UpdateCheckpoint();
	if (AActor* Marker = FindMarker(TEXT("FerrySampleCheckpoint"), CheckpointId()))
	{
		Player->SetActorLocation(Marker->GetActorLocation() + FVector(0, 0, Player->GetSimpleCollisionHalfHeight() + 10), false, nullptr, ETeleportType::TeleportPhysics);
		Player->SetActorRotation(Marker->GetActorRotation());
	}
}

void UFerrySampleQuestComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	if (!bActive) return;
	APlayerController* Controller = GetWorld()->GetFirstPlayerController();
	APawn* Pawn = Controller ? Controller->GetPawn() : nullptr;
	if (bRestorePending && Pawn) { OnPlayerSpawned(Pawn); bRestorePending = false; }
	if (Pawn && Pawn->GetActorLocation().Z < FallResetZCm)
	{
		UE_LOG(LogFerry, Warning, TEXT("sample: fall reset to checkpoint, stage=%d"), Stage);
		OnPlayerSpawned(Pawn);
	}
	if (!Pawn || Stage >= 2) return;
	if (const AActor* Lookout = FindMarker(TEXT("FerrySampleLookout")))
	{
		if (FVector::DistSquared(Pawn->GetActorLocation(), Lookout->GetActorLocation()) < FMath::Square(LookoutRadiusCm)) SetStage(FerrySampleProgress::Next(Stage, FerrySampleProgress::EAction::ReachLookout), TEXT("talk_nan"));
	}
}

void UFerrySampleQuestComponent::ResetSample()
{
	if (!bActive || bConfigurationFailed) return;
	CloseJournal();
	Stage = 0;
	bPreserveUnreadableSave = false;
	ReconstructWorld();
	SaveProgress();
	SubtitleKey = NAME_None;
	SubtitleUntil = 0;
	bRestorePending = true;
	UE_LOG(LogFerry, Log, TEXT("sample: reset requested; save success=%d"), !bSaveFailed);
}

FText UFerrySampleQuestComponent::GetJournalToggleHint() const
{
	return Text(TEXT("journal_toggle_hint"));
}

FText UFerrySampleQuestComponent::GetJournalText() const
{
	const TCHAR* Keys[] = {TEXT("journal_start"), TEXT("journal_route"), TEXT("journal_help"),
		TEXT("journal_bridge"), TEXT("journal_return"), TEXT("journal_complete")};
	return FText::Format(NSLOCTEXT("ProjectFerry", "SampleJournalLayout", "{0}\n\n{1}\n\n{2}\n\n{3}"),
		Text(TEXT("journal_title")), GetObjective(), Text(Keys[FMath::Clamp(Stage, 0, 5)]), GetJournalToggleHint());
}

void UFerrySampleQuestComponent::ToggleJournal()
{
	if (!bActive || bConfigurationFailed) return;
	if (bJournalOpen) { CloseJournal(); return; }
	// Keep an existing pause owned by another menu/system. Only release a pause we requested.
	if (!UGameplayStatics::IsGamePaused(this))
	{
		bJournalOwnsPause = UGameplayStatics::SetGamePaused(this, true);
		if (!bJournalOwnsPause)
		{
			UE_LOG(LogFerry, Warning, TEXT("sample: journal could not pause world; not opened"));
			return;
		}
	}
	bJournalOpen = true;
	UE_LOG(LogFerry, Log, TEXT("sample: journal opened, owns pause=%d"), bJournalOwnsPause);
}

void UFerrySampleQuestComponent::CloseJournal()
{
	bJournalOpen = false;
	if (bJournalOwnsPause && GetWorld() && UGameplayStatics::IsGamePaused(this))
		UGameplayStatics::SetGamePaused(this, false);
	bJournalOwnsPause = false;
}

void UFerrySampleQuestComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	CloseJournal();
	Super::EndPlay(EndPlayReason);
}
