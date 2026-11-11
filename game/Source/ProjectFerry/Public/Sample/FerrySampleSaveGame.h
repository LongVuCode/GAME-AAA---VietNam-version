#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "FerrySampleSaveGame.generated.h"

/** Isolated save for the optional UE sample; never reads or overwrites the legacy map's progress. */
UCLASS()
class PROJECTFERRY_API UFerrySampleSaveGame : public USaveGame
{
	GENERATED_BODY()
public:
	UPROPERTY(SaveGame) int32 SchemaVersion = 1;
	UPROPERTY(SaveGame) int32 Stage = 0;
};
