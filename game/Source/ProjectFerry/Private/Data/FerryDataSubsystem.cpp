// FerryDataSubsystem.cpp - NOT YET BUILT IN UNREAL ENGINE.
#include "Data/FerryDataSubsystem.h"

#include "Combat/FerryCombatTypes.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "HAL/IConsoleManager.h"
#include "ProjectFerry.h"

static TAutoConsoleVariable<FString> CVarFerryLang(
	TEXT("ferry.Lang"), TEXT("vi"),
	TEXT("HUD language: vi (source language) or en."),
	ECVF_Default);

static TAutoConsoleVariable<FString> CVarFerryDifficulty(
	TEXT("ferry.Difficulty"), TEXT(""),
	TEXT("Difficulty preset id from combat_tuning.json (empty = its default). Applied to actors spawned afterwards."),
	ECVF_Default);

static TAutoConsoleVariable<bool> CVarFerryKhoen(
	TEXT("ferry.Khoen.Enabled"), true,
	TEXT("Feature flag feature_khoen. 0 = shackle disabled, the boss fight ends with the shove finisher (K0 fallback, V9)."),
	ECVF_Default);

void UFerryDataSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	Reload();
}

void UFerryDataSubsystem::Deinitialize()
{
	Data.Reset();
	Super::Deinitialize();
}

UFerryDataSubsystem* UFerryDataSubsystem::Get(const UObject* WorldContextObject)
{
	const UWorld* World = WorldContextObject != nullptr ? WorldContextObject->GetWorld() : nullptr;
	const UGameInstance* GameInstance = World != nullptr ? World->GetGameInstance() : nullptr;
	return GameInstance != nullptr ? GameInstance->GetSubsystem<UFerryDataSubsystem>() : nullptr;
}

bool UFerryDataSubsystem::Reload()
{
	FFerryDesignDataLoadReport Report;
	TSharedPtr<const FFerryDesignData> NewData = FFerryDesignDataLoader::LoadFromDisk(Report);
	if (!NewData.IsValid())
	{
		UE_LOG(LogFerry, Error, TEXT("UFerryDataSubsystem: design data could not be loaded from %s (%d errors); %s"),
			*Report.DataDirectory, Report.Errors.Num(), Data.IsValid() ? TEXT("keeping the previous data") : TEXT("gameplay is disabled"));
		return false;
	}
	Data = NewData;
	return true;
}

bool UFerryDataSubsystem::IsEnglish() const
{
	return CVarFerryLang.GetValueOnGameThread().Equals(TEXT("en"), ESearchCase::IgnoreCase);
}

FText UFerryDataSubsystem::Localize(const FFerryLocText& Text) const
{
	// Display strings come from the design data ({vi, en}); they are not gathered by the UE
	// Localization Dashboard yet (TECH_SPEC §3 plans String Tables / .po export from the same data).
	return FText::FromString(Text.Pick(IsEnglish()));
}

FText UFerryDataSubsystem::GetUiText(FName Key) const
{
	if (Data.IsValid())
	{
		if (const FFerryLocText* Text = Data->UiStrings.Find(Key))
		{
			return Localize(*Text);
		}
	}
	return FText::FromString(TEXT("#") + Key.ToString());
}

ArpgCore::FDifficultyConfig UFerryDataSubsystem::GetActiveDifficulty() const
{
	if (!Data.IsValid())
	{
		return ArpgCore::FDifficultyConfig();
	}
	const FString Requested = CVarFerryDifficulty.GetValueOnGameThread();
	const std::string Id = Requested.IsEmpty() ? Data->Core.DefaultDifficultyId : std::string(TCHAR_TO_UTF8(*Requested));
	if (const ArpgCore::FDifficultyConfig* Found = Data->Core.FindDifficulty(Id))
	{
		return *Found;
	}
	UE_LOG(LogFerry, Warning, TEXT("unknown difficulty '%s'; using engine defaults (1.0 multipliers)"), *Requested);
	return ArpgCore::FDifficultyConfig();
}

bool UFerryDataSubsystem::IsKhoenEnabled() const
{
	return CVarFerryKhoen.GetValueOnGameThread();
}
