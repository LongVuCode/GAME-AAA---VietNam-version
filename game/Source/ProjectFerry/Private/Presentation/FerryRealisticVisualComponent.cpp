#include "Presentation/FerryRealisticVisualComponent.h"

#include "Animation/AnimSequence.h"
#include "Combat/FerryCombatComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Core/FerryCharacter.h"
#include "Enemy/FerryEnemy.h"
#include "Engine/SkeletalMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Character.h"
#include "ProjectFerry.h"

UFerryRealisticVisualComponent::UFerryRealisticVisualComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	PrimaryComponentTick.bStartWithTickEnabled = false;
}

bool UFerryRealisticVisualComponent::InitializeVisual()
{
	if (bReady) return true;
	ACharacter* Character = Cast<ACharacter>(GetOwner());
	if (!Character || !GetWorld()) return false;
	bool bOptIn = false;
	for (TActorIterator<AActor> It(GetWorld()); It; ++It)
	{
		if (It->ActorHasTag(TEXT("FerryRealisticRoot"))) { bOptIn = true; break; }
	}
	if (!bOptIn) return false;

	FString Asset = TEXT("Coi_Custom");
	FString Prefix = TEXT("Coi_");
	TArray<FName> Required = {TEXT("idle"), TEXT("walk"), TEXT("run"), TEXT("spear_light"), TEXT("spear_heavy"),
		TEXT("dodge"), TEXT("parry"), TEXT("hit"), TEXT("interact")};
	if (const AFerryEnemy* Enemy = Cast<AFerryEnemy>(Character))
	{
		if (Enemy->IsBoss())
		{
			Asset = TEXT("MarshBoar_Custom"); Prefix = TEXT("Boar_");
			Required = {TEXT("idle"), TEXT("walk"), TEXT("charge"), TEXT("tusk"), TEXT("stagger"), TEXT("freed")};
		}
		else if (Enemy->GetEnemyId() == FName(TEXT("en_cua_cang_bun")))
		{
			Asset = TEXT("Stoneback_Custom"); Prefix = TEXT("Stoneback_");
			Required = {TEXT("idle"), TEXT("walk"), TEXT("attack"), TEXT("stagger"), TEXT("retreat")};
		}
		else
		{
			UE_LOG(LogFerry, Warning, TEXT("realistic06: no custom rig for %s; proxy retained"), *Enemy->GetEnemyId().ToString());
			return false;
		}
	}
	const FString Folder = TEXT("/Game/Realistic06/Characters/") + Asset + TEXT("/");
	USkeletalMesh* Mesh = LoadObject<USkeletalMesh>(nullptr, *(Folder + Asset + TEXT(".") + Asset));
	TMap<FName, TObjectPtr<UAnimSequence>> LoadedClips;
	for (FName Action : Required)
	{
		const FString Name = Prefix + Action.ToString();
		UAnimSequence* Clip = LoadObject<UAnimSequence>(nullptr, *(Folder + Name + TEXT(".") + Name));
		if (!Clip || Clip->GetPlayLength() <= 0.0f || !Mesh || Clip->GetSkeleton() != Mesh->GetSkeleton())
		{
			UE_LOG(LogFerry, Error, TEXT("realistic06: missing/incompatible mesh or animation %s%s; proxy retained. Run build_realistic_level_0_6.py"), *Folder, *Name);
			return false;
		}
		LoadedClips.Add(Action, Clip);
	}
	VisualMesh = Character->GetMesh();
	if (!VisualMesh) return false;
	Clips = MoveTemp(LoadedClips);
	VisualMesh->SetSkeletalMesh(Mesh);
	VisualMesh->SetRelativeLocation(FVector(0.0f, 0.0f, -Character->GetCapsuleComponent()->GetUnscaledCapsuleHalfHeight()));
	// Generated Blender rigs face -Y. Validate this yaw after the FBX importer conversion in UE.
	VisualMesh->SetRelativeRotation(FRotator(0.0f, 90.0f, 0.0f));
	VisualMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	VisualMesh->SetVisibility(true, true);
	VisualMesh->SetHiddenInGame(false, true);
	VisualMesh->SetAnimationMode(EAnimationMode::AnimationSingleNode);
	TArray<UStaticMeshComponent*> Proxies;
	Character->GetComponents(Proxies);
	for (UStaticMeshComponent* Proxy : Proxies)
	{
		if (Proxy->GetFName() == FName(TEXT("BodyVisual")) || Proxy->GetFName() == FName(TEXT("FacingVisual")))
		{
			Proxy->SetVisibility(false, true);
			Proxy->SetHiddenInGame(true, true);
		}
	}
	if (AFerryCharacter* Player = Cast<AFerryCharacter>(Character))
	{
		Player->GetCombat()->OnVisualAction.AddUObject(this, &UFerryRealisticVisualComponent::HandlePlayerAction);
		Player->GetCombat()->OnDodgeStarted.AddUObject(this, &UFerryRealisticVisualComponent::HandlePlayerDodge);
	}
	bReady = true;
	Character->Tags.AddUnique(TEXT("PLACEHOLDER_AI"));
	SetComponentTickEnabled(true);
	PlayClip(TEXT("idle"), true, 0.0f, true);
	UE_LOG(LogFerry, Log, TEXT("realistic06: custom visual ready on %s: %s, %d clips [PLACEHOLDER_AI]"), *Character->GetName(), *Asset, Clips.Num());
	return true;
}

void UFerryRealisticVisualComponent::PlayClip(FName Action, bool bLoop, float Duration, bool bRestart)
{
	if (!bReady || !VisualMesh || (!bRestart && CurrentClip == Action)) return;
	const TObjectPtr<UAnimSequence>* Found = Clips.Find(Action);
	if (!Found || !(*Found)) return;
	UAnimSequence* Clip = Found->Get();
	CurrentClip = Action;
	VisualMesh->PlayAnimation(Clip, bLoop);
	const float Length = Clip->GetPlayLength();
	VisualMesh->SetPlayRate(!bLoop && Duration > 0.0f ? Length / FMath::Max(Duration, 0.01f) : 1.0f);
	ActionRemaining = bLoop ? 0.0f : (Duration > 0.0f ? Duration : Length);
}

void UFerryRealisticVisualComponent::PlayAction(FName Action, float Duration)
{
	PlayClip(Action, false, Duration, true);
}

void UFerryRealisticVisualComponent::HandlePlayerAction(FName Action, float Duration)
{
	PlayAction(Action, Duration);
}

void UFerryRealisticVisualComponent::HandlePlayerDodge(float DistanceCm, float Duration)
{
	PlayAction(TEXT("dodge"), Duration);
}

void UFerryRealisticVisualComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	if (!bReady) return;
	const ACharacter* Character = Cast<ACharacter>(GetOwner());
	if (!Character) return;
	ActionRemaining = FMath::Max(0.0f, ActionRemaining - DeltaTime);
	if (const AFerryCharacter* Player = Cast<AFerryCharacter>(Character))
	{
		if (Player->GetCombat()->IsDead() || ActionRemaining > 0.0f) return;
		if (Player->GetCombat()->IsGuarding()) { PlayClip(TEXT("parry"), false, 0.0f, false); return; }
	}
	if (const AFerryEnemy* Enemy = Cast<AFerryEnemy>(Character))
	{
		const EFerryEnemyState State = Enemy->GetState();
		if (State == EFerryEnemyState::Attack || State == EFerryEnemyState::Staggered || State == EFerryEnemyState::Prying
			|| State == EFerryEnemyState::PhaseTransition || State == EFerryEnemyState::Gone || ActionRemaining > 0.0f) return;
	}
	const float Speed = static_cast<float>(Character->GetVelocity().Size2D());
	const FName Locomotion = Speed < 8.0f ? FName(TEXT("idle")) : Speed > 400.0f && Clips.Contains(TEXT("run")) ? FName(TEXT("run")) : FName(TEXT("walk"));
	PlayClip(Locomotion, true, 0.0f, false);
}
