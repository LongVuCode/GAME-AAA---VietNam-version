// Config.cpp - Semantic validation of FArpgConfig and runtime builders.
#include "ArpgCore/Config.h"

#include <cmath>
#include <set>

namespace ArpgCore
{
namespace
{
std::string Idx(const std::string& Path, std::size_t Index)
{
	return Path + "[" + std::to_string(Index) + "]";
}

void Append(std::vector<FError>& Out, const std::vector<FError>& In, const std::string& Prefix)
{
	for (const FError& E : In)
	{
		Out.push_back(FError{E.Path.empty() ? Prefix : Prefix + "." + E.Path, E.Message});
	}
}

/** Small helper that records "path: message" when a check fails. */
struct FChecker
{
	std::vector<FError>& Errors;

	void Check(bool bCondition, const std::string& Path, const char* Message)
	{
		if (!bCondition)
		{
			Errors.push_back(FError{Path, Message});
		}
	}
	void NonNegative(float Value, const std::string& Path)
	{
		Check(std::isfinite(Value) && Value >= 0.0f, Path, "must be >= 0");
	}
	void Positive(float Value, const std::string& Path)
	{
		Check(std::isfinite(Value) && Value > 0.0f, Path, "must be > 0");
	}
	void Unit(float Value, const std::string& Path)
	{
		Check(Value >= 0.0f && Value <= 1.0f, Path, "must be in [0, 1]");
	}
	void UniqueId(const std::string& Id, std::set<std::string>& Seen, const std::string& Path)
	{
		Check(!Id.empty(), Path, "must not be empty");
		Check(Id.empty() || Seen.insert(Id).second, Path, "duplicate id");
	}
};

void ValidatePosture(const FPostureConfig& Po, const std::string& Path, FChecker& C)
{
	C.Positive(Po.MaxPosture, Path + ".max_posture");
	C.NonNegative(Po.RegenPerSecond, Path + ".regen_per_second");
	C.NonNegative(Po.RegenDelay, Path + ".regen_delay");
	C.Positive(Po.StaggerDuration, Path + ".stagger_duration");
	C.NonNegative(Po.StaggerDamageMultiplier, Path + ".stagger_damage_multiplier");
	C.Check(Po.PostureAfterStagger >= 0.0f && Po.PostureAfterStagger < 1.0f, Path + ".posture_after_stagger",
		"must be in [0, 1)");
}

void ValidateAttack(const FAttackData& A, const std::string& Path, FChecker& C)
{
	C.NonNegative(A.BaseDamage, Path + ".damage");
	C.NonNegative(A.BasePostureDamage, Path + ".posture_damage");
	C.NonNegative(A.Weight, Path + ".weight");
}

void ValidateCombat(const FCombatConfig& Combat, FChecker& C)
{
	C.NonNegative(Combat.Runner.InputBufferWindow, "combat.input_buffer_window");
	C.Check(Combat.Runner.InputBufferCapacity >= 1, "combat.input_buffer_capacity", "must be >= 1");
	C.NonNegative(Combat.Runner.ChainLinkWindow, "combat.chain_link_window");
	C.NonNegative(Combat.Runner.AfterDodgeWindow, "combat.after_dodge_window");
	C.NonNegative(Combat.Runner.AfterPerfectParryWindow, "combat.after_perfect_parry_window");
	C.NonNegative(Combat.ComboPauseThreshold, "combat.combo_pause_threshold");
	C.NonNegative(Combat.Runner.DefenseCancelDelay, "combat.defense_cancel_delay");

	const FDodgeConfig& D = Combat.Dodge;
	C.Positive(D.Duration, "combat.dodge.duration");
	C.NonNegative(D.Recovery, "combat.dodge.recovery");
	C.Check(D.IFrameStart >= 0.0f && D.IFrameStart <= D.IFrameEnd && D.IFrameEnd <= D.Duration, "combat.dodge",
		"requires 0 <= iframe_start <= iframe_end <= duration");
	C.Check(D.PerfectWindow >= 0.0f && D.PerfectWindow <= D.IFrameEnd - D.IFrameStart, "combat.dodge.perfect_window",
		"must be in [0, iframe_end - iframe_start]");

	const FParryConfig& P = Combat.Parry;
	C.Positive(P.Window, "combat.parry.window");
	C.Check(P.PerfectWindow >= 0.0f && P.PerfectWindow <= P.Window, "combat.parry.perfect_window", "must be in [0, window]");
	C.Check(P.Window <= P.Duration, "combat.parry.duration", "must be >= window");
	C.NonNegative(P.AttackerPostureFlatOnParry, "combat.parry.attacker_posture_flat_on_parry");
	C.NonNegative(P.AttackerPostureFlatOnPerfectParry, "combat.parry.attacker_posture_flat_on_perfect_parry");
	C.NonNegative(P.AttackerPostureOnParry, "combat.parry.attacker_posture_on_parry");
	C.NonNegative(P.AttackerPostureOnPerfectParry, "combat.parry.attacker_posture_on_perfect_parry");
	C.NonNegative(P.DefenderPostureOnParry, "combat.parry.defender_posture_on_parry");
	C.NonNegative(P.DefenderPostureOnPerfectParry, "combat.parry.defender_posture_on_perfect_parry");
	C.Unit(Combat.Guard.DamageReduction, "combat.guard.damage_reduction");
	C.NonNegative(Combat.Guard.PostureDamageMult, "combat.guard.posture_damage_mult");
}

void ValidateMoveset(const FMovesetConfig& Set, const std::string& Path, FChecker& C)
{
	C.Check(!Set.WeaponId.empty(), Path + ".weapon_id", "must not be empty");
	std::set<std::string> Seen;
	for (std::size_t I = 0; I < Set.Moves.size(); ++I)
	{
		const FComboMove& Move = Set.Moves[I];
		const std::string MovePath = Idx(Path + ".moves", I);
		C.UniqueId(Move.Id, Seen, MovePath + ".id");
		C.NonNegative(Move.Timing.Startup, MovePath + ".startup");
		C.NonNegative(Move.Timing.Active, MovePath + ".active");
		C.NonNegative(Move.Timing.Recovery, MovePath + ".recovery");
		C.Check(Move.Timing.GetTotal() > 0.0f, MovePath, "action must last > 0 s");
		if (Move.Timing.CancelStart >= 0.0f && Move.Timing.CancelEnd >= 0.0f)
		{
			C.Check(Move.Timing.CancelStart <= Move.Timing.CancelEnd, MovePath + ".cancel_start", "must be <= cancel_end");
		}
		ValidateAttack(Move.Attack, MovePath, C);
	}
	C.Check(Set.Burst.Hits >= 1, Path + ".drum_burst.hits", "must be >= 1");
	C.NonNegative(Set.Burst.DamageTotal, Path + ".drum_burst.damage_total");
	C.NonNegative(Set.Burst.PostureDamageTotal, Path + ".drum_burst.the_damage_total");
	C.Positive(Set.Burst.Duration, Path + ".drum_burst.duration");

	const TResult<FComboGraph> Graph = BuildComboGraph(Set);
	if (!Graph)
	{
		Append(C.Errors, Graph.GetErrors(), Path);
	}
	else
	{
		Append(C.Errors, Graph.GetValue().Validate(), Path);
	}
}

void ValidateEnemyAttacks(const std::vector<FEnemyAttack>& Attacks, const std::string& Path, FChecker& C)
{
	std::set<std::string> Seen;
	for (std::size_t I = 0; I < Attacks.size(); ++I)
	{
		const FEnemyAttack& A = Attacks[I];
		const std::string AttackPath = Idx(Path + ".attacks", I);
		C.UniqueId(A.Id, Seen, AttackPath + ".id");
		ValidateAttack(A.Attack, AttackPath, C);
		C.NonNegative(A.Windup, AttackPath + ".windup");
		C.NonNegative(A.Hold, AttackPath + ".hold");
		C.Positive(A.Active, AttackPath + ".active");
		C.NonNegative(A.Recovery, AttackPath + ".recovery");
		C.Check(A.Hits >= 1, AttackPath + ".hits", "must be >= 1");
		C.NonNegative(A.Cooldown, AttackPath + ".cooldown");
	}
}

void ValidateDrops(const std::vector<FMaterialAmount>& Drops, const FCraftingDatabase& Crafting, const std::string& Path,
	FChecker& C)
{
	for (std::size_t I = 0; I < Drops.size(); ++I)
	{
		const FMaterialAmount& Drop = Drops[I];
		const std::string DropPath = Idx(Path, I);
		const FMaterialDef* Def = Crafting.FindMaterial(Drop.MaterialId);
		C.Check(Def != nullptr, DropPath, "unknown material");
		C.Check(Def == nullptr || Def->Category != EMaterialCategory::ShackleFragment, DropPath,
			"shackle fragments are never a reward (they grant no power)");
		C.Check(Drop.Amount > 0, DropPath + ".amount", "must be > 0");
	}
}

void ValidateBoss(const FBossConfig& Boss, const FCraftingDatabase& Crafting, const std::string& Path, FChecker& C)
{
	C.Positive(Boss.MaxHealth, Path + ".max_health");
	C.Check(Boss.HealthFloor >= 0.0f && Boss.HealthFloor < Boss.MaxHealth, Path + ".health_floor",
		"must be in [0, max_health)");
	ValidatePosture(Boss.Posture, Path + ".posture", C);

	const FShackleConfig& Sh = Boss.Shackle;
	if (Sh.bEnabled)
	{
		C.Check(Sh.CracksToOpen >= 1, Path + ".shackle.cracks_to_open", "must be >= 1");
		C.Check(Sh.PryBeats >= 1, Path + ".shackle.pry_beats", "must be >= 1");
		C.NonNegative(Sh.LeadIn, Path + ".shackle.lead_in");
		C.Positive(Sh.BeatInterval, Path + ".shackle.beat_interval");
		C.Check(Sh.BeatHalfWindow > 0.0f && Sh.BeatHalfWindow <= Sh.BeatInterval * 0.5f, Path + ".shackle.beat_half_window",
			"must be in (0, beat_interval / 2]");
		C.Check(Sh.MissRetriesPerBeat >= 0, Path + ".shackle.miss_retries_per_beat", "must be >= 0");
		C.Unit(Sh.MissPostureRecoverFraction, Path + ".shackle.miss_posture_recover_fraction");
		C.NonNegative(Sh.HoldDurationPerBeat, Path + ".shackle.hold_duration_per_beat");
	}
	// The shackled creature never dies; the fight ends by prying (DEMO §6, QA N1).
	C.Check(!Sh.bEnabled || (Boss.HealthFloor > 0.0f && Boss.bHealthFloorForcesFinalStagger), Path + ".health_floor",
		"a shackled boss needs health_floor > 0 that forces the final stagger");
	// No softlock: with a health floor the fight must still be able to end.
	C.Check(Boss.HealthFloor <= 0.0f || Sh.bEnabled || Boss.bHealthFloorForcesFinalStagger, Path,
		"health floor without shackle or forced final stagger: the fight can never end");
	C.Check(Sh.bEnabled || !Boss.FledDrops.empty() || Boss.FreedDrops.empty(), Path + ".fled_drops",
		"a boss with drops needs fallback drops for the disabled-shackle ending");

	for (std::size_t I = 0; I < Boss.Phases.size(); ++I)
	{
		const FBossPhase& Phase = Boss.Phases[I];
		const std::string PhasePath = Idx(Path + ".phases", I);
		C.Check(!Phase.Id.empty(), PhasePath + ".id", "must not be empty");
		if (I > 0)
		{
			C.Check(Phase.EnterCracksAtLeast >= 0 || Phase.EnterHealthRatioAtMost >= 0.0f, PhasePath + ".enter",
				"needs at least one condition");
		}
		C.Check(Phase.EnterHealthRatioAtMost <= 1.0f, PhasePath + ".enter.hp_ratio_at_most", "must be <= 1");
		C.Positive(Phase.SpeedMult, PhasePath + ".speed_mult");
		C.Positive(Phase.TelegraphTimeMult, PhasePath + ".telegraph_time_mult");
	}
	ValidateEnemyAttacks(Boss.Attacks, Path, C);
	ValidateDrops(Boss.FreedDrops, Crafting, Path + ".freed_drops", C);
	ValidateDrops(Boss.FledDrops, Crafting, Path + ".fled_drops", C);
}
} // namespace

const FWeaponConfig* FArpgConfig::FindWeapon(const std::string& Id) const
{
	for (const FWeaponConfig& W : Weapons)
	{
		if (W.Id == Id)
		{
			return &W;
		}
	}
	return nullptr;
}

const FMovesetConfig* FArpgConfig::FindMoveset(const std::string& WeaponId) const
{
	for (const FMovesetConfig& M : Movesets)
	{
		if (M.WeaponId == WeaponId)
		{
			return &M;
		}
	}
	return nullptr;
}

const FEnemyConfig* FArpgConfig::FindEnemy(const std::string& Id) const
{
	for (const FEnemyConfig& E : Enemies)
	{
		if (E.Id == Id)
		{
			return &E;
		}
	}
	return nullptr;
}

const FDifficultyConfig* FArpgConfig::FindDifficulty(const std::string& Id) const
{
	for (const FDifficultyConfig& D : Difficulties)
	{
		if (D.Id == Id)
		{
			return &D;
		}
	}
	return nullptr;
}

const FBossConfig* FArpgConfig::FindBoss(const std::string& Id) const
{
	for (const FBossConfig& B : Bosses)
	{
		if (B.Id == Id)
		{
			return &B;
		}
	}
	return nullptr;
}

TResult<FComboGraph> BuildComboGraph(const FMovesetConfig& Moveset)
{
	FComboGraph Graph;
	std::vector<FError> Errors;
	for (std::size_t I = 0; I < Moveset.Moves.size(); ++I)
	{
		if (Graph.AddMove(Moveset.Moves[I]) == FComboGraph::RootNode)
		{
			Errors.push_back(FError{Idx("moves", I) + ".id", "empty or duplicate move id"});
		}
	}
	for (std::size_t I = 0; I < Moveset.Combo.size(); ++I)
	{
		const FComboTransitionDef& T = Moveset.Combo[I];
		const FStatus Status = Graph.AddTransition(T.From, T.Input, T.MinDelay, T.MaxDelay, T.To);
		if (!Status)
		{
			Append(Errors, Status.GetErrors(), Idx("combo", I));
		}
	}
	if (!Errors.empty())
	{
		return TResult<FComboGraph>::Fail(std::move(Errors));
	}
	return TResult<FComboGraph>::Ok(std::move(Graph));
}

std::vector<FError> ValidateConfig(const FArpgConfig& Config)
{
	std::vector<FError> Errors;
	FChecker C{Errors};
	C.Check(Config.SchemaVersion == 1, "schema_version", "unsupported schema version (expected 1)");

	ValidateCombat(Config.Combat, C);
	C.Positive(Config.Player.MaxHealth, "player.max_health");
	ValidatePosture(Config.Player.Posture, "player.posture", C);
	C.Check(Config.Player.HealCharges >= 0, "player.heal_charges", "must be >= 0");
	C.Unit(Config.Player.HealRatio, "player.heal_ratio");

	std::set<std::string> Seen;
	for (std::size_t I = 0; I < Config.Movesets.size(); ++I)
	{
		const std::string Path = Idx("movesets", I);
		C.UniqueId(Config.Movesets[I].WeaponId, Seen, Path + ".weapon_id");
		ValidateMoveset(Config.Movesets[I], Path, C);
		C.Check(Config.FindWeapon(Config.Movesets[I].WeaponId) != nullptr, Path + ".weapon_id", "no weapon with this id");
	}

	Seen.clear();
	for (std::size_t I = 0; I < Config.Weapons.size(); ++I)
	{
		const FWeaponConfig& W = Config.Weapons[I];
		const std::string Path = Idx("weapons", I);
		C.UniqueId(W.Id, Seen, Path + ".id");
		C.NonNegative(W.DamageMultiplier, Path + ".damage_multiplier");
		C.NonNegative(W.PostureMultiplier, Path + ".posture_multiplier");
	}

	Seen.clear();
	for (std::size_t I = 0; I < Config.Difficulties.size(); ++I)
	{
		const FDifficultyConfig& D = Config.Difficulties[I];
		const std::string Path = Idx("difficulties", I);
		C.UniqueId(D.Id, Seen, Path + ".id");
		C.NonNegative(D.DamageToPlayerMultiplier, Path + ".damage_to_player_multiplier");
		C.NonNegative(D.DamageToEnemyMultiplier, Path + ".damage_to_enemy_multiplier");
		C.NonNegative(D.PostureToEnemyMultiplier, Path + ".posture_to_enemy_multiplier");
		C.Positive(D.ParryWindowScale, Path + ".parry_window_scale");
		C.Positive(D.PryBeatWindowScale, Path + ".pry_beat_window_scale");
		C.Positive(D.EnemySpeedMultiplier, Path + ".enemy_speed_mult");
		C.Positive(D.TelegraphTimeMultiplier, Path + ".telegraph_time_mult");
	}
	C.Check(Config.DefaultDifficultyId.empty() || Config.FindDifficulty(Config.DefaultDifficultyId) != nullptr,
		"difficulty.default", "unknown difficulty");

	const FHitStopConfig& H = Config.HitStop;
	for (std::size_t I = 0; I < H.Curve.size(); ++I)
	{
		C.NonNegative(H.Curve[I].Duration, Idx("hit_stop.curve", I) + ".duration");
		if (I > 0)
		{
			C.Check(H.Curve[I].Weight > H.Curve[I - 1].Weight, Idx("hit_stop.curve", I) + ".weight",
				"weights must be strictly ascending");
		}
	}
	C.NonNegative(H.MinDuration, "hit_stop.min_duration");
	C.Check(H.MaxDuration >= H.MinDuration, "hit_stop.max_duration", "must be >= min_duration");
	C.Unit(H.TimeScaleDuringStop, "hit_stop.time_scale_during_stop");
	C.NonNegative(H.PerfectParryBonus, "hit_stop.perfect_parry_bonus");

	const FDrumConfig& Dr = Config.Drum;
	C.Check(Dr.Notches >= 1, "drum.notches", "must be >= 1");
	C.Positive(Dr.PointsPerNotch, "drum.points_per_notch");
	C.NonNegative(Dr.PerfectParryGain, "drum.perfect_parry_gain");
	C.NonNegative(Dr.PerfectDodgeGain, "drum.perfect_dodge_gain");
	C.NonNegative(Dr.HitGain, "drum.hit_gain");
	C.NonNegative(Dr.DecayDelay, "drum.decay_delay");
	C.NonNegative(Dr.DecayPerSecond, "drum.decay_per_second");

	C.NonNegative(H.PryBeatDuration, "hit_stop.pry_beat_duration");
	C.NonNegative(H.PryReleaseDuration, "hit_stop.pry_release_duration");
	C.NonNegative(Dr.HeavyHitGain, "drum.heavy_hit_gain");
	C.NonNegative(Dr.ParryGain, "drum.parry_gain");
	C.NonNegative(Dr.PostureBreakGain, "drum.posture_break_gain");
	C.NonNegative(Dr.PryBeatGain, "drum.pry_beat_gain");
	C.NonNegative(Dr.HitTakenLoss, "drum.hit_taken_loss");

	Seen.clear();
	for (std::size_t I = 0; I < Config.Enemies.size(); ++I)
	{
		const FEnemyConfig& E = Config.Enemies[I];
		const std::string Path = Idx("enemies", I);
		C.UniqueId(E.Id, Seen, Path + ".id");
		C.Positive(E.MaxHealth, Path + ".max_health");
		ValidatePosture(E.Posture, Path + ".posture", C);
		ValidateEnemyAttacks(E.Attacks, Path, C);
	}

	Seen.clear();
	for (std::size_t I = 0; I < Config.Bosses.size(); ++I)
	{
		const std::string Path = Idx("bosses", I);
		C.UniqueId(Config.Bosses[I].Id, Seen, Path + ".id");
		ValidateBoss(Config.Bosses[I], Config.Crafting, Path, C);
	}

	Append(Errors, ValidateLineageConfig(Config.Lineage), "lineage");
	for (std::size_t I = 0; I < Config.Lineage.Characters.size(); ++I)
	{
		for (const std::string& Weapon : Config.Lineage.Characters[I].StartWeapons)
		{
			C.Check(Config.FindWeapon(Weapon) != nullptr, Idx("lineage.characters", I) + ".start_weapons",
				"unknown weapon");
		}
	}
	Append(Errors, ValidateCraftingDatabase(Config.Crafting), "crafting");

	Seen.clear();
	for (std::size_t I = 0; I < Config.Secrets.size(); ++I)
	{
		const std::string Path = Idx("secrets", I);
		C.UniqueId(Config.Secrets[I].Id, Seen, Path + ".id");
		const TResult<FSecretGraph> Graph = FSecretGraph::Create(Config.Secrets[I]);
		if (!Graph)
		{
			Append(Errors, Graph.GetErrors(), Path);
			continue;
		}
		const FSoftlockReport Report = Graph.GetValue().CheckNoSoftlock();
		Append(Errors, Report.Problems, Path);
	}
	return Errors;
}
} // namespace ArpgCore
