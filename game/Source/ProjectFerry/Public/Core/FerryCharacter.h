// FerryCharacter.h - Third-person player (graybox): spring arm + camera, Enhanced Input created at runtime,
// lock-on, pry interaction. Combat rules live in UFerryCombatComponent -> ArpgCore.
// NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
//
// Input: UInputAction / UInputMappingContext objects are created with NewObject in C++
// (BuildDefaultInputMappings), so the project needs no input .uasset files. Remapping UI comes later
// (it will move these to assets).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"

#include "FerryCharacter.generated.h"

class AFerryEnemy;
class UCameraComponent;
class UFerryCombatComponent;
class UInputAction;
class UInputMappingContext;
class USpringArmComponent;
class UStaticMeshComponent;
struct FInputActionValue;

UCLASS()
class PROJECTFERRY_API AFerryCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	AFerryCharacter();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

	UFerryCombatComponent* GetCombat() const { return Combat; }
	AFerryEnemy* GetLockOnTarget() const { return LockOnTarget.Get(); }
	/** Boss whose pry is currently running with this player (HUD). */
	AFerryEnemy* GetPryTarget() const { return PryTarget.Get(); }
	/** Boss in range whose pry (or K0 shove) can start now; null otherwise (HUD prompt). */
	AFerryEnemy* FindPryCandidate() const;
	/** Short-lived debug toast for graybox interactions (HUD). */
	const FText& GetInteractToast() const { return InteractToast; }
	double GetInteractToastTime() const { return InteractToastTime; }

	/** Console: switch weapon, e.g. "FerryEquip wp_riu_xeo". VERIFY: Exec functions on the possessed pawn. */
	UFUNCTION(Exec)
	void FerryEquip(FName WeaponId);

	/** Invert the camera pitch (or console ferry.InvertLookY 1). */
	UPROPERTY(EditAnywhere, Category = "Ferry|Input")
	bool bInvertLookY = false;

protected:
	UPROPERTY(VisibleAnywhere, Category = "Ferry")
	TObjectPtr<USpringArmComponent> CameraBoom;

	UPROPERTY(VisibleAnywhere, Category = "Ferry")
	TObjectPtr<UCameraComponent> FollowCamera;

	UPROPERTY(VisibleAnywhere, Category = "Ferry")
	TObjectPtr<UStaticMeshComponent> BodyVisual;

	UPROPERTY(VisibleAnywhere, Category = "Ferry")
	TObjectPtr<UStaticMeshComponent> FacingVisual;

	UPROPERTY(VisibleAnywhere, Category = "Ferry")
	TObjectPtr<UFerryCombatComponent> Combat;

	// Runtime-created Enhanced Input objects (Transient: never saved).
	UPROPERTY(Transient) TObjectPtr<UInputMappingContext> MappingContext;
	UPROPERTY(Transient) TObjectPtr<UInputAction> MoveAction;
	UPROPERTY(Transient) TObjectPtr<UInputAction> LookAction;
	UPROPERTY(Transient) TObjectPtr<UInputAction> LightAction;
	UPROPERTY(Transient) TObjectPtr<UInputAction> HeavyAction;
	UPROPERTY(Transient) TObjectPtr<UInputAction> DodgeAction;
	UPROPERTY(Transient) TObjectPtr<UInputAction> ParryAction;
	UPROPERTY(Transient) TObjectPtr<UInputAction> LockOnAction;
	UPROPERTY(Transient) TObjectPtr<UInputAction> DrumAction;
	UPROPERTY(Transient) TObjectPtr<UInputAction> PryAction;
	UPROPERTY(Transient) TObjectPtr<UInputAction> InteractAction;

private:
	void BuildDefaultInputMappings();
	void AddMappingContextToPlayer();

	void OnMove(const FInputActionValue& Value);
	void OnLook(const FInputActionValue& Value);
	void OnLight();
	void OnHeavy();
	void OnDodge();
	void OnParryPressed();
	void OnParryReleased();
	void OnLockOn();
	void OnDrum();
	void OnPry();
	void OnInteract();

	void HandleActionStarted();
	void HandleDodgeStarted(float DistanceCm, float DurationSeconds);
	void HandleDied();
	void UpdateLockOn(float DeltaSeconds);
	void UpdatePry();
	void UpdateDodge(float DeltaSeconds);
	AFerryEnemy* FindLockOnCandidate() const;
	void FaceTowards(const FVector& WorldTarget);

	TWeakObjectPtr<AFerryEnemy> LockOnTarget;
	TWeakObjectPtr<AFerryEnemy> PryTarget;
	float LockLosLostTime = 0.0f;

	float DodgeRemaining = 0.0f;
	float SavedGroundFriction = 8.0f;
	float SavedBrakingDeceleration = 2048.0f;

	FText InteractToast;
	double InteractToastTime = -100.0;
};
