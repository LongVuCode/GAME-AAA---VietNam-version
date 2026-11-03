// DesignDataLoader.cpp - design/data/*.json -> FArpgConfig. This is the only translation unit that
// includes nlohmann/json. Every lookup is type-checked first, so no nlohmann exception is expected;
// a catch-all guard still converts any exception into an error value when exceptions are enabled.
// Mapping decisions where the data is silent are listed in README.md ("Diễn giải chờ designer").
#include "ArpgCore/DesignDataLoader.h"

// Inside Unreal, silence engine warning policies (e.g. undefined-macro checks) for third-party code.
#if defined(THIRD_PARTY_INCLUDES_START)
THIRD_PARTY_INCLUDES_START
#endif
#include <nlohmann/json.hpp>
#if defined(THIRD_PARTY_INCLUDES_END)
THIRD_PARTY_INCLUDES_END
#endif

#include <algorithm>
#include <cmath>
#include <exception>
#include <initializer_list>
#include <limits>
#include <map>
#include <optional>
#include <set>
#include <string>
#include <utility>

namespace ArpgCore
{
namespace
{
using FJson = nlohmann::json;

std::string Join(const std::string& Path, const char* Key)
{
	return Path.empty() ? std::string(Key) : Path + "." + Key;
}

std::string Idx(const std::string& Path, std::size_t Index)
{
	return Path + "[" + std::to_string(Index) + "]";
}

/** Type-checked reader that accumulates errors and warnings with their JSON paths. */
class FReader
{
public:
	std::vector<FError> Errors;
	std::vector<FError> Warnings;

	void Error(const std::string& Path, std::string Message) { Errors.push_back(FError{Path, std::move(Message)}); }
	void Warn(const std::string& Path, std::string Message) { Warnings.push_back(FError{Path, std::move(Message)}); }

	static const FJson* Find(const FJson& Obj, const char* Key)
	{
		const auto It = Obj.find(Key);
		return It == Obj.end() ? nullptr : &*It;
	}

	const FJson* Missing(const std::string& Path, const char* Key, bool bRequired)
	{
		if (bRequired)
		{
			Error(Join(Path, Key), "missing required field");
		}
		return nullptr;
	}

	const FJson* Object(const FJson& Obj, const char* Key, const std::string& Path, bool bRequired)
	{
		const FJson* V = Find(Obj, Key);
		if (V == nullptr)
		{
			return Missing(Path, Key, bRequired);
		}
		if (!V->is_object())
		{
			Error(Join(Path, Key), "expected object");
			return nullptr;
		}
		return V;
	}

	const FJson* Array(const FJson& Obj, const char* Key, const std::string& Path, bool bRequired)
	{
		const FJson* V = Find(Obj, Key);
		if (V == nullptr)
		{
			return Missing(Path, Key, bRequired);
		}
		if (!V->is_array())
		{
			Error(Join(Path, Key), "expected array");
			return nullptr;
		}
		return V;
	}

	bool Float(const FJson& Obj, const char* Key, const std::string& Path, float& Out, bool bRequired)
	{
		const FJson* V = Find(Obj, Key);
		if (V == nullptr)
		{
			Missing(Path, Key, bRequired);
			return false;
		}
		if (!V->is_number())
		{
			Error(Join(Path, Key), "expected number");
			return false;
		}
		const double D = V->get<double>();
		if (!std::isfinite(D) || std::fabs(D) > static_cast<double>(std::numeric_limits<float>::max()))
		{
			Error(Join(Path, Key), "number out of range");
			return false;
		}
		Out = static_cast<float>(D);
		return true;
	}

	bool Int(const FJson& Obj, const char* Key, const std::string& Path, int& Out, bool bRequired)
	{
		const FJson* V = Find(Obj, Key);
		if (V == nullptr)
		{
			Missing(Path, Key, bRequired);
			return false;
		}
		if (!V->is_number_integer())
		{
			Error(Join(Path, Key), "expected integer");
			return false;
		}
		if (V->is_number_unsigned())
		{
			const unsigned long long U = V->get<unsigned long long>();
			if (U > static_cast<unsigned long long>(std::numeric_limits<int>::max()))
			{
				Error(Join(Path, Key), "integer out of range");
				return false;
			}
			Out = static_cast<int>(U);
			return true;
		}
		const long long L = V->get<long long>();
		if (L < std::numeric_limits<int>::min() || L > std::numeric_limits<int>::max())
		{
			Error(Join(Path, Key), "integer out of range");
			return false;
		}
		Out = static_cast<int>(L);
		return true;
	}

	bool Bool(const FJson& Obj, const char* Key, const std::string& Path, bool& Out, bool bRequired)
	{
		const FJson* V = Find(Obj, Key);
		if (V == nullptr)
		{
			Missing(Path, Key, bRequired);
			return false;
		}
		if (!V->is_boolean())
		{
			Error(Join(Path, Key), "expected boolean");
			return false;
		}
		Out = V->get<bool>();
		return true;
	}

	bool String(const FJson& Obj, const char* Key, const std::string& Path, std::string& Out, bool bRequired)
	{
		const FJson* V = Find(Obj, Key);
		if (V == nullptr)
		{
			Missing(Path, Key, bRequired);
			return false;
		}
		if (!V->is_string())
		{
			Error(Join(Path, Key), "expected string");
			return false;
		}
		Out = V->get<std::string>();
		return true;
	}

	void StringList(const FJson& Obj, const char* Key, const std::string& Path, std::vector<std::string>& Out, bool bRequired)
	{
		const FJson* V = Array(Obj, Key, Path, bRequired);
		if (V == nullptr)
		{
			return;
		}
		Out.clear();
		for (std::size_t I = 0; I < V->size(); ++I)
		{
			const FJson& Item = (*V)[I];
			if (!Item.is_string())
			{
				Error(Idx(Join(Path, Key), I), "expected string");
				continue;
			}
			Out.push_back(Item.get<std::string>());
		}
	}

	/** Calls Fn(item, itemPath) for every object of an array field. */
	template <typename TFn>
	void ForEachObject(const FJson& Obj, const char* Key, const std::string& Path, bool bRequired, TFn&& Fn)
	{
		const FJson* V = Array(Obj, Key, Path, bRequired);
		if (V == nullptr)
		{
			return;
		}
		for (std::size_t I = 0; I < V->size(); ++I)
		{
			const std::string ItemPath = Idx(Join(Path, Key), I);
			if (!(*V)[I].is_object())
			{
				Error(ItemPath, "expected object");
				continue;
			}
			Fn((*V)[I], ItemPath);
		}
	}

	/** Reads a string and maps it through Table. */
	template <typename TEnum>
	bool Enum(const FJson& Obj, const char* Key, const std::string& Path, TEnum& Out,
		std::initializer_list<std::pair<const char*, TEnum>> Table, bool bRequired)
	{
		std::string Name;
		if (!String(Obj, Key, Path, Name, bRequired))
		{
			return false;
		}
		for (const auto& [EnumName, Value] : Table)
		{
			if (Name == EnumName)
			{
				Out = Value;
				return true;
			}
		}
		std::string Allowed;
		for (const auto& Entry : Table)
		{
			Allowed += (Allowed.empty() ? "" : ", ") + std::string(Entry.first);
		}
		Error(Join(Path, Key), "unknown value '" + Name + "' (allowed: " + Allowed + ")");
		return false;
	}

	/** Requires a string field to have one specific value (features ArpgCore implements one way only). */
	void Expect(const FJson& Obj, const char* Key, const std::string& Path, const char* Expected)
	{
		std::string Value;
		if (String(Obj, Key, Path, Value, true) && Value != Expected)
		{
			Error(Join(Path, Key), "unsupported value '" + Value + "' (ArpgCore implements '" + std::string(Expected) + "')");
		}
	}
};

const std::initializer_list<std::pair<const char*, float>> HitWeightTable{
	{"light", HitWeightLight}, {"medium", HitWeightMedium}, {"heavy", HitWeightHeavy}, {"finisher", HitWeightFinisher}};
const std::initializer_list<std::pair<const char*, ERarity>> RarityTable{{"common", ERarity::Common},
	{"fine", ERarity::Good}, {"precious", ERarity::Precious}, {"rare", ERarity::Rare}, {"legendary", ERarity::Legendary},
	{"divine", ERarity::Divine}};
const std::initializer_list<std::pair<const char*, EItemCategory>> CategoryTable{
	{"consumable", EItemCategory::Consumable}, {"material", EItemCategory::Material}, {"bao_khi", EItemCategory::BaoKhi}};

/** Values from combat_tuning.json that other files need. */
struct FSharedTuning
{
	FPostureConfig EnemyPosture; // enemy_the_defaults (MaxPosture comes from each enemy)
	FShackleConfig Pry;          // pry block (cracks and drops come from each boss)
};

std::optional<FJson> ParseFile(FReader& R, std::string_view Text, const char* Name)
{
	FJson Root;
#if defined(__cpp_exceptions) || defined(_CPPUNWIND)
	try
	{
		Root = FJson::parse(Text.begin(), Text.end());
	}
	catch (const FJson::parse_error& E)
	{
		R.Error(Name, std::string("malformed JSON: ") + E.what());
		return std::nullopt;
	}
#else
	Root = FJson::parse(Text.begin(), Text.end(), nullptr, /*allow_exceptions=*/false);
	if (Root.is_discarded())
	{
		R.Error(Name, "malformed JSON");
		return std::nullopt;
	}
#endif
	if (!Root.is_object())
	{
		R.Error(Name, "expected object at root");
		return std::nullopt;
	}
	int Version = 1;
	if (R.Int(Root, "schema_version", Name, Version, false) && Version != 1)
	{
		R.Error(Join(Name, "schema_version"), "unsupported schema version (expected 1)");
	}
	return Root;
}

void ReadCombatTuning(FReader& R, const FJson& J, FArpgConfig& Config, FSharedTuning& Shared)
{
	const std::string F = "combat_tuning";
	FCombatConfig& Combat = Config.Combat;
	if (const FJson* In = R.Object(J, "input", F, true))
	{
		const std::string P = Join(F, "input");
		R.Float(*In, "buffer_s", P, Combat.Runner.InputBufferWindow, true);
		R.Float(*In, "combo_pause_threshold_s", P, Combat.ComboPauseThreshold, true);
		R.Float(*In, "hold_threshold_s", P, Combat.HoldThreshold, false);
	}
	if (const FJson* Pl = R.Object(J, "player", F, true))
	{
		const std::string P = Join(F, "player");
		FPlayerConfig& Player = Config.Player;
		R.Float(*Pl, "hp_max", P, Player.MaxHealth, true);
		R.Float(*Pl, "the_max", P, Player.Posture.MaxPosture, true);
		R.Float(*Pl, "the_regen_per_s", P, Player.Posture.RegenPerSecond, true);
		R.Float(*Pl, "the_regen_delay_s", P, Player.Posture.RegenDelay, true);
		R.Float(*Pl, "guard_break_stun_s", P, Player.Posture.StaggerDuration, true);
		R.Float(*Pl, "hitstun_light_s", P, Player.HitstunLight, false);
		R.Float(*Pl, "hitstun_heavy_s", P, Player.HitstunHeavy, false);
		Player.Posture.StaggerDamageMultiplier = 1.0f;
		Player.Posture.PostureAfterStagger = 0.0f;
	}
	if (const FJson* D = R.Object(J, "dodge", F, true))
	{
		const std::string P = Join(F, "dodge");
		FDodgeConfig& Dodge = Combat.Dodge;
		float IFrameDuration = Dodge.IFrameEnd - Dodge.IFrameStart;
		R.Float(*D, "duration_s", P, Dodge.Duration, true);
		R.Float(*D, "iframe_start_s", P, Dodge.IFrameStart, true);
		R.Float(*D, "iframe_duration_s", P, IFrameDuration, true);
		R.Float(*D, "perfect_dodge_window_s", P, Dodge.PerfectWindow, true);
		R.Float(*D, "recovery_s", P, Dodge.Recovery, false);
		R.Float(*D, "cancel_attack_recovery_after_s", P, Combat.Runner.DefenseCancelDelay, false);
		Dodge.IFrameEnd = Dodge.IFrameStart + IFrameDuration;
		Combat.Runner.AfterDodgeWindow = Dodge.Duration + Dodge.Recovery;
	}
	if (const FJson* G = R.Object(J, "guard", F, true))
	{
		const std::string P = Join(F, "guard");
		FParryConfig& Parry = Combat.Parry;
		R.Float(*G, "damage_reduction", P, Combat.Guard.DamageReduction, true);
		R.Float(*G, "player_the_damage_mult", P, Combat.Guard.PostureDamageMult, false);
		R.Float(*G, "parry_window_s", P, Parry.Window, true);
		R.Float(*G, "perfect_parry_window_s", P, Parry.PerfectWindow, true);
		R.Float(*G, "parry_enemy_the_damage", P, Parry.AttackerPostureFlatOnParry, true);
		R.Float(*G, "perfect_parry_enemy_the_damage", P, Parry.AttackerPostureFlatOnPerfectParry, true);
		R.Float(*G, "perfect_parry_counter_window_s", P, Combat.Runner.AfterPerfectParryWindow, true);
		// The data gives flat values only: no proportional part, no chip on the parrying player.
		Parry.AttackerPostureOnParry = 0.0f;
		Parry.AttackerPostureOnPerfectParry = 0.0f;
		Parry.DefenderPostureOnParry = 0.0f;
		Parry.DefenderPostureOnPerfectParry = 0.0f;
	}
	if (const FJson* E = R.Object(J, "enemy_the_defaults", F, true))
	{
		const std::string P = Join(F, "enemy_the_defaults");
		R.Float(*E, "regen_delay_s", P, Shared.EnemyPosture.RegenDelay, true);
		R.Float(*E, "regen_per_s", P, Shared.EnemyPosture.RegenPerSecond, true);
		R.Float(*E, "stagger_duration_s", P, Shared.EnemyPosture.StaggerDuration, true);
		R.Float(*E, "post_stagger_the_ratio", P, Shared.EnemyPosture.PostureAfterStagger, false);
		Shared.EnemyPosture.StaggerDamageMultiplier = 1.0f; // not in the data: no hidden bonus
	}
	if (const FJson* D = R.Object(J, "drum_rhythm", F, true))
	{
		const std::string P = Join(F, "drum_rhythm");
		FDrumConfig& Drum = Config.Drum;
		R.Int(*D, "segments", P, Drum.Notches, true);
		R.Float(*D, "points_per_segment", P, Drum.PointsPerNotch, true);
		if (const FJson* Gain = R.Object(*D, "gain", P, true))
		{
			const std::string GP = Join(P, "gain");
			R.Float(*Gain, "light_hit", GP, Drum.HitGain, true);
			R.Float(*Gain, "heavy_hit", GP, Drum.HeavyHitGain, true);
			R.Float(*Gain, "parry", GP, Drum.ParryGain, true);
			R.Float(*Gain, "perfect_parry", GP, Drum.PerfectParryGain, true);
			R.Float(*Gain, "perfect_dodge", GP, Drum.PerfectDodgeGain, true);
			R.Float(*Gain, "the_break", GP, Drum.PostureBreakGain, false);
			R.Float(*Gain, "pry_beat", GP, Drum.PryBeatGain, false);
		}
		R.Float(*D, "loss_on_hit_taken", P, Drum.HitTakenLoss, false);
		R.Bool(*D, "keeps_full_segments_on_hit", P, Drum.bHitTakenKeepsFullNotches, false);
		R.Float(*D, "decay_delay_s", P, Drum.DecayDelay, true);
		R.Float(*D, "decay_per_s", P, Drum.DecayPerSecond, true);
		R.Bool(*D, "decay_only_partial_segment", P, Drum.bDecayKeepsFullNotches, false);
		R.Int(*D, "drum_burst_cost_segments", P, Drum.SurgeCostNotches, false);
	}
	if (const FJson* H = R.Object(J, "hit_stop", F, true))
	{
		const std::string P = Join(F, "hit_stop");
		FHitStopConfig& HitStop = Config.HitStop;
		float Light = 0.0f;
		float Medium = 0.0f;
		float Heavy = 0.0f;
		float Finisher = 0.0f;
		R.Float(*H, "light_s", P, Light, true);
		R.Float(*H, "medium_s", P, Medium, true);
		R.Float(*H, "heavy_s", P, Heavy, true);
		R.Float(*H, "finisher_s", P, Finisher, true);
		R.Float(*H, "pry_beat_s", P, HitStop.PryBeatDuration, true);
		R.Float(*H, "pry_release_s", P, HitStop.PryReleaseDuration, true);
		HitStop.Curve = {{HitWeightLight, Light}, {HitWeightMedium, Medium}, {HitWeightHeavy, Heavy}, {HitWeightFinisher, Finisher}};
		HitStop.MinDuration = 0.0f;
		HitStop.MaxDuration = std::max({Light, Medium, Heavy, Finisher, 0.0f});
		HitStop.TimeScaleDuringStop = 0.0f;
		HitStop.PerfectParryBonus = 0.0f; // not in the data
	}
	if (const FJson* Pr = R.Object(J, "pry", F, true))
	{
		const std::string P = Join(F, "pry");
		FShackleConfig& Pry = Shared.Pry;
		float Bpm = 0.0f;
		R.Int(*Pr, "beats", P, Pry.PryBeats, true);
		if (R.Float(*Pr, "bpm", P, Bpm, true) && !(Bpm > 0.0f))
		{
			R.Error(Join(P, "bpm"), "must be > 0");
		}
		Pry.BeatInterval = Bpm > 0.0f ? 60.0f / Bpm : Pry.BeatInterval;
		Pry.LeadIn = Pry.BeatInterval; // not in the data: first beat one beat after the pry starts
		R.Float(*Pr, "beat_window_s", P, Pry.BeatHalfWindow, true);
		R.Float(*Pr, "hold_duration_per_beat_s", P, Pry.HoldDurationPerBeat, false);
		R.Int(*Pr, "miss_retries_per_beat", P, Pry.MissRetriesPerBeat, true);
		R.Float(*Pr, "silence_after_s", P, Pry.SilenceAfter, false);
		R.Expect(*Pr, "on_fail", P, "boss_recovers_the_half");
		Pry.MissPostureRecoverFraction = 0.5f;
	}
	if (const FJson* D = R.Object(J, "difficulty", F, true))
	{
		const std::string P = Join(F, "difficulty");
		R.String(*D, "default", P, Config.DefaultDifficultyId, true);
		R.ForEachObject(*D, "presets", P, true, [&R, &Config](const FJson& Pre, const std::string& PP) {
			FDifficultyConfig Diff;
			R.String(Pre, "id", PP, Diff.Id, true);
			R.Float(Pre, "damage_taken_mult", PP, Diff.DamageToPlayerMultiplier, true);
			R.Float(Pre, "damage_dealt_mult", PP, Diff.DamageToEnemyMultiplier, true);
			R.Float(Pre, "parry_window_mult", PP, Diff.ParryWindowScale, true);
			R.Float(Pre, "enemy_speed_mult", PP, Diff.EnemySpeedMultiplier, false);
			R.Float(Pre, "telegraph_time_mult", PP, Diff.TelegraphTimeMultiplier, false);
			R.Bool(Pre, "pry_auto", PP, Diff.bPryAuto, false);
			R.Bool(Pre, "aim_assist", PP, Diff.bAimAssist, false);
			Config.Difficulties.push_back(std::move(Diff));
		});
	}
	if (const FJson* H = R.Object(J, "healing", F, false))
	{
		const std::string P = Join(F, "healing");
		R.Int(*H, "charges", P, Config.Player.HealCharges, false);
		R.Float(*H, "heal_ratio", P, Config.Player.HealRatio, false);
		R.Float(*H, "use_time_s", P, Config.Player.HealUseTime, false);
	}
}

/** A move together with the design input string it was declared with. */
struct FPendingMove
{
	FComboMove Move;
	std::string Input;
	int ChainIndex = 0;
	std::string Path;
};

std::vector<std::string> SplitInput(const std::string& Input)
{
	std::vector<std::string> Tokens;
	std::string Current;
	for (const char Ch : Input + ",")
	{
		if (Ch == ',')
		{
			if (!Current.empty())
			{
				Tokens.push_back(Current);
			}
			Current.clear();
		}
		else if (Ch != ' ')
		{
			Current += Ch;
		}
	}
	return Tokens;
}

std::optional<EInputType> AttackToken(const std::string& Token)
{
	if (Token == "L")
	{
		return EInputType::Light;
	}
	if (Token == "H")
	{
		return EInputType::Heavy;
	}
	return std::nullopt;
}

/** Turns design input strings ("L", "L,L,pause,H", "dodge,L", "perfect_parry,H") into transitions. */
void BuildTransitions(FReader& R, const std::vector<FPendingMove>& Moves, float PauseThreshold, FMovesetConfig& Out)
{
	auto ChainMove = [&Moves](EInputType Type, int ChainIndex) -> const FPendingMove* {
		for (const FPendingMove& M : Moves)
		{
			const std::vector<std::string> Tokens = SplitInput(M.Input);
			if (Tokens.size() == 1 && AttackToken(Tokens[0]) == Type && M.ChainIndex == ChainIndex)
			{
				return &M;
			}
		}
		return nullptr;
	};

	for (const FPendingMove& M : Moves)
	{
		const std::vector<std::string> Tokens = SplitInput(M.Input);
		const std::optional<EInputType> Last = Tokens.empty() ? std::nullopt : AttackToken(Tokens.back());
		if (!Last)
		{
			R.Error(M.Path + ".input", "must end with L or H: '" + M.Input + "'");
			continue;
		}
		FComboTransitionDef T;
		T.Input = *Last;
		T.To = M.Move.Id;
		if (Tokens.size() == 1)
		{
			if (M.ChainIndex > 1)
			{
				const FPendingMove* Prev = ChainMove(*Last, M.ChainIndex - 1);
				if (Prev == nullptr)
				{
					R.Error(M.Path + ".chain_index", "no move with chain_index " + std::to_string(M.ChainIndex - 1) + " before it");
					continue;
				}
				T.From = Prev->Move.Id;
			}
			Out.Combo.push_back(T);
			continue;
		}

		std::string Context;
		bool bPause = false;
		bool bValid = true;
		std::optional<EInputType> PrefixType;
		int PrefixCount = 0;
		for (std::size_t I = 0; I + 1 < Tokens.size(); ++I)
		{
			const std::string& Tok = Tokens[I];
			const std::optional<EInputType> Attack = AttackToken(Tok);
			if ((Tok == "dodge" || Tok == "perfect_parry") && I == 0)
			{
				Context = "@" + Tok;
			}
			else if (Tok == "pause" && PrefixCount > 0)
			{
				bPause = true;
			}
			else if (Attack && !bPause && (!PrefixType || *PrefixType == *Attack))
			{
				PrefixType = Attack;
				++PrefixCount;
			}
			else
			{
				bValid = false;
			}
		}
		if (!bValid || (!Context.empty() && PrefixCount > 0))
		{
			R.Error(M.Path + ".input", "unsupported input sequence '" + M.Input + "'");
			continue;
		}
		if (!Context.empty())
		{
			T.From = Context;
		}
		else
		{
			const FPendingMove* Prev = ChainMove(*PrefixType, PrefixCount);
			if (Prev == nullptr)
			{
				R.Error(M.Path + ".input", "no chain move for prefix of '" + M.Input + "'");
				continue;
			}
			T.From = Prev->Move.Id;
			T.MinDelay = bPause ? PauseThreshold : 0.0f;
		}
		Out.Combo.push_back(T);
	}
}

FComboMove ReadMoveStats(FReader& R, const FJson& M, const std::string& P)
{
	FComboMove Move;
	R.String(M, "id", P, Move.Id, true);
	R.Float(M, "damage", P, Move.Attack.BaseDamage, true);
	R.Float(M, "the_damage", P, Move.Attack.BasePostureDamage, true);
	R.Float(M, "startup_s", P, Move.Timing.Startup, true);
	R.Float(M, "active_s", P, Move.Timing.Active, true);
	R.Float(M, "recovery_s", P, Move.Timing.Recovery, true);
	R.Enum(M, "hit_weight", P, Move.Attack.Weight, HitWeightTable, true);
	return Move;
}

void ReadWeapons(FReader& R, const FJson& J, FArpgConfig& Config)
{
	R.ForEachObject(J, "weapons", "", true, [&R, &Config](const FJson& W, const std::string& WP) {
		FWeaponConfig Weapon;
		R.String(W, "id", WP, Weapon.Id, true);
		FMovesetConfig Set;
		Set.WeaponId = Weapon.Id;
		std::vector<FPendingMove> Pending;
		R.ForEachObject(W, "moves", WP, true, [&R, &Pending](const FJson& M, const std::string& MP) {
			FPendingMove P;
			P.Path = MP;
			P.Move = ReadMoveStats(R, M, MP);
			R.String(M, "input", MP, P.Input, true);
			R.Int(M, "chain_index", MP, P.ChainIndex, true);
			R.Float(M, "combo_window_s", MP, P.Move.ChainLinkWindow, true);
			R.String(M, "requires_skill", MP, P.Move.RequiredUnlock, false);
			if (R.Find(M, "charge") != nullptr)
			{
				R.Warn(Join(MP, "charge"), "heavy charge levels are not modeled in ArpgCore yet (game layer)");
			}
			Pending.push_back(std::move(P));
		});
		// House moves ("Đòn nhà") work with every weapon once unlocked.
		for (const FHouseMoveDef& House : Config.Lineage.HouseMoves)
		{
			Pending.push_back(FPendingMove{House.Move, House.Input, 0, WP + ".house_moves." + House.Id});
		}
		for (const FPendingMove& P : Pending)
		{
			Set.Moves.push_back(P.Move);
		}
		BuildTransitions(R, Pending, Config.Combat.ComboPauseThreshold, Set);
		if (const FJson* B = R.Object(W, "drum_burst", WP, true))
		{
			const std::string BP = Join(WP, "drum_burst");
			R.String(*B, "id", BP, Set.Burst.Id, true);
			R.Int(*B, "hits", BP, Set.Burst.Hits, true);
			R.Float(*B, "damage_total", BP, Set.Burst.DamageTotal, true);
			R.Float(*B, "the_damage_total", BP, Set.Burst.PostureDamageTotal, true);
			R.Float(*B, "duration_s", BP, Set.Burst.Duration, true);
			R.Bool(*B, "super_armor", BP, Set.Burst.bSuperArmor, false);
			R.Bool(*B, "invulnerable", BP, Set.Burst.bInvulnerable, false);
			R.Enum(*B, "hit_weight", BP, Set.Burst.Weight, HitWeightTable, false);
		}
		Config.Weapons.push_back(std::move(Weapon));
		Config.Movesets.push_back(std::move(Set));
	});
}

void ReadDrops(FReader& R, const FJson& Obj, const char* Key, const std::string& Path, std::vector<FMaterialAmount>& Out)
{
	R.ForEachObject(Obj, Key, Path, true, [&R, &Out](const FJson& D, const std::string& DP) {
		FMaterialAmount Drop;
		float Chance = 1.0f;
		R.String(D, "item", DP, Drop.MaterialId, true);
		R.Int(D, "count", DP, Drop.Amount, true);
		R.Float(D, "chance", DP, Chance, false);
		if (Chance != 1.0f)
		{
			R.Error(Join(DP, "chance"), "boss drops must be guaranteed (chance 1.0)");
		}
		Out.push_back(std::move(Drop));
	});
}

void ReadAttacks(FReader& R, const FJson& E, const std::string& Path, std::vector<FEnemyAttack>& Out)
{
	R.ForEachObject(E, "attacks", Path, true, [&R, &Out](const FJson& A, const std::string& AP) {
		FEnemyAttack Attack;
		bool bParryable = true;
		bool bGuardable = true;
		R.String(A, "id", AP, Attack.Id, true);
		R.Float(A, "damage", AP, Attack.Attack.BaseDamage, true);
		R.Float(A, "player_the_damage", AP, Attack.Attack.BasePostureDamage, true);
		R.Float(A, "windup_s", AP, Attack.Windup, true);
		R.Float(A, "hold_s", AP, Attack.Hold, false);
		R.Float(A, "active_s", AP, Attack.Active, true);
		R.Float(A, "recovery_s", AP, Attack.Recovery, true);
		R.Bool(A, "parryable", AP, bParryable, true);
		R.Bool(A, "guardable", AP, bGuardable, true);
		R.Bool(A, "delayed", AP, Attack.bDelayed, false);
		R.Int(A, "hits", AP, Attack.Hits, false);
		R.Float(A, "cooldown_s", AP, Attack.Cooldown, false);
		Attack.Attack.bUnparryable = !bParryable;
		Attack.Attack.bUnguardable = !bGuardable;
		Attack.Attack.Weight = HitWeightMedium; // enemy hit weight is not in the data
		Out.push_back(std::move(Attack));
	});
}

void ReadPhases(FReader& R, const FJson& E, const std::string& Path, FBossConfig& Boss)
{
	R.ForEachObject(E, "phases", Path, true, [&R, &Boss](const FJson& Ph, const std::string& PP) {
		FBossPhase Phase;
		R.String(Ph, "id", PP, Phase.Id, true);
		R.Float(Ph, "the_max", PP, Phase.MaxPosture, false);
		R.Float(Ph, "speed_mult", PP, Phase.SpeedMult, false);
		R.Float(Ph, "telegraph_time_mult", PP, Phase.TelegraphTimeMult, false);
		R.Float(Ph, "transition_beat_s", PP, Phase.TransitionBeat, false);
		R.StringList(Ph, "moveset", PP, Phase.Moveset, false);
		if (const FJson* Enter = R.Object(Ph, "enter", PP, true))
		{
			const std::string EP = Join(PP, "enter");
			std::string Type;
			R.String(*Enter, "type", EP, Type, true);
			if (Type != "start" && Type != "any" && Type != "all")
			{
				R.Error(Join(EP, "type"), "unknown value '" + Type + "' (allowed: start, any, all)");
			}
			Phase.bEnterOnAny = Type != "all";
			R.ForEachObject(*Enter, "conditions", EP, Type != "start", [&R, &Phase](const FJson& C, const std::string& CP) {
				const bool bCrack = R.Int(C, "khoen_cracks_at_least", CP, Phase.EnterCracksAtLeast, false);
				const bool bHealth = R.Float(C, "hp_ratio_at_most", CP, Phase.EnterHealthRatioAtMost, false);
				if (!bCrack && !bHealth)
				{
					R.Error(CP, "unknown phase condition (allowed: khoen_cracks_at_least, hp_ratio_at_most)");
				}
			});
		}
		Boss.Phases.push_back(std::move(Phase));
	});
}

void ReadShackle(FReader& R, const FJson& K, const std::string& P, const FSharedTuning& Shared, FBossConfig& Boss)
{
	Boss.Shackle = Shared.Pry;
	Boss.Shackle.bEnabled = true;
	bool bBinding = true;
	R.Bool(K, "binding_item", P, bBinding, false);
	R.String(K, "feature_flag", P, Boss.ShackleFeatureFlag, true);
	int Stages = 0;
	R.Int(K, "crack_stages", P, Stages, true);
	R.Expect(K, "crack_on", P, "the_break");
	if (const FJson* Cond = R.Object(K, "pry_condition", P, true))
	{
		const std::string CP = Join(P, "pry_condition");
		R.Int(*Cond, "khoen_cracks_at_least", CP, Boss.Shackle.CracksToOpen, true);
		R.Expect(*Cond, "state", CP, "staggered");
		if (Boss.Shackle.CracksToOpen > Stages)
		{
			R.Error(Join(CP, "khoen_cracks_at_least"), "more cracks than crack_stages");
		}
	}
	int Beats = 0;
	if (R.Int(K, "pry_beats", P, Beats, true) && Beats != Shared.Pry.PryBeats)
	{
		R.Error(Join(P, "pry_beats"), "must equal combat_tuning.pry.beats");
	}
	if (const FJson* Success = R.Object(K, "on_pry_success", P, true))
	{
		const std::string SP = Join(P, "on_pry_success");
		ReadDrops(R, *Success, "drops", SP, Boss.FreedDrops);
		// Shackle fragments never become items (VERDICT §3, V9).
		R.Expect(*Success, "shard_handling", SP, "narrative_only_no_item");
	}
	if (const FJson* Fallback = R.Object(K, "fallback_when_disabled", P, true))
	{
		const std::string FP = Join(P, "fallback_when_disabled");
		R.Expect(*Fallback, "finisher", FP, "final_stagger_shove");
		ReadDrops(R, *Fallback, "drops", FP, Boss.FledDrops);
	}
}

void ReadEnemies(FReader& R, const FJson& J, FArpgConfig& Config, const FSharedTuning& Shared)
{
	R.ForEachObject(J, "enemies", "", true, [&R, &Config, &Shared](const FJson& E, const std::string& EP) {
		std::string Id;
		std::string Rank;
		float Health = 0.0f;
		FPostureConfig Posture = Shared.EnemyPosture;
		R.String(E, "id", EP, Id, true);
		R.String(E, "rank", EP, Rank, true);
		R.Float(E, "hp", EP, Health, true);
		R.Float(E, "the_max", EP, Posture.MaxPosture, true);
		R.Float(E, "the_regen_per_s", EP, Posture.RegenPerSecond, false);
		R.Float(E, "the_regen_delay_s", EP, Posture.RegenDelay, false);
		R.Float(E, "stagger_duration_s", EP, Posture.StaggerDuration, false);
		if (Rank != "boss")
		{
			FEnemyConfig Enemy;
			Enemy.Id = Id;
			Enemy.Rank = Rank;
			Enemy.MaxHealth = Health;
			Enemy.Posture = Posture;
			R.Float(E, "interrupt_threshold", EP, Enemy.InterruptThreshold, false);
			R.Float(E, "front_damage_mult", EP, Enemy.FrontDamageMult, false);
			ReadAttacks(R, E, EP, Enemy.Attacks);
			Config.Enemies.push_back(std::move(Enemy));
			return;
		}
		FBossConfig Boss;
		Boss.Id = Id;
		Boss.MaxHealth = Health;
		Boss.Posture = Posture;
		Boss.HealthFloor = 0.0f;
		Boss.bHealthFloorForcesFinalStagger = false;
		R.Float(E, "hp_floor", EP, Boss.HealthFloor, false);
		R.Bool(E, "hp_floor_forces_final_stagger", EP, Boss.bHealthFloorForcesFinalStagger, false);
		ReadPhases(R, E, EP, Boss);
		ReadAttacks(R, E, EP, Boss.Attacks);
		if (const FJson* K = R.Object(E, "khoen", EP, false))
		{
			ReadShackle(R, *K, Join(EP, "khoen"), Shared, Boss);
		}
		else
		{
			Boss.Shackle.bEnabled = false;
		}
		Config.Bosses.push_back(std::move(Boss));
	});
}

void ReadItems(FReader& R, const FJson& J, FArpgConfig& Config)
{
	FCraftingDatabase& Db = Config.Crafting;
	R.ForEachObject(J, "rarities", "", true, [&R](const FJson& Ra, const std::string& RP) {
		ERarity Unused = ERarity::Common;
		R.Enum(Ra, "id", RP, Unused, RarityTable, true);
	});
	R.ForEachObject(J, "items", "", true, [&R, &Db](const FJson& It, const std::string& IP) {
		FItemDef Item;
		R.String(It, "id", IP, Item.Id, true);
		R.Enum(It, "category", IP, Item.Category, CategoryTable, true);
		R.Enum(It, "rarity", IP, Item.Rarity, RarityTable, true);
		R.Bool(It, "unique", IP, Item.bUnique, false);
		if (const FJson* Source = R.Object(It, "source", IP, true))
		{
			R.String(*Source, "kind", Join(IP, "source"), Item.SourceKind, true);
		}
		bool bFirst = true;
		R.ForEachObject(It, "upgrade_levels", IP, false, [&R, &Item, &bFirst](const FJson& L, const std::string& LP) {
			int Level = 0;
			if (R.Int(L, "level", LP, Level, true))
			{
				Item.BaseLevel = bFirst ? Level : std::min(Item.BaseLevel, Level);
				Item.MaxLevel = bFirst ? Level : std::max(Item.MaxLevel, Level);
				bFirst = false;
			}
		});
		if (Item.Category == EItemCategory::Material)
		{
			const bool bBossPart = Item.SourceKind == "shed_after_pry" || Item.SourceKind == "remains_after_dissolve";
			Db.Materials.push_back(FMaterialDef{Item.Id, bBossPart ? EMaterialCategory::BossPart : EMaterialCategory::Other});
		}
		Db.Items.push_back(std::move(Item));
	});
	R.ForEachObject(J, "recipes", "", true, [&R, &Db](const FJson& Rc, const std::string& RP) {
		std::string Id;
		std::string Type;
		R.String(Rc, "id", RP, Id, true);
		R.String(Rc, "type", RP, Type, true);
		std::vector<FMaterialAmount> Inputs;
		R.ForEachObject(Rc, "inputs", RP, true, [&R, &Inputs](const FJson& In, const std::string& InP) {
			FMaterialAmount Amount;
			R.String(In, "item", InP, Amount.MaterialId, true);
			R.Int(In, "count", InP, Amount.Amount, true);
			Inputs.push_back(std::move(Amount));
		});
		std::string OutputId;
		if (const FJson* Output = R.Object(Rc, "output", RP, true))
		{
			R.String(*Output, "item", Join(RP, "output"), OutputId, true);
		}
		if (Type == "craft")
		{
			FRecipe Recipe;
			Recipe.Id = Id;
			Recipe.ResultItemId = OutputId;
			Recipe.Inputs = std::move(Inputs);
			if (const FItemDef* Def = Db.FindItem(OutputId))
			{
				Recipe.Rarity = Def->Rarity;
			}
			else
			{
				R.Error(Join(RP, "output"), "unknown item '" + OutputId + "'");
			}
			Db.Recipes.push_back(std::move(Recipe));
		}
		else if (Type == "upgrade")
		{
			FUpgradeRecipe Recipe;
			Recipe.Id = Id;
			R.String(Rc, "target", RP, Recipe.TargetItemId, true);
			R.Int(Rc, "to_level", RP, Recipe.ToLevel, true);
			// The item being upgraded is listed among the inputs; it is not consumed from the inventory.
			for (FMaterialAmount& In : Inputs)
			{
				if (In.MaterialId != Recipe.TargetItemId)
				{
					Recipe.Inputs.push_back(std::move(In));
				}
			}
			Db.UpgradeRecipes.push_back(std::move(Recipe));
		}
		else
		{
			R.Error(Join(RP, "type"), "unknown value '" + Type + "' (allowed: craft, upgrade)");
		}
	});
	Db.Upgrade.Terms.clear(); // upgrades come from explicit recipes
}

void ReadLineage(FReader& R, const FJson& J, FArpgConfig& Config)
{
	FLineageConfig& L = Config.Lineage;
	if (const FJson* Inh = R.Object(J, "inheritance", "", true))
	{
		R.Float(*Inh, "skill_tree_carryover_ratio", "inheritance", L.SkillRankRetention, true);
		R.Bool(*Inh, "house_moves_carryover", "inheritance", L.bCarryHouseMoves, false);
		R.Bool(*Inh, "weapons_carryover", "inheritance", L.bCarryWeapons, false);
		R.Bool(*Inh, "thap_carryover", "inheritance", L.bStoreEquippedInThap, false);
	}
	if (const FJson* Tree = R.Object(J, "skill_tree", "", true))
	{
		R.ForEachObject(*Tree, "branches", "skill_tree", true, [&R, &L](const FJson& B, const std::string& BP) {
			FSkillBranchDef Branch;
			R.String(B, "id", BP, Branch.Id, true);
			R.Bool(B, "available_in_demo", BP, Branch.bAvailable, false);
			L.SkillTree.Branches.push_back(std::move(Branch));
		});
		R.ForEachObject(*Tree, "nodes", "skill_tree", true, [&R, &L](const FJson& N, const std::string& NP) {
			FSkillNodeDef Node;
			R.String(N, "id", NP, Node.Id, true);
			R.String(N, "branch", NP, Node.Branch, true);
			R.Int(N, "cost", NP, Node.Cost, true);
			R.StringList(N, "prereqs", NP, Node.Prereqs, false);
			if (const FJson* Effect = R.Object(N, "effect", NP, false))
			{
				R.String(*Effect, "type", Join(NP, "effect"), Node.EffectType, true);
				R.Float(*Effect, "value", Join(NP, "effect"), Node.EffectValue, false);
			}
			L.SkillTree.Nodes.push_back(std::move(Node));
		});
	}
	R.ForEachObject(J, "characters", "", true, [&R, &L](const FJson& C, const std::string& CP) {
		FCharacterDef Character;
		R.String(C, "id", CP, Character.Id, true);
		R.Int(C, "generation", CP, Character.Generation, true);
		R.Int(C, "weapon_slots", CP, Character.WeaponSlots, true);
		R.StringList(C, "start_weapons", CP, Character.StartWeapons, true);
		R.Int(C, "start_skill_points", CP, Character.StartSkillPoints, false);
		R.Int(C, "bonus_skill_points_on_handoff", CP, Character.BonusSkillPointsOnHandoff, false);
		L.Characters.push_back(std::move(Character));
	});
	R.ForEachObject(J, "house_moves", "", false, [&R, &L](const FJson& M, const std::string& MP) {
		FHouseMoveDef House;
		House.Move = ReadMoveStats(R, M, MP);
		House.Id = House.Move.Id;
		R.String(M, "learned_by", MP, House.LearnedBy, true);
		R.String(M, "input", MP, House.Input, true);
		R.Bool(M, "inheritable", MP, House.bInheritable, false);
		if (const FJson* Unlock = R.Object(M, "unlock", MP, true))
		{
			R.Expect(*Unlock, "type", Join(MP, "unlock"), "flag");
			R.String(*Unlock, "flag", Join(MP, "unlock"), House.UnlockFlag, true);
		}
		House.Move.RequiredUnlock = House.UnlockFlag;
		House.Move.ChainLinkWindow = 0.0f;
		L.HouseMoves.push_back(std::move(House));
	});
}

void ReadSecrets(FReader& R, const FJson& J, FArpgConfig& Config)
{
	std::set<std::string> NotRevisitable;
	R.ForEachObject(J, "locations", "", true, [&R, &NotRevisitable](const FJson& L, const std::string& LP) {
		std::string Id;
		bool bRevisitable = true;
		R.String(L, "id", LP, Id, true);
		R.Bool(L, "revisitable", LP, bRevisitable, true);
		if (!bRevisitable)
		{
			NotRevisitable.insert(Id);
		}
	});
	R.ForEachObject(J, "chains", "", true, [&R, &Config, &NotRevisitable](const FJson& C, const std::string& CP) {
		FSecretGraphDef Def;
		R.String(C, "id", CP, Def.Id, true);
		R.ForEachObject(C, "clues", CP, true, [&R](const FJson& Clue, const std::string& ClP) {
			bool bConsumable = false;
			if (R.Bool(Clue, "consumable", ClP, bConsumable, false) && bConsumable)
			{
				R.Error(Join(ClP, "consumable"), "clues are never consumed");
			}
		});
		R.ForEachObject(C, "nodes", CP, true, [&R, &Def, &NotRevisitable](const FJson& N, const std::string& NP) {
			FSecretNode Node;
			R.String(N, "id", NP, Node.Id, true);
			R.Bool(N, "is_start", NP, Node.bIsStart, false);
			R.Bool(N, "is_end", NP, Node.bIsEnding, false);
			std::string Location;
			if (R.String(N, "location", NP, Location, false) && NotRevisitable.count(Location) != 0)
			{
				R.Error(Join(NP, "location"), "node placed where the player cannot return (softlock risk)");
			}
			if (const FJson* Req = R.Object(N, "requires", NP, false))
			{
				R.StringList(*Req, "all", Join(NP, "requires"), Node.RequiresClues, false);
				R.StringList(*Req, "any", Join(NP, "requires"), Node.RequiresAnyClues, false);
			}
			R.StringList(N, "grants", NP, Node.GrantsClues, false);
			// Hint text lives in the data ({vi, en}); ArpgCore returns a key pointing at it.
			R.ForEachObject(N, "hints", NP, false, [&R, &Node, &Def](const FJson& H, const std::string& HP) {
				int Tier = 0;
				if (R.Int(H, "tier", HP, Tier, true))
				{
					if (Tier < 1 || Tier > 3)
					{
						R.Error(Join(HP, "tier"), "must be 1..3");
						return;
					}
					Node.HintKeys[static_cast<std::size_t>(Tier - 1)] = "secrets." + Def.Id + "." + Node.Id + ".hint" + std::to_string(Tier);
				}
			});
			Def.Nodes.push_back(std::move(Node));
		});
		Config.Secrets.push_back(std::move(Def));
	});
}

/** Qualifies paths with the file name unless they already start with it. */
void Qualify(std::vector<FError>& Errors, std::size_t From, const char* File)
{
	for (std::size_t I = From; I < Errors.size(); ++I)
	{
		if (Errors[I].Path.rfind(File, 0) != 0)
		{
			Errors[I].Path = Errors[I].Path.empty() ? File : std::string(File) + "." + Errors[I].Path;
		}
	}
}

TResult<FArpgConfig> LoadImpl(const FDesignDataSources& Sources, std::vector<FError>* OutWarnings)
{
	FReader R;
	FArpgConfig Config;
	FSharedTuning Shared;

	// Order matters: lineage (house moves) before weapons; combat tuning before everything else.
	struct FStep
	{
		const char* Name;
		std::string_view Text;
		int Kind;
	};
	const FStep Steps[] = {{"combat_tuning", Sources.CombatTuning, 0}, {"lineage", Sources.Lineage, 1},
		{"weapons", Sources.Weapons, 2}, {"items", Sources.Items, 3}, {"enemies", Sources.Enemies, 4},
		{"secrets", Sources.Secrets, 5}};
	for (const FStep& Step : Steps)
	{
		const std::size_t ErrorsBefore = R.Errors.size();
		const std::size_t WarningsBefore = R.Warnings.size();
		const std::optional<FJson> Root = ParseFile(R, Step.Text, Step.Name);
		if (Root)
		{
			switch (Step.Kind)
			{
			case 0:
				ReadCombatTuning(R, *Root, Config, Shared);
				break;
			case 1:
				ReadLineage(R, *Root, Config);
				break;
			case 2:
				ReadWeapons(R, *Root, Config);
				break;
			case 3:
				ReadItems(R, *Root, Config);
				break;
			case 4:
				ReadEnemies(R, *Root, Config, Shared);
				break;
			default:
				ReadSecrets(R, *Root, Config);
				break;
			}
		}
		Qualify(R.Errors, ErrorsBefore, Step.Name);
		Qualify(R.Warnings, WarningsBefore, Step.Name);
	}

	if (OutWarnings != nullptr)
	{
		*OutWarnings = R.Warnings;
	}
	if (!R.Errors.empty())
	{
		return TResult<FArpgConfig>::Fail(std::move(R.Errors));
	}
	std::vector<FError> Semantic = ValidateConfig(Config);
	if (!Semantic.empty())
	{
		return TResult<FArpgConfig>::Fail(std::move(Semantic));
	}
	return TResult<FArpgConfig>::Ok(std::move(Config));
}
} // namespace

TResult<FArpgConfig> LoadDesignData(const FDesignDataSources& Sources, std::vector<FError>* OutWarnings)
{
#if defined(__cpp_exceptions) || defined(_CPPUNWIND)
	try
	{
		return LoadImpl(Sources, OutWarnings);
	}
	catch (const std::exception& E)
	{
		return TResult<FArpgConfig>::Fail(FError{"", std::string("internal loader error: ") + E.what()});
	}
	catch (...)
	{
		return TResult<FArpgConfig>::Fail(FError{"", "internal loader error"});
	}
#else
	return LoadImpl(Sources, OutWarnings);
#endif
}
} // namespace ArpgCore
