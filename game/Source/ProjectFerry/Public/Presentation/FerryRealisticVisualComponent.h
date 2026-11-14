#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "FerryRealisticVisualComponent.generated.h"

class UAnimSequence;
class USkeletalMeshComponent;

/** Own-rig prototype presentation for the opt-in Realistic06 level. UE compile/runtime unverified. */
UCLASS()
class PROJECTFERRY_API UFerryRealisticVisualComponent : public UActorComponent
{
	GENERATED_BODY()
public:
	UFerryRealisticVisualComponent();
	/** Called after the character's design data/capsule have initialized. Missing assets retain the proxy. */
	bool InitializeVisual();
	bool IsReady() const { return bReady; }
	/** Duration follows the accepted gameplay action; zero uses the authored clip length. */
	void PlayAction(FName Action, float Duration = 0.0f);
	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

private:
	void PlayClip(FName Action, bool bLoop, float Duration, bool bRestart);
	void HandlePlayerAction(FName Action, float Duration);
	void HandlePlayerDodge(float DistanceCm, float Duration);

	UPROPERTY(Transient) TObjectPtr<USkeletalMeshComponent> VisualMesh;
	UPROPERTY(Transient) TMap<FName, TObjectPtr<UAnimSequence>> Clips;
	FName CurrentClip;
	float ActionRemaining = 0.0f;
	bool bReady = false;
};
