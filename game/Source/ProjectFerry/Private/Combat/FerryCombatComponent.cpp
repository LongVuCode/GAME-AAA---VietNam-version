// FerryCombatComponent.cpp - NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#include "Combat/FerryCombatComponent.h"
#include "Combat/FerryCombatUtils.h"

#include "Data/FerryDataSubsystem.h"
#include "DrawDebugHelpers.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Enemy/FerryEnemy.h"
#include "GameFramework/Actor.h"
#include "ProjectFerry.h"

UFerryCombatComponent::UFerryCombatComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	PrimaryComponentTick.bStartWithTickEnabled = true;
}

void UFerryCombatComponent::BeginPlay()
{
	Super::BeginPlay();
	if (!InitializeFromData())
	{
		UE_LOG(LogFerry, Error, TEXT("UFerryCombatComponent on %s: no design data, combat disabled"), *GetNameSafe(GetOwner()));
	}
}

bool UFerryCombatComponent::InitializeFromData()
{
	const UFerryDataSubsystem* DataSubsystem = UFerryDataSubsystem::Get(this);
	Data = DataSubsystem != nullptr ? DataSubsystem->GetData() : TSharedPtr<const FFerryDesignData>();
	if (!Data.IsValid())
	{
		return false;
	}
	const ArpgCore::FArpgConfig& Core = Data->Core;
	Difficulty = DataSubsystem->GetActiveDifficulty();
	Defense.Emplace(Core.Combat.Dodge, Core.Combat.Parry, Difficulty.ParryWindowScale);
	Posture.Emplace(Core.Player.Posture);
	Drum.Emplace(Core.Drum);
	HitStopClock = ArpgCore::FHitStopClock(Core.HitStop.TimeScaleDuringStop);
	Health = Core.Player.MaxHealth;
	StunRemaining = 0.0f;
	BurstHitsLeft = 0;
	bDead = false;

	// Default weapon: lowest slot (Cói's slot 1 in Demo 0.1).
	const FName FirstWeapon = Data->WeaponsBySlot.Num() > 0 ? Data->WeaponsBySlot[0] : NAME_None;
	return EquipWeapon(EquippedWeapon.IsNone() ? FirstWeapon : EquippedWeapon);
}

bool UFerryCombatComponent::EquipWeapon(FName WeaponId)
{
	if (!Data.IsValid())
	{
		return false;
	}
	const std::string Id = FerryCombat::ToStd(WeaponId);
	const ArpgCore::FMovesetConfig* Moveset = Data->Core.FindMoveset(Id);
	const FFerryWeaponView* View = Data->FindWeapon(WeaponId);
	if (Moveset == nullptr || View == nullptr)
	{
		UE_LOG(LogFerry, Warning, TEXT("EquipWeapon: unknown weapon '%s'"), *WeaponId.ToString());
		return false;
	}
	ArpgCore::TResult<ArpgCore::FComboGraph> NewGraph = ArpgCore::BuildComboGraph(*Moveset);
	if (!NewGraph.IsOk())
	{
		UE_LOG(LogFerry, Error, TEXT("EquipWeapon '%s': combo graph error: %s"), *WeaponId.ToString(),
			UTF8_TO_TCHAR(NewGraph.ErrorSummary().c_str()));
		return false;
	}
	Runner.Reset(); // the runner points at Graph: destroy it before replacing the graph
	Graph = MoveTemp(NewGraph.GetValue());
	const ArpgCore::FWeaponConfig* WeaponConfig = Data->Core.FindWeapon(Id);
	Weapon = WeaponConfig != nullptr ? *WeaponConfig : ArpgCore::FWeaponConfig();
	Burst = Moveset->Burst;
	WeaponView = View;
	EquippedWeapon = WeaponId;
	ResetRunner();
	UE_LOG(LogFerry, Log, TEXT("equipped %s (%d moves)"), *WeaponId.ToString(), static_cast<int32>(Graph.NumMoves()));
	return true;
}

void UFerryCombatComponent::ResetRunner()
{
	if (!Data.IsValid())
	{
		return;
	}
	Runner = MakeUnique<ArpgCore::FComboRunner>(Graph, ArpgCore::MakeRunnerConfig(Data->Core.Combat));
	// Skill points / skill tree are not implemented yet, so skill-gated moves (e.g. sk_vo_noi_don) stay locked
	// as at the start of the demo; world flags (e.g. flag_boss_lon_loi_freed for the house move) are added
	// through AddUnlock.
	std::set<std::string> Unlocked;
	for (const FName& Id : Unlocks)
	{
		Unlocked.insert(FerryCombat::ToStd(Id));
	}
	Runner->SetUnlocked(std::move(Unlocked));
	HitThisAction.Reset();
}

void UFerryCombatComponent::AddUnlock(FName UnlockId)
{
	if (UnlockId.IsNone() || Unlocks.Contains(UnlockId))
	{
		return;
	}
	Unlocks.Add(UnlockId);
	UE_LOG(LogFerry, Log, TEXT("unlocked: %s"), *UnlockId.ToString());
	if (Runner.IsValid() && !Runner->IsActing())
	{
		ResetRunner();
	}
}

void UFerryCombatComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	if (!Data.IsValid() || !Runner.IsValid())
	{
		return;
	}
	// DeltaTime is already scaled by the owner's CustomTimeDilation (our own hit-stop), so the clock is
	// driven by the world delta instead; ArpgCore turns it into the game delta.
	const float RealDt = static_cast<float>(GetWorld()->GetDeltaSeconds());
	const float GameDt = HitStopClock.Advance(RealDt);
	FerryCombat::ApplyHitStopDilation(GetOwner(), HitStopClock.IsStopped(), Data->Core.HitStop.TimeScaleDuringStop);
	if (bDead)
	{
		return;
	}

	Defense->Tick(GameDt);
	Posture->Tick(GameDt);
	Drum->Tick(GameDt);
	StunRemaining = FMath::Max(0.0f, StunRemaining - GameDt);

	const ArpgCore::FComboTickResult Result = Runner->Tick(GameDt);
	if (Result.StartedMove != ArpgCore::FComboGraph::RootNode)
	{
		HitThisAction.Reset();
		OnActionStarted.Broadcast();
	}
	if (Result.bHitWindowOpened && Runner->GetCurrentMove() != ArpgCore::FComboGraph::RootNode)
	{
		const ArpgCore::FComboMove& Move = Graph.GetMove(Runner->GetCurrentMove());
		const FFerryMoveView* View = WeaponView != nullptr ? WeaponView->Moves.Find(FerryCombat::ToName(Move.Id)) : nullptr;
		SweepHit(Move.Attack, View != nullptr ? View->RangeM : 2.0f, View != nullptr ? View->ArcDeg : 60.0f,
			View != nullptr && View->bHeavyInput);
	}
	TickBurst(GameDt);
}

void UFerryCombatComponent::SweepHit(const ArpgCore::FAttackData& Attack, float RangeM, float ArcDeg, bool bHeavy)
{
	AActor* Owner = GetOwner();
	UWorld* World = GetWorld();
	if (Owner == nullptr || World == nullptr)
	{
		return;
	}
	const FVector Origin = Owner->GetActorLocation();
	const FVector Forward = Owner->GetActorForwardVector().GetSafeNormal2D();
	const float RangeCm = RangeM * 100.0f;
	const float HalfArcCos = ArcDeg >= 360.0f ? -1.0f : FMath::Cos(FMath::DegreesToRadians(ArcDeg * 0.5f));

	if (FerryCombat::IsDebugDrawEnabled())
	{
		DrawDebugCircle(World, Origin, RangeCm, 32, FColor::Cyan, false, 0.3f, 0, 2.0f, FVector(1, 0, 0), FVector(0, 1, 0), false);
	}

	FFerryPlayerHit Hit;
	Hit.Attack = Attack;
	Hit.Weapon = Weapon;
	Hit.Difficulty = Difficulty;
	Hit.Attacker = Owner;
	Hit.bHeavy = bHeavy;

	for (TActorIterator<AFerryEnemy> It(World); It; ++It)
	{
		AFerryEnemy* Enemy = *It;
		if (Enemy == nullptr || !Enemy->IsTargetable() || HitThisAction.Contains(Enemy))
		{
			continue;
		}
		const FVector ToEnemy = Enemy->GetActorLocation() - Origin;
		const float Reach = RangeCm + Enemy->GetBodyRadius();
		if (ToEnemy.SizeSquared2D() > FMath::Square(Reach))
		{
			continue;
		}
		const FVector Dir = ToEnemy.GetSafeNormal2D();
		if (!Dir.IsNearlyZero() && static_cast<float>(FVector::DotProduct(Forward, Dir)) < HalfArcCos)
		{
			continue;
		}
		HitThisAction.Add(Enemy);
		const FFerryHitReport Report = Enemy->ReceivePlayerHit(Hit);
		if (!Report.bLanded)
		{
			continue;
		}
		Drum->AddEvent(bHeavy ? ArpgCore::EDrumEvent::HeavyHit : ArpgCore::EDrumEvent::HitLanded);
		if (Report.bPostureBroken)
		{
			Drum->AddEvent(ArpgCore::EDrumEvent::PostureBreak);
		}
		const float Stop = ArpgCore::ComputeHitStopDuration(Data->Core.HitStop, Attack.Weight);
		if (Data->Tuning.bHitStopAppliesToAttacker)
		{
			TriggerHitStop(Stop);
		}
		if (Data->Tuning.bHitStopAppliesToTarget)
		{
			Enemy->TriggerHitStop(Stop);
		}
	}
}

void UFerryCombatComponent::TickBurst(float GameDt)
{
	if (BurstHitsLeft <= 0)
	{
		return;
	}
	BurstTimer -= GameDt;
	while (BurstHitsLeft > 0 && BurstTimer <= 0.0f)
	{
		ArpgCore::FAttackData Attack;
		const float Hits = static_cast<float>(FMath::Max(1, Burst.Hits));
		Attack.BaseDamage = Burst.DamageTotal / Hits;
		Attack.BasePostureDamage = Burst.PostureDamageTotal / Hits;
		Attack.Weight = Burst.Weight;
		HitThisAction.Reset(); // every burst hit may strike the same target again
		OnActionStarted.Broadcast();
		SweepHit(Attack, WeaponView != nullptr ? WeaponView->BurstRangeM : 2.0f, 120.0f, true);
		--BurstHitsLeft;
		BurstTimer += BurstInterval;
	}
}

void UFerryCombatComponent::PressLight()
{
	if (Runner.IsValid() && !IsDead() && !bActionLocked && StunRemaining <= 0.0f && !IsPostureBroken() && BurstHitsLeft == 0)
	{
		Runner->PressInput(ArpgCore::EInputType::Light);
	}
}

void UFerryCombatComponent::PressHeavy()
{
	if (Runner.IsValid() && !IsDead() && !bActionLocked && StunRemaining <= 0.0f && !IsPostureBroken() && BurstHitsLeft == 0)
	{
		Runner->PressInput(ArpgCore::EInputType::Heavy);
	}
}

bool UFerryCombatComponent::PressDodge()
{
	if (!Runner.IsValid() || IsDead() || bActionLocked || StunRemaining > 0.0f || IsPostureBroken() || BurstHitsLeft > 0)
	{
		return false;
	}
	if (Defense->IsBusy() || !Runner->TryCancelForDefense())
	{
		return false;
	}
	if (!Defense->StartDodge())
	{
		return false;
	}
	Runner->NotifyDodge(); // opens the "dodge,L" context
	const ArpgCore::FDodgeConfig& Dodge = Data->Core.Combat.Dodge;
	OnDodgeStarted.Broadcast(Data->Tuning.DodgeDistanceM * 100.0f, Dodge.Duration);
	return true;
}

bool UFerryCombatComponent::PressParry()
{
	if (!Runner.IsValid() || IsDead() || bActionLocked || StunRemaining > 0.0f || IsPostureBroken() || BurstHitsLeft > 0)
	{
		return false;
	}
	Defense->SetGuarding(true); // holding the button keeps the guard up
	if (Defense->IsBusy() || !Runner->TryCancelForDefense())
	{
		return false;
	}
	return Defense->StartParry();
}

void UFerryCombatComponent::ReleaseParry()
{
	if (Defense.IsSet())
	{
		Defense->SetGuarding(false);
	}
}

bool UFerryCombatComponent::PressDrum()
{
	if (!Runner.IsValid() || IsDead() || bActionLocked || StunRemaining > 0.0f || IsPostureBroken() || BurstHitsLeft > 0)
	{
		return false;
	}
	if (!Drum->CanSurge() || !Runner->TryCancelForDefense())
	{
		return false;
	}
	if (!Drum->TrySurge())
	{
		return false;
	}
	BurstHitsLeft = FMath::Max(1, Burst.Hits);
	BurstInterval = Burst.Duration / static_cast<float>(BurstHitsLeft);
	BurstTimer = BurstInterval * 0.5f;
	return true;
}

void UFerryCombatComponent::SetActionLock(bool bLocked, bool bInvulnerable)
{
	bActionLocked = bLocked;
	bInvulnerableLock = bLocked && bInvulnerable;
	if (bLocked && Runner.IsValid())
	{
		ResetRunner();
		BurstHitsLeft = 0;
	}
}

EFerryDefenseOutcome UFerryCombatComponent::ReceiveEnemyAttack(const ArpgCore::FAttackData& Attack, AActor* Attacker)
{
	if (!Data.IsValid() || bDead || bInvulnerableLock)
	{
		return EFerryDefenseOutcome::Ignored;
	}
	if (BurstHitsLeft > 0 && Burst.bInvulnerable)
	{
		return EFerryDefenseOutcome::Ignored;
	}
	const ArpgCore::FArpgConfig& Core = Data->Core;
	Drum->NotifyCombatActivity();

	// Player is the defender: the enemy weapon is neutral (enemy damage values are absolute in data).
	ArpgCore::FDamageContext Context;
	Context.bAttackerIsPlayer = false;
	Context.bTargetStaggered = Posture->IsStaggered();
	Context.StaggerMultiplier = 1.0f;
	const ArpgCore::FDamageResult Damage = ArpgCore::ComputeDamage(Attack, ArpgCore::FWeaponConfig(), Difficulty, Context);

	const ArpgCore::EDefenseOutcome Outcome = Defense->ResolveIncoming(Attack);
	AFerryEnemy* EnemyAttacker = Cast<AFerryEnemy>(Attacker);
	switch (Outcome)
	{
	case ArpgCore::EDefenseOutcome::Dodged:
		return EFerryDefenseOutcome::Dodged;
	case ArpgCore::EDefenseOutcome::PerfectDodge:
		Drum->AddEvent(ArpgCore::EDrumEvent::PerfectDodge);
		return EFerryDefenseOutcome::PerfectDodge;
	case ArpgCore::EDefenseOutcome::Parried:
	case ArpgCore::EDefenseOutcome::PerfectParry:
	{
		const bool bPerfect = Outcome == ArpgCore::EDefenseOutcome::PerfectParry;
		const ArpgCore::FParryExchange Exchange = ArpgCore::ComputeParryExchange(Attack, bPerfect, Core.Combat.Parry, Difficulty, true);
		if (EnemyAttacker != nullptr)
		{
			EnemyAttacker->ReceivePostureDamage(Exchange.AttackerPosture);
		}
		if (Posture->ApplyDamage(Exchange.DefenderPosture))
		{
			StunRemaining = Posture->GetStaggerRemaining();
			ResetRunner();
		}
		Drum->AddEvent(bPerfect ? ArpgCore::EDrumEvent::PerfectParry : ArpgCore::EDrumEvent::Parry);
		if (bPerfect)
		{
			Runner->NotifyPerfectParry(); // opens the "perfect_parry,L" counter context
		}
		const float Stop = ArpgCore::ComputeHitStopDuration(Core.HitStop, Attack.Weight, bPerfect);
		TriggerHitStop(Stop);
		if (EnemyAttacker != nullptr && Data->Tuning.bHitStopAppliesToTarget)
		{
			EnemyAttacker->TriggerHitStop(Stop);
		}
		return bPerfect ? EFerryDefenseOutcome::PerfectParry : EFerryDefenseOutcome::Parried;
	}
	case ArpgCore::EDefenseOutcome::Guarded:
		ApplyHitTaken(ArpgCore::ApplyGuard(Damage, Core.Combat.Guard), Attack);
		return EFerryDefenseOutcome::Guarded;
	case ArpgCore::EDefenseOutcome::Hit:
	default:
		ApplyHitTaken(Damage, Attack);
		return EFerryDefenseOutcome::Hit;
	}
}

void UFerryCombatComponent::ApplyHitTaken(const ArpgCore::FDamageResult& Damage, const ArpgCore::FAttackData& Attack)
{
	const ArpgCore::FArpgConfig& Core = Data->Core;
	Health = FMath::Max(0.0f, Health - Damage.Health);
	Drum->OnHitTaken();
	const bool bSuperArmor = BurstHitsLeft > 0 && Burst.bSuperArmor;
	const bool bBroken = Posture->ApplyDamage(Damage.Posture);
	if (!bSuperArmor)
	{
		if (bBroken)
		{
			StunRemaining = Posture->GetStaggerRemaining(); // guard-break stun
		}
		else if (Damage.Health > 0.0f)
		{
			StunRemaining = FMath::Max(StunRemaining,
				Attack.Weight >= ArpgCore::HitWeightHeavy ? Core.Player.HitstunHeavy : Core.Player.HitstunLight);
		}
		if (bBroken || Damage.Health > 0.0f)
		{
			ResetRunner(); // interrupt the current move
			BurstHitsLeft = 0;
		}
	}
	TriggerHitStop(ArpgCore::ComputeHitStopDuration(Core.HitStop, Attack.Weight));
	if (Health <= 0.0f)
	{
		Die();
	}
}

void UFerryCombatComponent::Die()
{
	if (bDead)
	{
		return;
	}
	bDead = true;
	BurstHitsLeft = 0;
	ReleaseParry();
	UE_LOG(LogFerry, Log, TEXT("player died"));
	OnDied.Broadcast();
}

void UFerryCombatComponent::TriggerHitStop(float Duration)
{
	HitStopClock.Trigger(Duration);
}

void UFerryCombatComponent::ResetForRespawn()
{
	InitializeFromData();
	bActionLocked = false;
	bInvulnerableLock = false;
}

float UFerryCombatComponent::GetMaxHealth() const
{
	return Data.IsValid() ? Data->Core.Player.MaxHealth : 1.0f;
}

float UFerryCombatComponent::GetPostureRatio() const
{
	return Posture.IsSet() ? Posture->GetRatio() : 0.0f;
}

bool UFerryCombatComponent::IsPostureBroken() const
{
	return Posture.IsSet() && Posture->IsStaggered();
}

int32 UFerryCombatComponent::GetDrumFullNotches() const
{
	return Drum.IsSet() ? Drum->GetFullNotches() : 0;
}

int32 UFerryCombatComponent::GetDrumNotchCount() const
{
	return Data.IsValid() ? Data->Core.Drum.Notches : 0;
}

float UFerryCombatComponent::GetDrumPoints() const
{
	return Drum.IsSet() ? Drum->GetPoints() : 0.0f;
}

float UFerryCombatComponent::GetDrumPointsPerNotch() const
{
	return Data.IsValid() ? Data->Core.Drum.PointsPerNotch : 1.0f;
}

bool UFerryCombatComponent::CanDrumSurge() const
{
	return Drum.IsSet() && Drum->CanSurge();
}

bool UFerryCombatComponent::IsDodging() const
{
	return Defense.IsSet() && Defense->GetAction() == ArpgCore::EDefenseAction::Dodge;
}

bool UFerryCombatComponent::IsGuarding() const
{
	return Defense.IsSet() && Defense->IsGuarding();
}

bool UFerryCombatComponent::IsBusy() const
{
	return bDead || bActionLocked || StunRemaining > 0.0f || IsPostureBroken() || BurstHitsLeft > 0
		|| (Runner.IsValid() && Runner->IsActing());
}
