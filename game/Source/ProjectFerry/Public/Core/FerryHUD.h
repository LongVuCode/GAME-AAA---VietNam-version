// FerryHUD.h - Minimal Canvas HUD (no UMG assets): health, posture ("Thế"), drum notches ("Nhịp trống"),
// target / boss bars, shackle crack marks, pry rhythm bar and prompts. Display text comes from
// design/data/strings.json through UFerryDataSubsystem. NOT YET BUILT IN UNREAL ENGINE.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"

#include "FerryHUD.generated.h"

class AFerryCharacter;
class AFerryEnemy;
class UFerryDataSubsystem;

UCLASS()
class PROJECTFERRY_API AFerryHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;

private:
	void DrawBar(float X, float Y, float W, float H, float Ratio, const FLinearColor& Fill);
	void DrawLabel(const FText& Text, float X, float Y, const FLinearColor& Color, bool bLarge = false, bool bCentered = false);
	void DrawWrappedLabel(const FText& Text, float CenterX, float Y);
	void DrawPlayerPanel(const AFerryCharacter& Player, const UFerryDataSubsystem& Strings);
	void DrawTargetPanel(const AFerryEnemy& Target);
	void DrawPry(const AFerryCharacter& Player, const UFerryDataSubsystem& Strings);
	AFerryEnemy* FindEngagedBoss(const AFerryCharacter& Player) const;

	float UiScale = 1.0f;
};
