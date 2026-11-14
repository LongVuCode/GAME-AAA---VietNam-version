// FerryCharacter.cpp - NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#include "Core/FerryCharacter.h"

#include "Camera/CameraComponent.h"
#include "Combat/FerryCombatComponent.h"
#include "Combat/FerryKhoenComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Core/FerryGameMode.h"
#include "Sample/FerrySampleQuestComponent.h"
#include "Presentation/FerryRealisticVisualComponent.h"
#include "Enemy/FerryEnemy.h"
#include "Engine/LocalPlayer.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"
#include "HAL/IConsoleManager.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "InputModifiers.h"
#include "ProjectFerry.h"
#include "UObject/ConstructorHelpers.h"

static TAutoConsoleVariable<bool> CVarFerryInvertLookY(
	TEXT("ferry.InvertLookY"), false,
	TEXT("Invert camera pitch (same as AFerryCharacter::bInvertLookY)."),
	ECVF_Default);

namespace
{
// Presentation placeholders (camera / feel), not combat rules.
constexpr float GamepadLookDegPerSecond = 150.0f;
constexpr float LockOnTurnSpeed = 8.0f;
constexpr float LockOnPitchDeg = -12.0f;
constexpr float InteractRadiusCm = 300.0f;
constexpr float DodgeEndVelocityKeep = 0.2f;
const FName InteractTags[] = {FName(TEXT("FerryInteract")), FName(TEXT("FerrySecret")), FName(TEXT("FerryNpc")),
	FName(TEXT("FerryTrace")), FName(TEXT("FerryShortcut"))};
} // namespace

AFerryCharacter::AFerryCharacter()
{
	PrimaryActorTick.bCanEverTick = true;
	GetCapsuleComponent()->InitCapsuleSize(42.0f, 96.0f);

	bUseControllerRotationPitch = false;
	bUseControllerRotationYaw = false;
	bUseControllerRotationRoll = false;
	UCharacterMovementComponent* Movement = GetCharacterMovement();
	Movement->bOrientRotationToMovement = true;
	Movement->RotationRate = FRotator(0.0f, 720.0f, 0.0f);

	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->TargetArmLength = 450.0f;
	CameraBoom->SocketOffset = FVector(0.0f, 40.0f, 60.0f);
	CameraBoom->bUsePawnControlRotation = true;

	FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
	FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
	FollowCamera->bUsePawnControlRotation = false;

	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));

	BodyVisual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("BodyVisual"));
	BodyVisual->SetupAttachment(GetCapsuleComponent());
	BodyVisual->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	BodyVisual->SetRelativeScale3D(FVector(0.84f, 0.84f, 1.92f));
	if (Cylinder.Succeeded())
	{
		BodyVisual->SetStaticMesh(Cylinder.Object);
	}

	// Small block in front of the body so the facing direction is readable without animation.
	FacingVisual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("FacingVisual"));
	FacingVisual->SetupAttachment(GetCapsuleComponent());
	FacingVisual->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	FacingVisual->SetRelativeLocation(FVector(50.0f, 0.0f, 30.0f));
	FacingVisual->SetRelativeScale3D(FVector(0.35f, 0.12f, 0.12f));
	if (Cube.Succeeded())
	{
		FacingVisual->SetStaticMesh(Cube.Object);
	}

	Combat = CreateDefaultSubobject<UFerryCombatComponent>(TEXT("Combat"));
	RealisticVisual = CreateDefaultSubobject<UFerryRealisticVisualComponent>(TEXT("RealisticVisual"));
}

void AFerryCharacter::BeginPlay()
{
	Super::BeginPlay(); // components (Combat) initialize here
	if (const FFerryPresentationTuning* Tuning = Combat->GetTuning())
	{
		GetCharacterMovement()->MaxWalkSpeed = Tuning->RunSpeedMps * 100.0f;
	}
	SavedGroundFriction = GetCharacterMovement()->GroundFriction;
	SavedBrakingDeceleration = GetCharacterMovement()->BrakingDecelerationWalking;
	Combat->OnActionStarted.AddUObject(this, &AFerryCharacter::HandleActionStarted);
	Combat->OnDodgeStarted.AddUObject(this, &AFerryCharacter::HandleDodgeStarted);
	Combat->OnDied.AddUObject(this, &AFerryCharacter::HandleDied);
	RealisticVisual->InitializeVisual();
}

// --- Input setup -------------------------------------------------------------------------------------

void AFerryCharacter::BuildDefaultInputMappings()
{
	auto MakeAction = [this](const TCHAR* Name, EInputActionValueType Type)
	{
		UInputAction* Action = NewObject<UInputAction>(this, FName(Name), RF_Transient);
		Action->ValueType = Type; // VERIFY: UInputAction::ValueType is a public member in UE 5.6/5.7
		return Action;
	};
	MappingContext = NewObject<UInputMappingContext>(this, TEXT("IMC_FerryDefault"), RF_Transient);
	MoveAction = MakeAction(TEXT("IA_Move"), EInputActionValueType::Axis2D);
	LookAction = MakeAction(TEXT("IA_Look"), EInputActionValueType::Axis2D);
	LightAction = MakeAction(TEXT("IA_Light"), EInputActionValueType::Boolean);
	HeavyAction = MakeAction(TEXT("IA_Heavy"), EInputActionValueType::Boolean);
	DodgeAction = MakeAction(TEXT("IA_Dodge"), EInputActionValueType::Boolean);
	ParryAction = MakeAction(TEXT("IA_Parry"), EInputActionValueType::Boolean);
	LockOnAction = MakeAction(TEXT("IA_LockOn"), EInputActionValueType::Boolean);
	DrumAction = MakeAction(TEXT("IA_Drum"), EInputActionValueType::Boolean);
	PryAction = MakeAction(TEXT("IA_Pry"), EInputActionValueType::Boolean);
	InteractAction = MakeAction(TEXT("IA_Interact"), EInputActionValueType::Boolean);
	JournalAction = MakeAction(TEXT("IA_Journal"), EInputActionValueType::Boolean);
	JournalAction->bTriggerWhenPaused = true;

	UInputMappingContext* Context = MappingContext;
	// Each MapKey result is used before the next MapKey call (the mapping array may reallocate).
	auto Map = [Context](UInputAction* Action, const FKey& Key) -> FEnhancedActionKeyMapping&
	{
		return Context->MapKey(Action, Key); // VERIFY: MapKey returns FEnhancedActionKeyMapping& in UE 5.x
	};
	auto Swizzle = [this]() { return NewObject<UInputModifierSwizzleAxis>(this); }; // default order YXZ: X -> Y
	auto Negate = [this]() { return NewObject<UInputModifierNegate>(this); };
	auto DeadZone = [this]() { return NewObject<UInputModifierDeadZone>(this); };

	// Move: X = right, Y = forward (same convention as the UE third-person template).
	Map(MoveAction, EKeys::W).Modifiers.Add(Swizzle());
	{
		FEnhancedActionKeyMapping& S = Map(MoveAction, EKeys::S);
		S.Modifiers.Add(Swizzle());
		S.Modifiers.Add(Negate());
	}
	Map(MoveAction, EKeys::A).Modifiers.Add(Negate());
	Map(MoveAction, EKeys::D);
	Map(MoveAction, EKeys::Gamepad_Left2D).Modifiers.Add(DeadZone());

	// Look: mouse delta as is; gamepad stick scaled to degrees per second.
	Map(LookAction, EKeys::Mouse2D);
	{
		FEnhancedActionKeyMapping& Stick = Map(LookAction, EKeys::Gamepad_Right2D);
		Stick.Modifiers.Add(DeadZone());
		Stick.Modifiers.Add(NewObject<UInputModifierScaleByDeltaTime>(this));
		UInputModifierScalar* Scalar = NewObject<UInputModifierScalar>(this);
		Scalar->Scalar = FVector(GamepadLookDegPerSecond, GamepadLookDegPerSecond, 1.0);
		Stick.Modifiers.Add(Scalar);
	}

	Map(LightAction, EKeys::LeftMouseButton);
	Map(LightAction, EKeys::Gamepad_FaceButton_Left);
	Map(HeavyAction, EKeys::RightMouseButton);
	Map(HeavyAction, EKeys::Gamepad_FaceButton_Top);
	Map(DodgeAction, EKeys::SpaceBar);
	Map(DodgeAction, EKeys::Gamepad_FaceButton_Right);
	Map(ParryAction, EKeys::Q);
	Map(ParryAction, EKeys::Gamepad_LeftShoulder);
	Map(LockOnAction, EKeys::MiddleMouseButton);
	Map(LockOnAction, EKeys::Tab);
	Map(LockOnAction, EKeys::Gamepad_RightThumbstick);
	Map(DrumAction, EKeys::R);
	Map(DrumAction, EKeys::Gamepad_RightShoulder);
	Map(PryAction, EKeys::E);
	Map(PryAction, EKeys::Gamepad_RightTrigger);
	Map(InteractAction, EKeys::F);
	Map(JournalAction, EKeys::J);
	Map(InteractAction, EKeys::Gamepad_FaceButton_Bottom);
}

void AFerryCharacter::AddMappingContextToPlayer()
{
	const APlayerController* PlayerController = Cast<APlayerController>(GetController());
	const ULocalPlayer* LocalPlayer = PlayerController != nullptr ? PlayerController->GetLocalPlayer() : nullptr;
	UEnhancedInputLocalPlayerSubsystem* Subsystem =
		LocalPlayer != nullptr ? ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(LocalPlayer) : nullptr;
	if (Subsystem == nullptr || MappingContext == nullptr)
	{
		UE_LOG(LogFerry, Error, TEXT("Enhanced Input subsystem not found: input mapping context NOT added"));
		return;
	}
	Subsystem->ClearAllMappings(); // this project uses a single context; drop the previous pawn's one
	Subsystem->AddMappingContext(MappingContext, 0);
	UE_LOG(LogFerry, Log, TEXT("input mapping context added"));
}

void AFerryCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	if (MappingContext == nullptr)
	{
		BuildDefaultInputMappings();
	}
	AddMappingContextToPlayer();

	UEnhancedInputComponent* Input = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (Input == nullptr)
	{
		UE_LOG(LogFerry, Error, TEXT("Input component is not UEnhancedInputComponent: check Config/DefaultInput.ini"));
		return;
	}
	Input->BindAction(MoveAction, ETriggerEvent::Triggered, this, &AFerryCharacter::OnMove);
	Input->BindAction(LookAction, ETriggerEvent::Triggered, this, &AFerryCharacter::OnLook);
	Input->BindAction(LightAction, ETriggerEvent::Started, this, &AFerryCharacter::OnLight);
	Input->BindAction(HeavyAction, ETriggerEvent::Started, this, &AFerryCharacter::OnHeavy);
	Input->BindAction(DodgeAction, ETriggerEvent::Started, this, &AFerryCharacter::OnDodge);
	Input->BindAction(ParryAction, ETriggerEvent::Started, this, &AFerryCharacter::OnParryPressed);
	Input->BindAction(ParryAction, ETriggerEvent::Completed, this, &AFerryCharacter::OnParryReleased);
	Input->BindAction(LockOnAction, ETriggerEvent::Started, this, &AFerryCharacter::OnLockOn);
	Input->BindAction(DrumAction, ETriggerEvent::Started, this, &AFerryCharacter::OnDrum);
	Input->BindAction(PryAction, ETriggerEvent::Started, this, &AFerryCharacter::OnPry);
	Input->BindAction(InteractAction, ETriggerEvent::Started, this, &AFerryCharacter::OnInteract);
	Input->BindAction(JournalAction, ETriggerEvent::Started, this, &AFerryCharacter::OnJournal);
}

// --- Input handlers -------------------------------------------------------------------------------------

void AFerryCharacter::OnMove(const FInputActionValue& Value)
{
	if (Controller == nullptr || Combat->IsBusy() || Combat->IsDodging())
	{
		return;
	}
	const FVector2D Axis = Value.Get<FVector2D>();
	const FRotator YawRotation(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
	AddMovementInput(FRotationMatrix(YawRotation).GetUnitAxis(EAxis::X), Axis.Y);
	AddMovementInput(FRotationMatrix(YawRotation).GetUnitAxis(EAxis::Y), Axis.X);
}

void AFerryCharacter::OnLook(const FInputActionValue& Value)
{
	if (Controller == nullptr)
	{
		return;
	}
	const FVector2D Axis = Value.Get<FVector2D>();
	if (!LockOnTarget.IsValid())
	{
		AddControllerYawInput(Axis.X);
	}
	// VERIFY: pitch sign depends on the engine's legacy input scales; flip with bInvertLookY / ferry.InvertLookY.
	const bool bInvert = bInvertLookY || CVarFerryInvertLookY.GetValueOnGameThread();
	AddControllerPitchInput(bInvert ? Axis.Y : -Axis.Y);
}

void AFerryCharacter::OnLight()
{
	Combat->PressLight();
}

void AFerryCharacter::OnHeavy()
{
	Combat->PressHeavy();
}

void AFerryCharacter::OnDodge()
{
	Combat->PressDodge();
}

void AFerryCharacter::OnParryPressed()
{
	Combat->PressParry();
}

void AFerryCharacter::OnParryReleased()
{
	Combat->ReleaseParry();
}

void AFerryCharacter::OnLockOn()
{
	if (LockOnTarget.IsValid())
	{
		LockOnTarget.Reset();
		return;
	}
	LockOnTarget = FindLockOnCandidate();
	LockLosLostTime = 0.0f;
}

void AFerryCharacter::OnDrum()
{
	if (Combat->PressDrum())
	{
		UE_LOG(LogFerry, Log, TEXT("drum burst started"));
	}
}

void AFerryCharacter::OnPry()
{
	if (const AFerryGameMode* Mode = GetWorld()->GetAuthGameMode<AFerryGameMode>())
	{
		// Route the existing E binding at event time, avoiding BeginPlay/possession ordering races.
		if (Mode->GetSampleQuest() && Mode->GetSampleQuest()->IsActive())
		{
			const bool bRealisticPry = Mode->GetSampleQuest()->IsRealisticLevel() && (PryTarget.IsValid() || FindPryCandidate() != nullptr);
			if (!bRealisticPry) { OnInteract(); return; }
		}
	}
	if (AFerryEnemy* Boss = PryTarget.Get())
	{
		if (Boss->GetKhoen()->IsPrying())
		{
			Boss->GetKhoen()->InputPryBeat();
			return;
		}
	}
	AFerryEnemy* Candidate = FindPryCandidate();
	if (Candidate == nullptr || Combat->IsDead())
	{
		return;
	}
	UFerryKhoenComponent* Khoen = Candidate->GetKhoen();
	if (Khoen->CanBeginPry() && Khoen->BeginPry())
	{
		PryTarget = Candidate;
		Candidate->NotifyPryStarted();
		const FFerryPresentationTuning* Tuning = Combat->GetTuning();
		Combat->SetActionLock(true, Tuning != nullptr && Tuning->bPlayerInvulnerableDuringPry);
		RealisticVisual->PlayAction(TEXT("interact"), Khoen->GetBeatInterval() * FMath::Max(Khoen->GetPryBeats(), 1));
		FaceTowards(Candidate->GetActorLocation());
		UE_LOG(LogFerry, Log, TEXT("pry started"));
	}
	else if (Khoen->CanPerformFinisher() && Khoen->PerformFinisher())
	{
		FaceTowards(Candidate->GetActorLocation());
		UE_LOG(LogFerry, Log, TEXT("K0 fallback: shove finisher performed"));
	}
}

void AFerryCharacter::OnInteract()
{
	if (Combat && Combat->IsDead()) return;
	if (AFerryGameMode* Mode = GetWorld()->GetAuthGameMode<AFerryGameMode>())
	{
		if (Mode->GetSampleQuest() && Mode->GetSampleQuest()->Interact(this)) return;
	}
	const UWorld* World = GetWorld();
	AActor* Best = nullptr;
	FName BestTag;
	float BestDistSq = FMath::Square(InteractRadiusCm);
	for (TActorIterator<AActor> It(World); It; ++It)
	{
		for (const FName& Tag : InteractTags)
		{
			if (It->ActorHasTag(Tag))
			{
				const float DistSq = static_cast<float>(FVector::DistSquared(It->GetActorLocation(), GetActorLocation()));
				if (DistSq < BestDistSq)
				{
					BestDistSq = DistSq;
					Best = *It;
					BestTag = Tag;
				}
			}
		}
	}
	if (Best == nullptr)
	{
		return;
	}
	const FName MarkerId = Best->Tags.Num() > 1 ? Best->Tags[1] : NAME_None;
	// Graybox only: the secret chain, NPCs and the ferry have no behaviour yet; show the marker id (dev text).
	InteractToast = FText::Format(NSLOCTEXT("ProjectFerry", "InteractDebugToast", "[graybox] {0}: {1}"),
		FText::FromName(BestTag), FText::FromName(MarkerId));
	InteractToastTime = World->GetTimeSeconds();
	UE_LOG(LogFerry, Log, TEXT("interact: %s %s"), *BestTag.ToString(), *MarkerId.ToString());
}

// --- Combat callbacks -------------------------------------------------------------------------------------

void AFerryCharacter::FaceTowards(const FVector& WorldTarget)
{
	const FVector Direction = (WorldTarget - GetActorLocation()).GetSafeNormal2D();
	if (!Direction.IsNearlyZero())
	{
		SetActorRotation(FRotator(0.0f, Direction.Rotation().Yaw, 0.0f));
	}
}

void AFerryCharacter::HandleActionStarted()
{
	if (const AFerryEnemy* Target = LockOnTarget.Get())
	{
		FaceTowards(Target->GetActorLocation());
		return;
	}
	const FVector Wish = GetLastMovementInputVector().GetSafeNormal2D();
	if (!Wish.IsNearlyZero())
	{
		FaceTowards(GetActorLocation() + Wish * 100.0f);
	}
}

void AFerryCharacter::HandleDodgeStarted(float DistanceCm, float DurationSeconds)
{
	if (DurationSeconds <= 0.0f)
	{
		return;
	}
	FVector Direction = GetLastMovementInputVector().GetSafeNormal2D();
	if (Direction.IsNearlyZero())
	{
		Direction = -GetActorForwardVector().GetSafeNormal2D(); // no stick input: backstep
	}
	UCharacterMovementComponent* Movement = GetCharacterMovement();
	// Zero friction/braking during the dodge so the launch covers dodge.distance_m in dodge.duration_s.
	// VERIFY: feel/tuning in engine (CharacterMovement may still clamp speed in some modes).
	Movement->GroundFriction = 0.0f;
	Movement->BrakingDecelerationWalking = 0.0f;
	LaunchCharacter(Direction * (DistanceCm / DurationSeconds), true, false);
	DodgeRemaining = DurationSeconds;
}

void AFerryCharacter::UpdateDodge(float DeltaSeconds)
{
	if (DodgeRemaining <= 0.0f)
	{
		return;
	}
	DodgeRemaining -= DeltaSeconds;
	if (DodgeRemaining <= 0.0f)
	{
		UCharacterMovementComponent* Movement = GetCharacterMovement();
		Movement->GroundFriction = SavedGroundFriction;
		Movement->BrakingDecelerationWalking = SavedBrakingDeceleration;
		Movement->Velocity *= DodgeEndVelocityKeep;
	}
}

void AFerryCharacter::HandleDied()
{
	LockOnTarget.Reset();
	PryTarget.Reset();
	if (AFerryGameMode* GameMode = GetWorld()->GetAuthGameMode<AFerryGameMode>())
	{
		GameMode->NotifyPlayerDied(GetController());
	}
}

void AFerryCharacter::FerryEquip(FName WeaponId)
{
	Combat->EquipWeapon(WeaponId);
}

// --- Tick -------------------------------------------------------------------------------------------------

void AFerryCharacter::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	// Camera / lock-on use the undilated world delta so they keep moving during our own hit-stop.
	const float RealDt = static_cast<float>(GetWorld()->GetDeltaSeconds());
	UpdateDodge(DeltaSeconds);
	UpdateLockOn(RealDt);
	UpdatePry();
}

AFerryEnemy* AFerryCharacter::FindLockOnCandidate() const
{
	const FFerryPresentationTuning* Tuning = Combat->GetTuning();
	if (Tuning == nullptr || Controller == nullptr)
	{
		return nullptr;
	}
	const FVector ViewDir = Controller->GetControlRotation().Vector().GetSafeNormal2D();
	const float MaxDistCm = Tuning->LockMaxDistanceM * 100.0f;
	const float HalfConeCos = FMath::Cos(FMath::DegreesToRadians(Tuning->LockAcquireConeDeg * 0.5f));
	AFerryEnemy* Best = nullptr;
	float BestScore = TNumericLimits<float>::Max();
	for (TActorIterator<AFerryEnemy> It(GetWorld()); It; ++It)
	{
		AFerryEnemy* Enemy = *It;
		if (!Enemy->IsTargetable())
		{
			continue;
		}
		const FVector ToEnemy = Enemy->GetActorLocation() - GetActorLocation();
		const float Dist = static_cast<float>(ToEnemy.Size2D());
		const float Cos = static_cast<float>(FVector::DotProduct(ViewDir, ToEnemy.GetSafeNormal2D()));
		if (Dist > MaxDistCm || Cos < HalfConeCos)
		{
			continue;
		}
		const float Score = (1.0f - Cos) + Dist / MaxDistCm; // prefer centred, then close
		if (Score < BestScore)
		{
			BestScore = Score;
			Best = Enemy;
		}
	}
	return Best;
}

void AFerryCharacter::UpdateLockOn(float DeltaSeconds)
{
	AFerryEnemy* Target = LockOnTarget.Get();
	const FFerryPresentationTuning* Tuning = Combat->GetTuning();
	if (Target == nullptr || Tuning == nullptr)
	{
		return;
	}
	const float Dist = static_cast<float>(FVector::Dist2D(Target->GetActorLocation(), GetActorLocation()));
	if (!Target->IsTargetable() || Dist > Tuning->LockBreakDistanceM * 100.0f)
	{
		LockOnTarget.Reset();
		return;
	}
	FHitResult Hit;
	FCollisionQueryParams Params(SCENE_QUERY_STAT(FerryLockOnLos), false, this);
	Params.AddIgnoredActor(Target);
	const bool bBlocked = GetWorld()->LineTraceSingleByChannel(Hit, FollowCamera->GetComponentLocation(), Target->GetActorLocation(),
		ECC_Visibility, Params);
	LockLosLostTime = bBlocked ? LockLosLostTime + DeltaSeconds : 0.0f;
	if (LockLosLostTime > Tuning->LockBreakAfterLosLostS)
	{
		LockOnTarget.Reset();
		return;
	}
	if (Controller != nullptr)
	{
		const FRotator Desired((Target->GetActorLocation() - GetActorLocation()).Rotation().Pitch + LockOnPitchDeg,
			(Target->GetActorLocation() - GetActorLocation()).Rotation().Yaw, 0.0f);
		Controller->SetControlRotation(FMath::RInterpTo(Controller->GetControlRotation(), Desired, DeltaSeconds, LockOnTurnSpeed));
	}
}

AFerryEnemy* AFerryCharacter::FindPryCandidate() const
{
	const FFerryPresentationTuning* Tuning = Combat->GetTuning();
	if (Tuning == nullptr || PryTarget.IsValid())
	{
		return nullptr;
	}
	for (TActorIterator<AFerryEnemy> It(GetWorld()); It; ++It)
	{
		AFerryEnemy* Enemy = *It;
		if (!Enemy->IsBoss() || !Enemy->IsTargetable())
		{
			continue;
		}
		const float Reach = Tuning->PryRangeM * 100.0f + Enemy->GetBodyRadius() + GetCapsuleComponent()->GetScaledCapsuleRadius();
		const UFerryKhoenComponent* Khoen = Enemy->GetKhoen();
		if (FVector::Dist2D(Enemy->GetActorLocation(), GetActorLocation()) <= Reach && (Khoen->CanBeginPry() || Khoen->CanPerformFinisher()))
		{
			return Enemy;
		}
	}
	return nullptr;
}

void AFerryCharacter::UpdatePry()
{
	AFerryEnemy* Boss = PryTarget.Get();
	if (Boss == nullptr)
	{
		if (PryTarget.IsStale())
		{
			PryTarget.Reset();
			Combat->SetActionLock(false, false);
		}
		return;
	}
	if (!Boss->GetKhoen()->IsPrying())
	{
		UE_LOG(LogFerry, Log, TEXT("pry ended (%s)"), *UEnum::GetValueAsString(Boss->GetKhoen()->GetOutcome()));
		PryTarget.Reset();
		Combat->SetActionLock(false, false);
	}
}

void AFerryCharacter::OnJournal()
{
	if (const AFerryGameMode* Mode = GetWorld()->GetAuthGameMode<AFerryGameMode>())
	{
		UFerrySampleQuestComponent* Quest = Mode->GetSampleQuest();
		// A dead pawn cannot open a menu, but may close one already open to release its pause.
		if (Quest && (Quest->IsJournalOpen() || !(Combat && Combat->IsDead()))) Quest->ToggleJournal();
	}
}
