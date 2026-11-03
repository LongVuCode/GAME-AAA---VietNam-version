// FerryEnemy.cpp - NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#include "Enemy/FerryEnemy.h"

#include "AIController.h"
#include "Combat/FerryCombatComponent.h"
#include "Combat/FerryKhoenComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Core/FerryGameMode.h"
#include "Data/FerryDataSubsystem.h"
#include "DrawDebugHelpers.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "ProjectFerry.h"
#include "UObject/ConstructorHelpers.h"

namespace
{
// Presentation placeholders that are not part of the design schema yet. Each one is a candidate for
// enemies.json / combat_tuning.json; they do not change combat rules (those come from ArpgCore).
constexpr float FrontConeCos = 0.5f;        // "front" for front_damage_mult and enemy hit cone: +/- 60 deg
constexpr float LungeMinRangeM = 4.0f;       // attacks with a longer range lunge forward during Active
constexpr float LeaveSeconds = 4.0f;         // flee / walk-away time before the actor is removed
constexpr float DissipateSeconds = 1.0f;     // "dissipate" (Ụ Bùn sinks back into mud)
constexpr float TurnRateDeg = 360.0f;        // facing speed while chasing / winding up
constexpr float ContactGapCm = 60.0f;        // stop distance between capsules while chasing

// VERIFY: BasicShapeMaterial exposes a vector parameter "Color" (same assumption as the graybox script).
const FName ColorParam(TEXT("Color"));
const FLinearColor ColorNormal(0.35f, 0.30f, 0.22f);
const FLinearColor ColorElite(0.30f, 0.22f, 0.30f);
const FLinearColor ColorBoss(0.25f, 0.18f, 0.14f);
const FLinearColor ColorWindup(0.95f, 0.85f, 0.20f);
const FLinearColor ColorRedBronze(0.85f, 0.30f, 0.10f); // unparryable cue ("ánh đỏ đồng")
const FLinearColor ColorActive(1.0f, 1.0f, 1.0f);
const FLinearColor ColorStaggered(0.20f, 0.45f, 0.95f);
const FLinearColor ColorPrying(0.60f, 0.35f, 0.85f);
} // namespace

AFerryEnemy::AFerryEnemy()
{
	PrimaryActorTick.bCanEverTick = true;
	AIControllerClass = AAIController::StaticClass();
	AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;
	bUseControllerRotationYaw = false;
	GetCharacterMovement()->bOrientRotationToMovement = false; // the FSM controls facing
	GetCapsuleComponent()->InitCapsuleSize(40.0f, 90.0f);

	BodyVisual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("BodyVisual"));
	BodyVisual->SetupAttachment(GetCapsuleComponent());
	BodyVisual->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	if (Cylinder.Succeeded())
	{
		BodyVisual->SetStaticMesh(Cylinder.Object);
	}
	BodyVisual->SetRelativeScale3D(FVector(0.8f, 0.8f, 1.8f)); // 100 cm cylinder -> capsule size

	Khoen = CreateDefaultSubobject<UFerryKhoenComponent>(TEXT("Khoen"));
}

void AFerryEnemy::SetEnemyId(FName InEnemyId, int32 InSpawnIndex)
{
	EnemyId = InEnemyId;
	SpawnIndex = InSpawnIndex;
}

void AFerryEnemy::BeginPlay()
{
	Super::BeginPlay();
	BodyMaterial = BodyVisual->CreateDynamicMaterialInstance(0);
	if (!InitializeFromData())
	{
		UE_LOG(LogFerry, Error, TEXT("AFerryEnemy '%s': unknown id or no design data; removing"), *EnemyId.ToString());
		Destroy();
		return;
	}
	UpdateTelegraphVisual();
}

bool AFerryEnemy::InitializeFromData()
{
	const UFerryDataSubsystem* DataSubsystem = UFerryDataSubsystem::Get(this);
	Data = DataSubsystem != nullptr ? DataSubsystem->GetData() : nullptr;
	if (!Data.IsValid())
	{
		return false;
	}
	View = Data->FindEnemy(EnemyId);
	Difficulty = DataSubsystem->GetActiveDifficulty();
	HitStopClock = ArpgCore::FHitStopClock(Data->Core.HitStop.TimeScaleDuringStop);
	Rng = ArpgCore::FRng(static_cast<std::uint64_t>(GetTypeHash(EnemyId)) * 1000003ull + static_cast<std::uint64_t>(SpawnIndex));

	const std::string Id = FerryCombat::ToStd(EnemyId);
	float VisualScale = 1.0f;
	if (const ArpgCore::FBossConfig* Boss = Data->Core.FindBoss(Id))
	{
		bIsBoss = true;
		Khoen->InitializeBoss(*Boss, Difficulty, DataSubsystem->IsKhoenEnabled());
		Khoen->OnPryEvent.AddUObject(this, &AFerryEnemy::HandlePryResult);
		Attacks = Boss->Attacks;
		VisualScale = 2.0f;
	}
	else if (const ArpgCore::FEnemyConfig* Enemy = Data->Core.FindEnemy(Id))
	{
		EnemyConfig = *Enemy;
		Posture.Emplace(Enemy->Posture);
		Health = Enemy->MaxHealth;
		Attacks = Enemy->Attacks;
		VisualScale = Enemy->Rank == "elite" ? 1.35f : 1.0f;
	}
	else
	{
		return false;
	}
	if (View == nullptr)
	{
		return false;
	}

	GetCapsuleComponent()->SetCapsuleSize(40.0f * VisualScale, 90.0f * FMath::Max(1.0f, VisualScale * 0.75f));
	BodyVisual->SetRelativeScale3D(FVector(0.8f * VisualScale, 0.8f * VisualScale, 1.8f * FMath::Max(1.0f, VisualScale * 0.75f)));

	Cooldowns.Init(0.0f, static_cast<int32>(Attacks.size()));
	AllAttackIndices.Reset();
	for (int32 Index = 0; Index < static_cast<int32>(Attacks.size()); ++Index)
	{
		AllAttackIndices.Add(Index);
	}
	// Enemy locomotion speed is not in enemies.json yet: use the player's walk speed (placeholder).
	GetCharacterMovement()->MaxWalkSpeed = Data->Tuning.WalkSpeedMps * 100.0f * GetSpeedMult();
	State = EFerryEnemyState::Idle;
	return true;
}

void AFerryEnemy::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (!Data.IsValid() || State == EFerryEnemyState::Gone)
	{
		return;
	}
	// DeltaSeconds is already dilated by our own hit-stop; drive the ArpgCore clock from the world delta.
	const float GameDt = HitStopClock.Advance(GetWorld()->GetDeltaSeconds());
	FerryCombat::ApplyHitStopDilation(this, HitStopClock.IsStopped(), Data->Core.HitStop.TimeScaleDuringStop);
	TickAi(GameDt);
	UpdateTelegraphVisual();
}

void AFerryEnemy::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (bHasToken)
	{
		if (AFerryGameMode* GameMode = GetWorld() != nullptr ? GetWorld()->GetAuthGameMode<AFerryGameMode>() : nullptr)
		{
			GameMode->ReleaseAttackToken(this);
		}
		bHasToken = false;
	}
	Super::EndPlay(EndPlayReason);
}

APawn* AFerryEnemy::GetPlayerPawn() const
{
	return UGameplayStatics::GetPlayerPawn(this, 0);
}

float AFerryEnemy::GetSpeedMult() const
{
	const ArpgCore::FBossPhase* Phase = bIsBoss ? Khoen->GetPhase() : nullptr;
	return Difficulty.EnemySpeedMultiplier * (Phase != nullptr ? Phase->SpeedMult : 1.0f);
}

float AFerryEnemy::GetTelegraphMult() const
{
	const ArpgCore::FBossPhase* Phase = bIsBoss ? Khoen->GetPhase() : nullptr;
	return Difficulty.TelegraphTimeMultiplier * (Phase != nullptr ? Phase->TelegraphTimeMult : 1.0f);
}

const TArray<int32>& AFerryEnemy::GetActiveMoveset() const
{
	return (bIsBoss && PhaseMovesetFor == Khoen->GetPhaseIndex() && PhaseMoveset.Num() > 0) ? PhaseMoveset : AllAttackIndices;
}

void AFerryEnemy::EnterState(EFerryEnemyState NewState, float Duration)
{
	State = NewState;
	StateTimer = Duration;
}

void AFerryEnemy::TickAi(float GameDt)
{
	for (float& Cooldown : Cooldowns)
	{
		Cooldown = FMath::Max(0.0f, Cooldown - GameDt);
	}

	if (bIsBoss)
	{
		Khoen->Advance(GameDt); // results arrive through HandlePryResult
		if (Khoen->IsFinished())
		{
			if (!IsFinished())
			{
				BeginLeaving();
			}
		}
		else if (Khoen->IsPrying())
		{
			if (State == EFerryEnemyState::Attack)
			{
				EndAttack(0.0f);
			}
			State = EFerryEnemyState::Prying;
		}
		else if (Khoen->IsStaggered())
		{
			if (State == EFerryEnemyState::Attack)
			{
				EndAttack(0.0f);
			}
			State = EFerryEnemyState::Staggered;
		}
		else if (State == EFerryEnemyState::Staggered || State == EFerryEnemyState::Prying)
		{
			EnterState(EFerryEnemyState::Chase);
		}

		const int32 PhaseIndex = Khoen->GetPhaseIndex();
		if (PhaseIndex != LastPhaseIndex)
		{
			LastPhaseIndex = PhaseIndex;
			const ArpgCore::FBossPhase* Phase = Khoen->GetPhase();
			PhaseMoveset.Reset();
			if (Phase != nullptr)
			{
				for (const std::string& AttackId : Phase->Moveset)
				{
					for (int32 Index = 0; Index < static_cast<int32>(Attacks.size()); ++Index)
					{
						if (Attacks[static_cast<size_t>(Index)].Id == AttackId)
						{
							PhaseMoveset.Add(Index);
						}
					}
				}
			}
			PhaseMovesetFor = PhaseIndex;
			GetCharacterMovement()->MaxWalkSpeed = Data->Tuning.WalkSpeedMps * 100.0f * GetSpeedMult();
			if (State == EFerryEnemyState::Attack)
			{
				EndAttack(0.0f);
			}
			if (!Khoen->IsStaggered() && !Khoen->IsPrying())
			{
				EnterState(EFerryEnemyState::PhaseTransition, Phase != nullptr ? Phase->TransitionBeat : 0.0f);
			}
		}
	}
	else if (Posture.IsSet())
	{
		Posture->Tick(GameDt);
		if (State == EFerryEnemyState::Staggered && !Posture->IsStaggered())
		{
			EnterState(EFerryEnemyState::Chase);
		}
	}

	APawn* Player = GetPlayerPawn();
	const float Distance = Player != nullptr ? FVector::Dist2D(Player->GetActorLocation(), GetActorLocation()) : TNumericLimits<float>::Max();
	const float AggroCm = Data->Tuning.LockMaxDistanceM * 100.0f; // aggro radius = lock-on distance (placeholder)

	switch (State)
	{
	case EFerryEnemyState::Idle:
		if (Distance <= AggroCm)
		{
			EnterState(EFerryEnemyState::Chase);
		}
		break;
	case EFerryEnemyState::Chase:
		if (Player == nullptr)
		{
			break;
		}
		FacePlayer(GameDt, TurnRateDeg);
		if (!TryStartAttack(Distance))
		{
			const float Stop = GetBodyRadius() + ContactGapCm + 40.0f;
			if (Distance > Stop)
			{
				AddMovementInput((Player->GetActorLocation() - GetActorLocation()).GetSafeNormal2D(), 1.0f);
			}
		}
		break;
	case EFerryEnemyState::Attack:
		TickAttack(GameDt);
		break;
	case EFerryEnemyState::Recover:
	case EFerryEnemyState::PhaseTransition:
		FacePlayer(GameDt, TurnRateDeg * 0.5f);
		StateTimer -= GameDt;
		if (StateTimer <= 0.0f)
		{
			EnterState(EFerryEnemyState::Chase);
		}
		break;
	case EFerryEnemyState::Leaving:
		StateTimer -= GameDt;
		if (View != nullptr && View->DefeatBehavior == FName(TEXT("dissipate")))
		{
			const float Alpha = FMath::Clamp(StateTimer / DissipateSeconds, 0.05f, 1.0f);
			BodyVisual->SetRelativeScale3D(LeaveStartScale * FVector(1.0f, 1.0f, Alpha)); // sinks back into the mud
		}
		else if (Player != nullptr)
		{
			AddMovementInput((GetActorLocation() - Player->GetActorLocation()).GetSafeNormal2D(), 1.0f);
		}
		if (StateTimer <= 0.0f)
		{
			State = EFerryEnemyState::Gone;
			Destroy();
		}
		break;
	case EFerryEnemyState::Staggered:
	case EFerryEnemyState::Prying:
	case EFerryEnemyState::Gone:
	default:
		break;
	}
}

void AFerryEnemy::FacePlayer(float GameDt, float TurnRateDegPerSec)
{
	const APawn* Player = GetPlayerPawn();
	if (Player == nullptr)
	{
		return;
	}
	const FVector ToPlayer = (Player->GetActorLocation() - GetActorLocation()).GetSafeNormal2D();
	if (ToPlayer.IsNearlyZero())
	{
		return;
	}
	const FRotator Target = ToPlayer.Rotation();
	SetActorRotation(FMath::RInterpConstantTo(GetActorRotation(), FRotator(0.0f, Target.Yaw, 0.0f), GameDt, TurnRateDegPerSec));
}

bool AFerryEnemy::TryStartAttack(float DistanceCm)
{
	const APawn* Player = GetPlayerPawn();
	if (Player == nullptr || View == nullptr)
	{
		return false;
	}
	const float PlayerRadius = 42.0f;
	TArray<int32, TInlineAllocator<8>> Candidates;
	for (const int32 Index : GetActiveMoveset())
	{
		const ArpgCore::FEnemyAttack& Attack = Attacks[static_cast<size_t>(Index)];
		const FFerryEnemyAttackView* AttackView = View->Attacks.Find(FerryCombat::ToName(Attack.Id));
		const float RangeCm = (AttackView != nullptr ? AttackView->RangeM : 2.0f) * 100.0f + GetBodyRadius() + PlayerRadius;
		if (Cooldowns[Index] <= 0.0f && DistanceCm <= RangeCm)
		{
			Candidates.Add(Index);
		}
	}
	if (Candidates.Num() == 0)
	{
		return false;
	}
	AFerryGameMode* GameMode = GetWorld()->GetAuthGameMode<AFerryGameMode>();
	if (!bHasToken)
	{
		if (GameMode == nullptr || !GameMode->TryAcquireAttackToken(this))
		{
			return false; // max_simultaneous_attackers reached: keep circling
		}
		bHasToken = true;
	}
	const int32 Pick = Candidates[Rng.RangeInt(0, Candidates.Num() - 1)];
	const ArpgCore::FEnemyAttack& Attack = Attacks[static_cast<size_t>(Pick)];
	const float Speed = FMath::Max(GetSpeedMult(), 0.05f);
	ArpgCore::FActionTiming Timing;
	Timing.Startup = (Attack.Windup * GetTelegraphMult() + Attack.Hold) / Speed;
	Timing.Active = Attack.Active / Speed;
	Timing.Recovery = Attack.Recovery / Speed;
	AttackTimeline.Start(Timing);
	CurrentAttack = Pick;
	HitsResolved = 0;
	Cooldowns[Pick] = Attack.Cooldown;
	EnterState(EFerryEnemyState::Attack);
	return true;
}

void AFerryEnemy::TickAttack(float GameDt)
{
	if (CurrentAttack == INDEX_NONE)
	{
		EnterState(EFerryEnemyState::Chase);
		return;
	}
	const ArpgCore::FEnemyAttack& Attack = Attacks[static_cast<size_t>(CurrentAttack)];
	const ArpgCore::FTimelineEvents Events = AttackTimeline.Tick(GameDt);
	const ArpgCore::FActionTiming& Timing = AttackTimeline.GetTiming();
	const float Elapsed = AttackTimeline.GetElapsed();

	if (Elapsed < Timing.Startup)
	{
		FacePlayer(GameDt, TurnRateDeg); // tracks during the telegraph, commits on Active
	}

	const FFerryEnemyAttackView* AttackView = View != nullptr ? View->Attacks.Find(FerryCombat::ToName(Attack.Id)) : nullptr;
	const float RangeM = AttackView != nullptr ? AttackView->RangeM : 2.0f;
	if (AttackTimeline.GetPhase() == ArpgCore::EActionPhase::Active && RangeM >= LungeMinRangeM && Timing.Active > 0.0f)
	{
		// Charge attacks (e.g. "Càn lầy"): cover the range during Active, stopping at the player.
		if (const APawn* Player = GetPlayerPawn())
		{
			const float Remaining = FVector::Dist2D(Player->GetActorLocation(), GetActorLocation()) - GetBodyRadius() - ContactGapCm;
			const float Step = FMath::Min(RangeM * 100.0f / Timing.Active * GameDt, FMath::Max(Remaining, 0.0f));
			AddActorWorldOffset(GetActorForwardVector() * Step, true);
		}
	}

	const int32 Hits = FMath::Max(1, Attack.Hits);
	while (HitsResolved < Hits && Elapsed >= Timing.Startup + Timing.Active * static_cast<float>(HitsResolved) / static_cast<float>(Hits))
	{
		ResolveAttackHit();
		++HitsResolved;
		if (State != EFerryEnemyState::Attack)
		{
			return; // interrupted by the parry exchange (posture broken)
		}
	}

	if (Events.bFinished || !AttackTimeline.IsRunning())
	{
		const float Stumble = AttackView != nullptr ? AttackView->EndsInStumbleS : 0.0f;
		EndAttack(FMath::Max(Data->Tuning.AttackTokenCooldownS, Stumble));
	}
}

void AFerryEnemy::ResolveAttackHit()
{
	APawn* Player = GetPlayerPawn();
	UFerryCombatComponent* Combat = Player != nullptr ? Player->FindComponentByClass<UFerryCombatComponent>() : nullptr;
	if (Combat == nullptr || CurrentAttack == INDEX_NONE)
	{
		return;
	}
	const ArpgCore::FEnemyAttack& Attack = Attacks[static_cast<size_t>(CurrentAttack)];
	const FFerryEnemyAttackView* AttackView = View != nullptr ? View->Attacks.Find(FerryCombat::ToName(Attack.Id)) : nullptr;
	const float RangeCm = (AttackView != nullptr ? AttackView->RangeM : 2.0f) * 100.0f + GetBodyRadius() + 42.0f;
	const FVector ToPlayer = Player->GetActorLocation() - GetActorLocation();
	const bool bInRange = ToPlayer.SizeSquared2D() <= FMath::Square(RangeCm);
	const bool bInFront = FVector::DotProduct(GetActorForwardVector().GetSafeNormal2D(), ToPlayer.GetSafeNormal2D()) >= FrontConeCos;
	if (FerryCombat::IsDebugDrawEnabled())
	{
		DrawDebugCircle(GetWorld(), GetActorLocation(), RangeCm, 32, bInRange && bInFront ? FColor::Red : FColor::Orange, false, 0.3f,
			0, 3.0f, FVector(1, 0, 0), FVector(0, 1, 0), false);
	}
	const bool bHarmless = Attack.Attack.BaseDamage <= 0.0f && Attack.Attack.BasePostureDamage <= 0.0f; // e.g. "Rống đau"
	if (!bInRange || !bInFront || bHarmless)
	{
		return;
	}
	const EFerryDefenseOutcome Outcome = Combat->ReceiveEnemyAttack(Attack.Attack, this);
	if ((Outcome == EFerryDefenseOutcome::Hit || Outcome == EFerryDefenseOutcome::Guarded) && Data->Tuning.bHitStopAppliesToAttacker)
	{
		TriggerHitStop(ArpgCore::ComputeHitStopDuration(Data->Core.HitStop, Attack.Attack.Weight));
	}
	if (AttackView != nullptr && AttackView->PushbackM > 0.0f)
	{
		if (ACharacter* PlayerCharacter = Cast<ACharacter>(Player))
		{
			// Rough pushback: launch speed so that friction-free travel would be PushbackM in ~0.25 s. VERIFY tuning.
			PlayerCharacter->LaunchCharacter(ToPlayer.GetSafeNormal2D() * AttackView->PushbackM * 100.0f / 0.25f, true, false);
		}
	}
}

void AFerryEnemy::EndAttack(float RecoverSeconds)
{
	AttackTimeline.Cancel();
	CurrentAttack = INDEX_NONE;
	if (bHasToken)
	{
		if (AFerryGameMode* GameMode = GetWorld()->GetAuthGameMode<AFerryGameMode>())
		{
			GameMode->ReleaseAttackToken(this);
		}
		bHasToken = false;
	}
	EnterState(EFerryEnemyState::Recover, RecoverSeconds);
}

FFerryHitReport AFerryEnemy::ReceivePlayerHit(const FFerryPlayerHit& Hit)
{
	FFerryHitReport Report;
	if (!IsTargetable() || !Data.IsValid())
	{
		return Report;
	}
	if (State == EFerryEnemyState::Idle)
	{
		EnterState(EFerryEnemyState::Chase);
	}
	if (bIsBoss)
	{
		if (Khoen->IsPrying())
		{
			return Report; // regular hits are ignored while prying
		}
		const ArpgCore::FBossHitResult Result = Khoen->ReceivePlayerHit(Hit.Attack, Hit.Weapon);
		Report.bLanded = true;
		Report.bPostureBroken = Result.bPostureBroken || Result.bFinalStagger;
		return Report;
	}

	ArpgCore::FDamageContext Context;
	Context.bAttackerIsPlayer = true;
	Context.bTargetStaggered = Posture->IsStaggered();
	Context.StaggerMultiplier = Posture->GetDamageMultiplier();
	if (Hit.Attacker != nullptr)
	{
		const FVector ToAttacker = (Hit.Attacker->GetActorLocation() - GetActorLocation()).GetSafeNormal2D();
		if (FVector::DotProduct(GetActorForwardVector().GetSafeNormal2D(), ToAttacker) >= FrontConeCos)
		{
			Context.TargetDamageReduction = FMath::Clamp(1.0f - EnemyConfig.FrontDamageMult, 0.0f, 1.0f);
		}
	}
	const ArpgCore::FDamageResult Damage = ArpgCore::ComputeDamage(Hit.Attack, Hit.Weapon, Hit.Difficulty, Context);
	Health = FMath::Max(0.0f, Health - Damage.Health);
	Report.bLanded = true;
	Report.bPostureBroken = Posture->ApplyDamage(Damage.Posture);

	if (Health <= 0.0f)
	{
		BeginLeaving();
		return Report;
	}
	if (Report.bPostureBroken)
	{
		if (State == EFerryEnemyState::Attack)
		{
			EndAttack(0.0f);
		}
		EnterState(EFerryEnemyState::Staggered);
	}
	else if (State == EFerryEnemyState::Attack && AttackTimeline.GetPhase() == ArpgCore::EActionPhase::Startup
		&& Damage.Posture >= EnemyConfig.InterruptThreshold)
	{
		// interrupt_threshold: enough posture damage cancels the wind-up (pause length: player light hitstun, placeholder)
		EndAttack(Data->Core.Player.HitstunLight);
	}
	return Report;
}

void AFerryEnemy::ReceivePostureDamage(float Amount)
{
	if (!IsTargetable())
	{
		return;
	}
	if (bIsBoss)
	{
		Khoen->ReceivePostureDamage(Amount);
		return;
	}
	if (Posture.IsSet() && Posture->ApplyDamage(Amount))
	{
		if (State == EFerryEnemyState::Attack)
		{
			EndAttack(0.0f);
		}
		EnterState(EFerryEnemyState::Staggered);
	}
}

void AFerryEnemy::TriggerHitStop(float Duration)
{
	HitStopClock.Trigger(Duration);
}

void AFerryEnemy::NotifyPryStarted()
{
	if (State == EFerryEnemyState::Attack)
	{
		EndAttack(0.0f);
	}
	State = EFerryEnemyState::Prying;
}

void AFerryEnemy::HandlePryResult(EFerryPryResult Result)
{
	if (!Data.IsValid())
	{
		return;
	}
	float Stop = 0.0f;
	if (Result == EFerryPryResult::BeatHit)
	{
		Stop = Data->Core.HitStop.PryBeatDuration;
	}
	else if (Result == EFerryPryResult::Freed)
	{
		Stop = Data->Core.HitStop.PryReleaseDuration;
	}
	if (Stop > 0.0f)
	{
		TriggerHitStop(Stop);
		if (APawn* Player = GetPlayerPawn())
		{
			if (UFerryCombatComponent* Combat = Player->FindComponentByClass<UFerryCombatComponent>())
			{
				Combat->TriggerHitStop(Stop);
			}
		}
	}
	UE_LOG(LogFerry, Log, TEXT("pry: %s"), *UEnum::GetValueAsString(Result));
}

void AFerryEnemy::BeginLeaving()
{
	if (IsFinished())
	{
		return;
	}
	if (State == EFerryEnemyState::Attack)
	{
		EndAttack(0.0f);
	}
	const bool bDissipate = View != nullptr && View->DefeatBehavior == FName(TEXT("dissipate"));
	// Boss: the silence after the release (pry.silence_after_s) happens before it walks away.
	const float Silence = bIsBoss ? Khoen->GetSilenceAfter() : 0.0f;
	EnterState(EFerryEnemyState::Leaving, bDissipate ? DissipateSeconds : Silence + LeaveSeconds);
	LeaveStartScale = BodyVisual->GetRelativeScale3D();
	SetActorEnableCollision(false);
	if (AFerryGameMode* GameMode = GetWorld()->GetAuthGameMode<AFerryGameMode>())
	{
		GameMode->NotifyEnemyFinished(this);
	}
	UE_LOG(LogFerry, Log, TEXT("%s leaves (%s)"), *EnemyId.ToString(),
		bIsBoss ? *UEnum::GetValueAsString(Khoen->GetOutcome()) : *View->DefeatBehavior.ToString());
}

bool AFerryEnemy::IsTargetable() const
{
	return Data.IsValid() && !IsFinished();
}

float AFerryEnemy::GetHealthRatio() const
{
	if (bIsBoss)
	{
		return Khoen->GetHealthRatio();
	}
	return EnemyConfig.MaxHealth > 0.0f ? FMath::Clamp(Health / EnemyConfig.MaxHealth, 0.0f, 1.0f) : 0.0f;
}

float AFerryEnemy::GetPostureRatio() const
{
	if (bIsBoss)
	{
		return Khoen->GetPostureRatio();
	}
	return Posture.IsSet() ? Posture->GetRatio() : 0.0f;
}

float AFerryEnemy::GetBodyRadius() const
{
	return GetCapsuleComponent()->GetScaledCapsuleRadius();
}

FText AFerryEnemy::GetDisplayName() const
{
	const UFerryDataSubsystem* DataSubsystem = UFerryDataSubsystem::Get(this);
	if (DataSubsystem != nullptr && View != nullptr)
	{
		return DataSubsystem->Localize(View->Name);
	}
	return FText::FromName(EnemyId);
}

void AFerryEnemy::UpdateTelegraphVisual()
{
	FLinearColor Color = bIsBoss ? ColorBoss : (EnemyConfig.Rank == "elite" ? ColorElite : ColorNormal);
	bool bRedBronze = false;
	if (State == EFerryEnemyState::Attack && CurrentAttack != INDEX_NONE)
	{
		const ArpgCore::FEnemyAttack& Attack = Attacks[static_cast<size_t>(CurrentAttack)];
		const FFerryEnemyAttackView* AttackView = View != nullptr ? View->Attacks.Find(FerryCombat::ToName(Attack.Id)) : nullptr;
		bRedBronze = (AttackView != nullptr && AttackView->bColorCue) || Attack.Attack.bUnparryable;
		const ArpgCore::EActionPhase Phase = AttackTimeline.GetPhase();
		if (Phase == ArpgCore::EActionPhase::Startup)
		{
			Color = bRedBronze ? ColorRedBronze : ColorWindup;
			// Telegraph marker above the head (graybox stand-in for animation + sound cues).
			DrawDebugSphere(GetWorld(), GetActorLocation() + FVector(0.0f, 0.0f, GetCapsuleComponent()->GetScaledCapsuleHalfHeight() + 40.0f),
				bRedBronze ? 30.0f : 18.0f, 12, bRedBronze ? ColorRedBronze.ToFColor(true) : ColorWindup.ToFColor(true), false, -1.0f, 0, 2.0f);
		}
		else if (Phase == ArpgCore::EActionPhase::Active)
		{
			Color = ColorActive;
		}
	}
	else if (State == EFerryEnemyState::Staggered)
	{
		Color = ColorStaggered;
	}
	else if (State == EFerryEnemyState::Prying)
	{
		Color = ColorPrying;
	}
	if (BodyMaterial != nullptr)
	{
		BodyMaterial->SetVectorParameterValue(ColorParam, Color);
	}
}
