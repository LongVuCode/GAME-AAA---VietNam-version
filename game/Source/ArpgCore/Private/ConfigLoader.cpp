// ConfigLoader.cpp - JSON -> FArpgConfig. This is the only translation unit that includes
// nlohmann/json. All lookups are type-checked first, so no nlohmann exception is expected; a
// catch-all guard still converts any exception into an error value when exceptions are enabled.
// NOTE: key names follow ArpgCore's fixture format and will be aligned with the designer schema.
#include "ArpgCore/ConfigLoader.h"

#include <nlohmann/json.hpp>

#include <cmath>
#include <exception>
#include <initializer_list>
#include <limits>
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

template <typename TEnum>
using TEnumTable = std::initializer_list<std::pair<const char*, TEnum>>;

/** Type-checked reader that accumulates errors and warnings with their JSON paths. */
class FReader
{
public:
	std::vector<FError> Errors;
	std::vector<FError> Warnings;

	void Error(const std::string& Path, std::string Message) { Errors.push_back(FError{Path, std::move(Message)}); }

	/** Returns the child or nullptr. Obj must be an object. */
	static const FJson* Find(const FJson& Obj, const char* Key)
	{
		const auto It = Obj.find(Key);
		return It == Obj.end() ? nullptr : &*It;
	}

	bool ExpectObject(const FJson& J, const std::string& Path)
	{
		if (!J.is_object())
		{
			Error(Path, "expected object");
			return false;
		}
		return true;
	}

	/** Object child (optional). Returns nullptr if missing or wrong type (error recorded). */
	const FJson* Object(const FJson& Obj, const char* Key, const std::string& Path)
	{
		const FJson* Child = Find(Obj, Key);
		if (Child == nullptr)
		{
			return nullptr;
		}
		return ExpectObject(*Child, Join(Path, Key)) ? Child : nullptr;
	}

	/** Array child (optional). */
	const FJson* Array(const FJson& Obj, const char* Key, const std::string& Path)
	{
		const FJson* Child = Find(Obj, Key);
		if (Child == nullptr)
		{
			return nullptr;
		}
		if (!Child->is_array())
		{
			Error(Join(Path, Key), "expected array");
			return nullptr;
		}
		return Child;
	}

	void WarnUnknownKeys(const FJson& Obj, const std::string& Path, std::initializer_list<const char*> Known)
	{
		for (auto It = Obj.begin(); It != Obj.end(); ++It)
		{
			bool bKnown = false;
			for (const char* Key : Known)
			{
				bKnown = bKnown || It.key() == Key;
			}
			if (!bKnown)
			{
				Warnings.push_back(FError{Join(Path, It.key().c_str()), "unknown key (ignored)"});
			}
		}
	}

	void Float(const FJson& Obj, const char* Key, const std::string& Path, float& Out)
	{
		const FJson* V = Find(Obj, Key);
		if (V == nullptr)
		{
			return;
		}
		if (!V->is_number())
		{
			Error(Join(Path, Key), "expected number");
			return;
		}
		const double D = V->get<double>();
		if (!std::isfinite(D) || std::fabs(D) > static_cast<double>(std::numeric_limits<float>::max()))
		{
			Error(Join(Path, Key), "number out of range");
			return;
		}
		Out = static_cast<float>(D);
	}

	void Int(const FJson& Obj, const char* Key, const std::string& Path, int& Out)
	{
		const FJson* V = Find(Obj, Key);
		if (V == nullptr)
		{
			return;
		}
		if (!V->is_number_integer())
		{
			Error(Join(Path, Key), "expected integer");
			return;
		}
		if (V->is_number_unsigned())
		{
			const unsigned long long U = V->get<unsigned long long>();
			if (U > static_cast<unsigned long long>(std::numeric_limits<int>::max()))
			{
				Error(Join(Path, Key), "integer out of range");
				return;
			}
			Out = static_cast<int>(U);
			return;
		}
		const long long L = V->get<long long>();
		if (L < std::numeric_limits<int>::min() || L > std::numeric_limits<int>::max())
		{
			Error(Join(Path, Key), "integer out of range");
			return;
		}
		Out = static_cast<int>(L);
	}

	void Bool(const FJson& Obj, const char* Key, const std::string& Path, bool& Out)
	{
		const FJson* V = Find(Obj, Key);
		if (V == nullptr)
		{
			return;
		}
		if (!V->is_boolean())
		{
			Error(Join(Path, Key), "expected boolean");
			return;
		}
		Out = V->get<bool>();
	}

	void String(const FJson& Obj, const char* Key, const std::string& Path, std::string& Out, bool bRequired)
	{
		const FJson* V = Find(Obj, Key);
		if (V == nullptr)
		{
			if (bRequired)
			{
				Error(Join(Path, Key), "missing required string");
			}
			return;
		}
		if (!V->is_string())
		{
			Error(Join(Path, Key), "expected string");
			return;
		}
		Out = V->get<std::string>();
	}

	void StringList(const FJson& Obj, const char* Key, const std::string& Path, std::vector<std::string>& Out)
	{
		const FJson* V = Array(Obj, Key, Path);
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

	template <typename TEnum>
	void Enum(const FJson& Obj, const char* Key, const std::string& Path, TEnum& Out, TEnumTable<TEnum> Table, bool bRequired)
	{
		std::string Name;
		const std::size_t ErrorsBefore = Errors.size();
		String(Obj, Key, Path, Name, bRequired);
		if (Errors.size() != ErrorsBefore || Name.empty())
		{
			return;
		}
		for (const auto& [EnumName, Value] : Table)
		{
			if (Name == EnumName)
			{
				Out = Value;
				return;
			}
		}
		std::string Allowed;
		for (const auto& Entry : Table)
		{
			Allowed += (Allowed.empty() ? "" : ", ") + std::string(Entry.first);
		}
		Error(Join(Path, Key), "unknown value '" + Name + "' (allowed: " + Allowed + ")");
	}

	/** Iterates an optional array of objects, calling Fn(item, itemPath). */
	template <typename TFn>
	void ForEachObject(const FJson& Obj, const char* Key, const std::string& Path, TFn&& Fn)
	{
		const FJson* V = Array(Obj, Key, Path);
		if (V == nullptr)
		{
			return;
		}
		for (std::size_t I = 0; I < V->size(); ++I)
		{
			const std::string ItemPath = Idx(Join(Path, Key), I);
			if (ExpectObject((*V)[I], ItemPath))
			{
				Fn((*V)[I], ItemPath);
			}
		}
	}
};

const TEnumTable<EInputType> InputTable{{"light", EInputType::Light}, {"heavy", EInputType::Heavy}};
const TEnumTable<ERarity> RarityTable{{"common", ERarity::Common}, {"good", ERarity::Good},
	{"precious", ERarity::Precious}, {"rare", ERarity::Rare}, {"legendary", ERarity::Legendary}, {"divine", ERarity::Divine}};
const TEnumTable<EMaterialCategory> CategoryTable{{"boss_part", EMaterialCategory::BossPart},
	{"bronze", EMaterialCategory::Bronze}, {"regional", EMaterialCategory::Regional},
	{"shackle_fragment", EMaterialCategory::ShackleFragment}, {"other", EMaterialCategory::Other}};

void ReadMaterialAmount(FReader& R, const FJson& J, const std::string& Path, FMaterialAmount& Out)
{
	R.WarnUnknownKeys(J, Path, {"material", "amount"});
	R.String(J, "material", Path, Out.MaterialId, true);
	R.Int(J, "amount", Path, Out.Amount);
}

void ReadCombat(FReader& R, const FJson& J, const std::string& Path, FCombatConfig& Out)
{
	R.WarnUnknownKeys(J, Path, {"input_buffer_window", "input_buffer_capacity", "chain_link_window", "moves", "combo", "dodge", "parry"});
	R.Float(J, "input_buffer_window", Path, Out.Runner.InputBufferWindow);
	int Capacity = static_cast<int>(Out.Runner.InputBufferCapacity);
	R.Int(J, "input_buffer_capacity", Path, Capacity);
	if (Capacity < 1)
	{
		R.Error(Join(Path, "input_buffer_capacity"), "must be >= 1");
	}
	else
	{
		Out.Runner.InputBufferCapacity = static_cast<std::size_t>(Capacity);
	}
	R.Float(J, "chain_link_window", Path, Out.Runner.ChainLinkWindow);

	R.ForEachObject(J, "moves", Path, [&R, &Out](const FJson& M, const std::string& P) {
		R.WarnUnknownKeys(M, P, {"id", "startup", "active", "recovery", "cancel_start", "cancel_end", "damage",
			"posture_damage", "weight", "unparryable", "undodgeable"});
		FComboMove Move;
		R.String(M, "id", P, Move.Id, true);
		R.Float(M, "startup", P, Move.Timing.Startup);
		R.Float(M, "active", P, Move.Timing.Active);
		R.Float(M, "recovery", P, Move.Timing.Recovery);
		R.Float(M, "cancel_start", P, Move.Timing.CancelStart);
		R.Float(M, "cancel_end", P, Move.Timing.CancelEnd);
		R.Float(M, "damage", P, Move.Attack.BaseDamage);
		R.Float(M, "posture_damage", P, Move.Attack.BasePostureDamage);
		R.Float(M, "weight", P, Move.Attack.Weight);
		R.Bool(M, "unparryable", P, Move.Attack.bUnparryable);
		R.Bool(M, "undodgeable", P, Move.Attack.bUndodgeable);
		Out.Moves.push_back(std::move(Move));
	});

	R.ForEachObject(J, "combo", Path, [&R, &Out](const FJson& T, const std::string& P) {
		R.WarnUnknownKeys(T, P, {"from", "input", "min_delay", "max_delay", "to"});
		FComboTransitionDef Def;
		R.String(T, "from", P, Def.From, false);
		R.Enum(T, "input", P, Def.Input, InputTable, true);
		R.Float(T, "min_delay", P, Def.MinDelay);
		R.Float(T, "max_delay", P, Def.MaxDelay);
		R.String(T, "to", P, Def.To, true);
		Out.Combo.push_back(std::move(Def));
	});

	if (const FJson* D = R.Object(J, "dodge", Path))
	{
		const std::string P = Join(Path, "dodge");
		R.WarnUnknownKeys(*D, P, {"duration", "iframe_start", "iframe_end", "perfect_window"});
		R.Float(*D, "duration", P, Out.Dodge.Duration);
		R.Float(*D, "iframe_start", P, Out.Dodge.IFrameStart);
		R.Float(*D, "iframe_end", P, Out.Dodge.IFrameEnd);
		R.Float(*D, "perfect_window", P, Out.Dodge.PerfectWindow);
	}
	if (const FJson* Pa = R.Object(J, "parry", Path))
	{
		const std::string P = Join(Path, "parry");
		R.WarnUnknownKeys(*Pa, P, {"window", "perfect_window", "duration", "attacker_posture_on_parry",
			"attacker_posture_on_perfect_parry", "defender_posture_on_parry", "defender_posture_on_perfect_parry"});
		R.Float(*Pa, "window", P, Out.Parry.Window);
		R.Float(*Pa, "perfect_window", P, Out.Parry.PerfectWindow);
		R.Float(*Pa, "duration", P, Out.Parry.Duration);
		R.Float(*Pa, "attacker_posture_on_parry", P, Out.Parry.AttackerPostureOnParry);
		R.Float(*Pa, "attacker_posture_on_perfect_parry", P, Out.Parry.AttackerPostureOnPerfectParry);
		R.Float(*Pa, "defender_posture_on_parry", P, Out.Parry.DefenderPostureOnParry);
		R.Float(*Pa, "defender_posture_on_perfect_parry", P, Out.Parry.DefenderPostureOnPerfectParry);
	}
}

void ReadBoss(FReader& R, const FJson& J, const std::string& Path, FBossConfig& Out)
{
	R.WarnUnknownKeys(J, Path, {"id", "max_health", "health_floor_while_shackled", "posture", "shackle", "freed_drops"});
	R.String(J, "id", Path, Out.Id, true);
	R.Float(J, "max_health", Path, Out.MaxHealth);
	R.Float(J, "health_floor_while_shackled", Path, Out.HealthFloorWhileShackled);
	if (const FJson* Po = R.Object(J, "posture", Path))
	{
		const std::string P = Join(Path, "posture");
		R.WarnUnknownKeys(*Po, P, {"max_posture", "regen_per_second", "regen_delay", "stagger_duration",
			"stagger_damage_multiplier", "posture_after_stagger"});
		R.Float(*Po, "max_posture", P, Out.Posture.MaxPosture);
		R.Float(*Po, "regen_per_second", P, Out.Posture.RegenPerSecond);
		R.Float(*Po, "regen_delay", P, Out.Posture.RegenDelay);
		R.Float(*Po, "stagger_duration", P, Out.Posture.StaggerDuration);
		R.Float(*Po, "stagger_damage_multiplier", P, Out.Posture.StaggerDamageMultiplier);
		R.Float(*Po, "posture_after_stagger", P, Out.Posture.PostureAfterStagger);
	}
	if (const FJson* Sh = R.Object(J, "shackle", Path))
	{
		const std::string P = Join(Path, "shackle");
		R.WarnUnknownKeys(*Sh, P, {"enabled", "cracks_to_open", "pry_beats", "lead_in", "beat_interval",
			"beat_half_window", "miss_posture_recover_fraction"});
		R.Bool(*Sh, "enabled", P, Out.Shackle.bEnabled);
		R.Int(*Sh, "cracks_to_open", P, Out.Shackle.CracksToOpen);
		R.Int(*Sh, "pry_beats", P, Out.Shackle.PryBeats);
		R.Float(*Sh, "lead_in", P, Out.Shackle.LeadIn);
		R.Float(*Sh, "beat_interval", P, Out.Shackle.BeatInterval);
		R.Float(*Sh, "beat_half_window", P, Out.Shackle.BeatHalfWindow);
		R.Float(*Sh, "miss_posture_recover_fraction", P, Out.Shackle.MissPostureRecoverFraction);
	}
	R.ForEachObject(J, "freed_drops", Path, [&R, &Out](const FJson& D, const std::string& P) {
		FMaterialAmount Drop;
		ReadMaterialAmount(R, D, P, Drop);
		Out.FreedDrops.push_back(std::move(Drop));
	});
}

void ReadCrafting(FReader& R, const FJson& J, const std::string& Path, FCraftingDatabase& Out)
{
	R.WarnUnknownKeys(J, Path, {"materials", "recipes", "upgrade"});
	R.ForEachObject(J, "materials", Path, [&R, &Out](const FJson& M, const std::string& P) {
		R.WarnUnknownKeys(M, P, {"id", "category"});
		FMaterialDef Def;
		R.String(M, "id", P, Def.Id, true);
		R.Enum(M, "category", P, Def.Category, CategoryTable, true);
		Out.Materials.push_back(std::move(Def));
	});
	R.ForEachObject(J, "recipes", Path, [&R, &Out](const FJson& Rc, const std::string& P) {
		R.WarnUnknownKeys(Rc, P, {"id", "result", "rarity", "inputs", "bonus_rarity_chance"});
		FRecipe Recipe;
		R.String(Rc, "id", P, Recipe.Id, true);
		R.String(Rc, "result", P, Recipe.ResultItemId, true);
		R.Enum(Rc, "rarity", P, Recipe.Rarity, RarityTable, true);
		R.Float(Rc, "bonus_rarity_chance", P, Recipe.BonusRarityChance);
		R.ForEachObject(Rc, "inputs", P, [&R, &Recipe](const FJson& In, const std::string& IP) {
			FMaterialAmount Amount;
			ReadMaterialAmount(R, In, IP, Amount);
			Recipe.Inputs.push_back(std::move(Amount));
		});
		Out.Recipes.push_back(std::move(Recipe));
	});
	if (const FJson* U = R.Object(J, "upgrade", Path))
	{
		const std::string P = Join(Path, "upgrade");
		R.WarnUnknownKeys(*U, P, {"max_level", "terms", "rarity_cost_percent"});
		R.Int(*U, "max_level", P, Out.Upgrade.MaxLevel);
		R.ForEachObject(*U, "terms", P, [&R, &Out](const FJson& T, const std::string& TP) {
			R.WarnUnknownKeys(T, TP, {"material", "base_amount", "amount_per_level"});
			FUpgradeCostTerm Term;
			R.String(T, "material", TP, Term.MaterialId, true);
			R.Int(T, "base_amount", TP, Term.BaseAmount);
			R.Int(T, "amount_per_level", TP, Term.AmountPerLevel);
			Out.Upgrade.Terms.push_back(std::move(Term));
		});
		if (const FJson* Pct = R.Object(*U, "rarity_cost_percent", P))
		{
			const std::string PP = Join(P, "rarity_cost_percent");
			R.WarnUnknownKeys(*Pct, PP, {"common", "good", "precious", "rare", "legendary", "divine"});
			for (const auto& [Name, Rarity] : RarityTable)
			{
				R.Int(*Pct, Name, PP, Out.Upgrade.RarityCostPercent[static_cast<std::size_t>(Rarity)]);
			}
		}
	}
}

void ReadSecret(FReader& R, const FJson& J, const std::string& Path, FSecretGraphDef& Out)
{
	R.WarnUnknownKeys(J, Path, {"id", "initial_clues", "nodes"});
	R.String(J, "id", Path, Out.Id, true);
	R.StringList(J, "initial_clues", Path, Out.InitialClues);
	R.ForEachObject(J, "nodes", Path, [&R, &Out](const FJson& N, const std::string& P) {
		R.WarnUnknownKeys(N, P, {"id", "requires_clues", "excluded_by", "grants_clues", "ending", "hints"});
		FSecretNode Node;
		R.String(N, "id", P, Node.Id, true);
		R.StringList(N, "requires_clues", P, Node.RequiresClues);
		R.StringList(N, "excluded_by", P, Node.ExcludedBy);
		R.StringList(N, "grants_clues", P, Node.GrantsClues);
		R.Bool(N, "ending", P, Node.bIsEnding);
		std::vector<std::string> Hints;
		R.StringList(N, "hints", P, Hints);
		if (Hints.size() > Node.HintKeys.size())
		{
			R.Error(Join(P, "hints"), "at most 3 hint tiers");
		}
		for (std::size_t I = 0; I < Hints.size() && I < Node.HintKeys.size(); ++I)
		{
			Node.HintKeys[I] = Hints[I];
		}
		Out.Nodes.push_back(std::move(Node));
	});
}

TResult<FArpgConfig> LoadImpl(std::string_view JsonText, std::vector<FError>* OutWarnings)
{
	FJson Root;
#if defined(__cpp_exceptions) || defined(_CPPUNWIND)
	try
	{
		Root = FJson::parse(JsonText.begin(), JsonText.end());
	}
	catch (const FJson::parse_error& E)
	{
		return TResult<FArpgConfig>::Fail(FError{"", std::string("malformed JSON: ") + E.what()});
	}
#else
	Root = FJson::parse(JsonText.begin(), JsonText.end(), nullptr, /*allow_exceptions=*/false);
	if (Root.is_discarded())
	{
		return TResult<FArpgConfig>::Fail(FError{"", "malformed JSON"});
	}
#endif

	FReader R;
	if (!R.ExpectObject(Root, "<root>"))
	{
		return TResult<FArpgConfig>::Fail(std::move(R.Errors));
	}

	FArpgConfig Config;
	R.WarnUnknownKeys(Root, "", {"schema_version", "combat", "weapons", "difficulties", "hit_stop", "drum", "bosses",
		"lineage", "crafting", "secrets", "$comment"});
	R.Int(Root, "schema_version", "", Config.SchemaVersion);

	if (const FJson* Combat = R.Object(Root, "combat", ""))
	{
		ReadCombat(R, *Combat, "combat", Config.Combat);
	}
	R.ForEachObject(Root, "weapons", "", [&R, &Config](const FJson& W, const std::string& P) {
		R.WarnUnknownKeys(W, P, {"id", "damage_multiplier", "posture_multiplier"});
		FWeaponConfig Weapon;
		R.String(W, "id", P, Weapon.Id, true);
		R.Float(W, "damage_multiplier", P, Weapon.DamageMultiplier);
		R.Float(W, "posture_multiplier", P, Weapon.PostureMultiplier);
		Config.Weapons.push_back(std::move(Weapon));
	});
	R.ForEachObject(Root, "difficulties", "", [&R, &Config](const FJson& D, const std::string& P) {
		R.WarnUnknownKeys(D, P, {"id", "damage_to_player_multiplier", "damage_to_enemy_multiplier",
			"posture_to_enemy_multiplier", "parry_window_scale", "pry_beat_window_scale"});
		FDifficultyConfig Difficulty;
		R.String(D, "id", P, Difficulty.Id, true);
		R.Float(D, "damage_to_player_multiplier", P, Difficulty.DamageToPlayerMultiplier);
		R.Float(D, "damage_to_enemy_multiplier", P, Difficulty.DamageToEnemyMultiplier);
		R.Float(D, "posture_to_enemy_multiplier", P, Difficulty.PostureToEnemyMultiplier);
		R.Float(D, "parry_window_scale", P, Difficulty.ParryWindowScale);
		R.Float(D, "pry_beat_window_scale", P, Difficulty.PryBeatWindowScale);
		Config.Difficulties.push_back(std::move(Difficulty));
	});
	if (const FJson* H = R.Object(Root, "hit_stop", ""))
	{
		R.WarnUnknownKeys(*H, "hit_stop", {"curve", "min_duration", "max_duration", "time_scale_during_stop", "perfect_parry_bonus"});
		if (R.Array(*H, "curve", "hit_stop") != nullptr)
		{
			Config.HitStop.Curve.clear();
		}
		R.ForEachObject(*H, "curve", "hit_stop", [&R, &Config](const FJson& Pt, const std::string& P) {
			R.WarnUnknownKeys(Pt, P, {"weight", "duration"});
			FHitStopPoint Point;
			R.Float(Pt, "weight", P, Point.Weight);
			R.Float(Pt, "duration", P, Point.Duration);
			Config.HitStop.Curve.push_back(Point);
		});
		R.Float(*H, "min_duration", "hit_stop", Config.HitStop.MinDuration);
		R.Float(*H, "max_duration", "hit_stop", Config.HitStop.MaxDuration);
		R.Float(*H, "time_scale_during_stop", "hit_stop", Config.HitStop.TimeScaleDuringStop);
		R.Float(*H, "perfect_parry_bonus", "hit_stop", Config.HitStop.PerfectParryBonus);
	}
	if (const FJson* D = R.Object(Root, "drum", ""))
	{
		R.WarnUnknownKeys(*D, "drum", {"notches", "points_per_notch", "perfect_parry_gain", "perfect_dodge_gain",
			"hit_gain", "decay_delay", "decay_per_second", "decay_keeps_full_notches"});
		R.Int(*D, "notches", "drum", Config.Drum.Notches);
		R.Float(*D, "points_per_notch", "drum", Config.Drum.PointsPerNotch);
		R.Float(*D, "perfect_parry_gain", "drum", Config.Drum.PerfectParryGain);
		R.Float(*D, "perfect_dodge_gain", "drum", Config.Drum.PerfectDodgeGain);
		R.Float(*D, "hit_gain", "drum", Config.Drum.HitGain);
		R.Float(*D, "decay_delay", "drum", Config.Drum.DecayDelay);
		R.Float(*D, "decay_per_second", "drum", Config.Drum.DecayPerSecond);
		R.Bool(*D, "decay_keeps_full_notches", "drum", Config.Drum.bDecayKeepsFullNotches);
	}
	R.ForEachObject(Root, "bosses", "", [&R, &Config](const FJson& B, const std::string& P) {
		FBossConfig Boss;
		ReadBoss(R, B, P, Boss);
		Config.Bosses.push_back(std::move(Boss));
	});
	if (const FJson* L = R.Object(Root, "lineage", ""))
	{
		R.WarnUnknownKeys(*L, "lineage", {"skill_rank_retention", "max_family_movesets", "store_equipped_in_thap"});
		R.Float(*L, "skill_rank_retention", "lineage", Config.Lineage.SkillRankRetention);
		R.Int(*L, "max_family_movesets", "lineage", Config.Lineage.MaxFamilyMovesets);
		R.Bool(*L, "store_equipped_in_thap", "lineage", Config.Lineage.bStoreEquippedInThap);
	}
	if (const FJson* C = R.Object(Root, "crafting", ""))
	{
		ReadCrafting(R, *C, "crafting", Config.Crafting);
	}
	R.ForEachObject(Root, "secrets", "", [&R, &Config](const FJson& S, const std::string& P) {
		FSecretGraphDef Def;
		ReadSecret(R, S, P, Def);
		Config.Secrets.push_back(std::move(Def));
	});

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

TResult<FArpgConfig> LoadConfigFromJson(std::string_view JsonText, std::vector<FError>* OutWarnings)
{
#if defined(__cpp_exceptions) || defined(_CPPUNWIND)
	try
	{
		return LoadImpl(JsonText, OutWarnings);
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
	return LoadImpl(JsonText, OutWarnings);
#endif
}
} // namespace ArpgCore
