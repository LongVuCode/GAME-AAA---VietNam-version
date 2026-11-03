// FerryDataSubsystem.h - Owns the loaded design data for the game instance and answers localization /
// difficulty / feature-flag questions. NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"

#include "Data/FerryDesignData.h"

#include "FerryDataSubsystem.generated.h"

UCLASS()
class PROJECTFERRY_API UFerryDataSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	/** Finds the subsystem from any world object. Null outside a game world. */
	static UFerryDataSubsystem* Get(const UObject* WorldContextObject);

	/** Re-reads design/data/*.json. Objects that already copied their config keep it (by design). */
	bool Reload();

	bool IsLoaded() const { return Data.IsValid(); }
	/** Shared so that holders (e.g. combo graphs built from it) stay valid across Reload(). */
	TSharedPtr<const FFerryDesignData> GetData() const { return Data; }

	/** strings.json "ui" entry in the current language (ferry.Lang). Missing key => "#key" (dev marker). */
	FText GetUiText(FName Key) const;
	FText Localize(const FFerryLocText& Text) const;
	bool IsEnglish() const;

	/** Difficulty preset selected by ferry.Difficulty (empty => default from combat_tuning.json). */
	ArpgCore::FDifficultyConfig GetActiveDifficulty() const;
	/** Feature flag "feature_khoen" (ferry.Khoen.Enabled). Off => K0 fallback (V9). */
	bool IsKhoenEnabled() const;

private:
	TSharedPtr<const FFerryDesignData> Data;
};
