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

void ValidateCombat(const FCombatConfig& Combat, FChecker& C)
{
	C.NonNegative(Combat.Runner.InputBufferWindow, "combat.input_buffer_window");
	C.Check(Combat.Runner.InputBufferCapacity >= 1, "combat.input_buffer_capacity", "must be >= 1");
	C.NonNegative(Combat.Runner.ChainLinkWindow, "combat.chain_link_window");

	std::set<std::string> Seen;
	for (std::size_t I = 0; I < Combat.Moves.size(); ++I)
	{
		const FComboMove& Move = Combat.Moves[I];
		const std::string Path = Idx("combat.moves", I);
		C.UniqueId(Move.Id, Seen, Path + ".id");
		C.NonNegative(Move.Timing.Startup, Path + ".startup");
		C.NonNegative(Move.Timing.Active, Path + ".active");
		C.NonNegative(Move.Timing.Recovery, Path + ".recovery");
		C.Check(Move.Timing.GetTotal() > 0.0f, Path, "action must last > 0 s");
		if (Move.Timing.CancelStart >= 0.0f && Move.Timing.CancelEnd >= 0.0f)
		{
			C.Check(Move.Timing.CancelStart <= Move.Timing.CancelEnd, Path + ".cancel_start", "must be <= cancel_end");
		}
		C.NonNegative(Move.Attack.BaseDamage, Path + ".damage");
		C.NonNegative(Move.Attack.BasePostureDamage, Path + ".posture_damage");
		C.NonNegative(Move.Attack.Weight, Path + ".weight");
	}

	const FDodgeConfig& D = Combat.Dodge;
	C.Positive(D.Duration, "combat.dodge.duration");
	C.Check(D.IFrameStart >= 0.0f && D.IFrameStart <= D.IFrameEnd && D.IFrameEnd <= D.Duration, "combat.dodge",
		"requires 0 <= iframe_start <= iframe_end <= duration");
	C.Check(D.PerfectWindow >= 0.0f && D.PerfectWindow <= D.IFrameEnd - D.IFrameStart, "combat.dodge.perfect_window",
		"must be in [0, iframe_end - iframe_start]");

	const FParryConfig& P = Combat.Parry;
	C.Positive(P.Window, "combat.parry.window");
	C.Check(P.PerfectWindow >= 0.0f && P.PerfectWindow <= P.Window, "combat.parry.perfect_window", "must be in [0, window]");
	C.Check(P.Window <= P.Duration, "combat.parry.duration", "must be >= window");
	C.NonNegative(P.AttackerPostureOnParry, "combat.parry.attacker_posture_on_parry");
	C.NonNegative(P.AttackerPostureOnPerfectParry, "combat.parry.attacker_posture_on_perfect_parry");
	C.NonNegative(P.DefenderPostureOnParry, "combat.parry.defender_posture_on_parry");
	C.NonNegative(P.DefenderPostureOnPerfectParry, "combat.parry.defender_posture_on_perfect_parry");

	const TResult<FComboGraph> Graph = BuildComboGraph(Combat);
	if (!Graph)
	{
		Append(C.Errors, Graph.GetErrors(), "combat");
	}
	else
	{
		Append(C.Errors, Graph.GetValue().Validate(), "combat");
	}
}

void ValidateBoss(const FBossConfig& Boss, const FCraftingDatabase& Crafting, const std::string& Path, FChecker& C)
{
	C.Positive(Boss.MaxHealth, Path + ".max_health");
	C.Check(Boss.HealthFloorWhileShackled >= 0.0f && Boss.HealthFloorWhileShackled < Boss.MaxHealth,
		Path + ".health_floor_while_shackled", "must be in [0, max_health)");

	const FPostureConfig& Po = Boss.Posture;
	C.Positive(Po.MaxPosture, Path + ".posture.max_posture");
	C.NonNegative(Po.RegenPerSecond, Path + ".posture.regen_per_second");
	C.NonNegative(Po.RegenDelay, Path + ".posture.regen_delay");
	C.Positive(Po.StaggerDuration, Path + ".posture.stagger_duration");
	C.NonNegative(Po.StaggerDamageMultiplier, Path + ".posture.stagger_damage_multiplier");
	C.Check(Po.PostureAfterStagger >= 0.0f && Po.PostureAfterStagger < 1.0f, Path + ".posture.posture_after_stagger",
		"must be in [0, 1)");

	const FShackleConfig& Sh = Boss.Shackle;
	C.Check(Sh.CracksToOpen >= 1, Path + ".shackle.cracks_to_open", "must be >= 1");
	C.Check(Sh.PryBeats >= 1, Path + ".shackle.pry_beats", "must be >= 1");
	C.NonNegative(Sh.LeadIn, Path + ".shackle.lead_in");
	C.Positive(Sh.BeatInterval, Path + ".shackle.beat_interval");
	C.Check(Sh.BeatHalfWindow > 0.0f && Sh.BeatHalfWindow <= Sh.BeatInterval * 0.5f, Path + ".shackle.beat_half_window",
		"must be in (0, beat_interval / 2]");
	C.Unit(Sh.MissPostureRecoverFraction, Path + ".shackle.miss_posture_recover_fraction");

	for (std::size_t I = 0; I < Boss.FreedDrops.size(); ++I)
	{
		const FMaterialAmount& Drop = Boss.FreedDrops[I];
		const std::string DropPath = Idx(Path + ".freed_drops", I);
		const FMaterialDef* Def = Crafting.FindMaterial(Drop.MaterialId);
		C.Check(Def != nullptr, DropPath, "unknown material");
		C.Check(Def == nullptr || Def->Category != EMaterialCategory::ShackleFragment, DropPath,
			"shackle fragments are never a reward (they grant no power)");
		C.Check(Drop.Amount > 0, DropPath + ".amount", "must be > 0");
	}
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

TResult<FComboGraph> BuildComboGraph(const FCombatConfig& Combat)
{
	FComboGraph Graph;
	std::vector<FError> Errors;
	for (std::size_t I = 0; I < Combat.Moves.size(); ++I)
	{
		if (Graph.AddMove(Combat.Moves[I]) == FComboGraph::RootNode)
		{
			Errors.push_back(FError{Idx("moves", I) + ".id", "empty or duplicate move id"});
		}
	}
	for (std::size_t I = 0; I < Combat.Combo.size(); ++I)
	{
		const FComboTransitionDef& T = Combat.Combo[I];
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

	std::set<std::string> Seen;
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
	}

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

	Seen.clear();
	for (std::size_t I = 0; I < Config.Bosses.size(); ++I)
	{
		const std::string Path = Idx("bosses", I);
		C.UniqueId(Config.Bosses[I].Id, Seen, Path + ".id");
		ValidateBoss(Config.Bosses[I], Config.Crafting, Path, C);
	}

	Append(Errors, ValidateLineageConfig(Config.Lineage), "lineage");
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
