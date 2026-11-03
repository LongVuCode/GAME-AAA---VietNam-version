// FerryDesignDataLoader.cpp - Reads design/data/*.json: gameplay values through ArpgCore::LoadDesignData,
// presentation fields through UE's Json module. NOT YET BUILT IN UNREAL ENGINE.
#include "Data/FerryDesignData.h"

#include "ArpgCore/DesignDataLoader.h"
#include "Dom/JsonObject.h"
#include "HAL/FileManager.h"
#include "Misc/CommandLine.h"
#include "Misc/FileHelper.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "ProjectFerry.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

#include <string>

namespace FerryData
{
using FJsonArray = TArray<TSharedPtr<FJsonValue>>;

FString ToFString(const std::string& In)
{
	return FString(UTF8_TO_TCHAR(In.c_str()));
}

FString FormatCoreError(const ArpgCore::FError& Error)
{
	return Error.Path.empty() ? ToFString(Error.Message) : ToFString(Error.Path) + TEXT(": ") + ToFString(Error.Message);
}

/** One design file kept both as UTF-8 bytes (for ArpgCore) and as FString (for UE Json). */
struct FDesignFile
{
	FString Name;
	std::string Utf8;
	FString Text;
	TSharedPtr<FJsonObject> Root;
};

bool ReadDesignFile(const FString& Directory, const TCHAR* FileName, bool bRequired, FDesignFile& Out, FFerryDesignDataLoadReport& Report)
{
	Out.Name = FileName;
	const FString Path = FPaths::Combine(Directory, FileName);
	TArray<uint8> Bytes;
	if (!FFileHelper::LoadFileToArray(Bytes, *Path, FILEREAD_Silent))
	{
		(bRequired ? Report.Errors : Report.Warnings).Add(FString::Printf(TEXT("%s: cannot read file"), *Path));
		return false;
	}
	// Skip a UTF-8 BOM so both parsers see plain JSON.
	int32 Offset = 0;
	if (Bytes.Num() >= 3 && Bytes[0] == 0xEF && Bytes[1] == 0xBB && Bytes[2] == 0xBF)
	{
		Offset = 3;
	}
	Out.Utf8.assign(reinterpret_cast<const char*>(Bytes.GetData()) + Offset, static_cast<size_t>(Bytes.Num() - Offset));
	FFileHelper::BufferToString(Out.Text, Bytes.GetData() + Offset, Bytes.Num() - Offset);

	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Out.Text);
	if (!FJsonSerializer::Deserialize(Reader, Out.Root) || !Out.Root.IsValid())
	{
		(bRequired ? Report.Errors : Report.Warnings).Add(FString::Printf(TEXT("%s: JSON parse error: %s"), *Path, *Reader->GetErrorMessage()));
		Out.Root.Reset();
		return false;
	}
	return true;
}

TSharedPtr<FJsonObject> ObjectAt(const TSharedPtr<FJsonObject>& Obj, const TCHAR* Key)
{
	const TSharedPtr<FJsonObject>* Found = nullptr;
	if (Obj.IsValid() && Obj->TryGetObjectField(Key, Found) && Found != nullptr)
	{
		return *Found;
	}
	return nullptr;
}

const FJsonArray* ArrayAt(const TSharedPtr<FJsonObject>& Obj, const TCHAR* Key)
{
	const FJsonArray* Found = nullptr;
	if (Obj.IsValid() && Obj->TryGetArrayField(Key, Found))
	{
		return Found;
	}
	return nullptr;
}

FString StringAt(const TSharedPtr<FJsonObject>& Obj, const TCHAR* Key, const FString& Default = FString())
{
	FString Value;
	return (Obj.IsValid() && Obj->TryGetStringField(Key, Value)) ? Value : Default;
}

/** Reads a number; records a warning (with the JSON path) and returns Default when missing. */
float NumberAt(const TSharedPtr<FJsonObject>& Obj, const TCHAR* Key, float Default, const FString& Path,
	FFerryDesignDataLoadReport& Report)
{
	double Value = 0.0;
	if (Obj.IsValid() && Obj->TryGetNumberField(Key, Value))
	{
		return static_cast<float>(Value);
	}
	Report.Warnings.Add(FString::Printf(TEXT("%s.%s: missing, using placeholder %g"), *Path, Key, Default));
	return Default;
}

float NumberOr(const TSharedPtr<FJsonObject>& Obj, const TCHAR* Key, float Default)
{
	double Value = 0.0;
	return (Obj.IsValid() && Obj->TryGetNumberField(Key, Value)) ? static_cast<float>(Value) : Default;
}

bool BoolOr(const TSharedPtr<FJsonObject>& Obj, const TCHAR* Key, bool Default)
{
	bool Value = false;
	return (Obj.IsValid() && Obj->TryGetBoolField(Key, Value)) ? Value : Default;
}

FFerryLocText LocTextAt(const TSharedPtr<FJsonObject>& Obj, const TCHAR* Key)
{
	FFerryLocText Out;
	const TSharedPtr<FJsonObject> Text = ObjectAt(Obj, Key);
	Out.Vi = StringAt(Text, TEXT("vi"));
	Out.En = StringAt(Text, TEXT("en"));
	return Out;
}

void ReadTuning(const TSharedPtr<FJsonObject>& Root, FFerryPresentationTuning& T, FFerryDesignDataLoadReport& R)
{
	const FString F = TEXT("combat_tuning");
	const TSharedPtr<FJsonObject> Movement = ObjectAt(Root, TEXT("movement"));
	T.WalkSpeedMps = NumberAt(Movement, TEXT("walk_speed_mps"), T.WalkSpeedMps, F + TEXT(".movement"), R);
	T.RunSpeedMps = NumberAt(Movement, TEXT("run_speed_mps"), T.RunSpeedMps, F + TEXT(".movement"), R);

	const TSharedPtr<FJsonObject> Dodge = ObjectAt(Root, TEXT("dodge"));
	T.DodgeDistanceM = NumberAt(Dodge, TEXT("distance_m"), T.DodgeDistanceM, F + TEXT(".dodge"), R);

	const TSharedPtr<FJsonObject> Lock = ObjectAt(Root, TEXT("lock_on"));
	T.LockMaxDistanceM = NumberAt(Lock, TEXT("max_distance_m"), T.LockMaxDistanceM, F + TEXT(".lock_on"), R);
	T.LockAcquireConeDeg = NumberAt(Lock, TEXT("acquire_cone_deg"), T.LockAcquireConeDeg, F + TEXT(".lock_on"), R);
	T.LockBreakDistanceM = NumberAt(Lock, TEXT("break_distance_m"), T.LockBreakDistanceM, F + TEXT(".lock_on"), R);
	T.LockBreakAfterLosLostS = NumberAt(Lock, TEXT("break_after_los_lost_s"), T.LockBreakAfterLosLostS, F + TEXT(".lock_on"), R);

	const TSharedPtr<FJsonObject> Ai = ObjectAt(Root, TEXT("enemy_ai"));
	T.MaxSimultaneousAttackers = FMath::Max(1, FMath::RoundToInt(NumberAt(Ai, TEXT("max_simultaneous_attackers"),
		static_cast<float>(T.MaxSimultaneousAttackers), F + TEXT(".enemy_ai"), R)));
	T.AttackTokenCooldownS = NumberAt(Ai, TEXT("attack_token_cooldown_s"), T.AttackTokenCooldownS, F + TEXT(".enemy_ai"), R);

	const TSharedPtr<FJsonObject> HitStop = ObjectAt(Root, TEXT("hit_stop"));
	T.bHitStopAppliesToAttacker = BoolOr(HitStop, TEXT("applies_to_attacker"), T.bHitStopAppliesToAttacker);
	T.bHitStopAppliesToTarget = BoolOr(HitStop, TEXT("applies_to_target"), T.bHitStopAppliesToTarget);

	const TSharedPtr<FJsonObject> Pry = ObjectAt(Root, TEXT("pry"));
	T.bPlayerInvulnerableDuringPry = BoolOr(Pry, TEXT("player_invulnerable_during"), T.bPlayerInvulnerableDuringPry);
	// pry.range_m is not part of the schema yet; keep the placeholder and say so once.
	T.PryRangeM = NumberOr(Pry, TEXT("range_m"), T.PryRangeM);
	if (!Pry.IsValid() || !Pry->HasField(TEXT("range_m")))
	{
		R.Warnings.Add(FString::Printf(TEXT("combat_tuning.pry.range_m: not in schema, using placeholder %g m"), T.PryRangeM));
	}
}

void ReadDifficultyNames(const TSharedPtr<FJsonObject>& Root, TMap<FName, FFerryLocText>& Out)
{
	const TSharedPtr<FJsonObject> Difficulty = ObjectAt(Root, TEXT("difficulty"));
	if (const FJsonArray* Presets = ArrayAt(Difficulty, TEXT("presets")))
	{
		for (const TSharedPtr<FJsonValue>& Value : *Presets)
		{
			const TSharedPtr<FJsonObject> Preset = Value.IsValid() ? Value->AsObject() : nullptr;
			const FString Id = StringAt(Preset, TEXT("id"));
			if (!Id.IsEmpty())
			{
				Out.Add(FName(*Id), LocTextAt(Preset, TEXT("name")));
			}
		}
	}
}

void ReadWeapons(const TSharedPtr<FJsonObject>& Root, FFerryDesignData& Data, FFerryDesignDataLoadReport& R)
{
	const FJsonArray* Weapons = ArrayAt(Root, TEXT("weapons"));
	if (Weapons == nullptr)
	{
		R.Errors.Add(TEXT("weapons.json: missing 'weapons' array"));
		return;
	}
	for (int32 WeaponIndex = 0; WeaponIndex < Weapons->Num(); ++WeaponIndex)
	{
		const TSharedPtr<FJsonObject> W = (*Weapons)[WeaponIndex].IsValid() ? (*Weapons)[WeaponIndex]->AsObject() : nullptr;
		const FString Path = FString::Printf(TEXT("weapons.json weapons[%d]"), WeaponIndex);
		FFerryWeaponView View;
		View.Id = FName(*StringAt(W, TEXT("id")));
		View.Slot = FMath::RoundToInt(NumberAt(W, TEXT("slot"), 0.0f, Path, R));
		View.Name = LocTextAt(W, TEXT("name"));
		float LongestRange = 0.0f;
		if (const FJsonArray* Moves = ArrayAt(W, TEXT("moves")))
		{
			for (int32 MoveIndex = 0; MoveIndex < Moves->Num(); ++MoveIndex)
			{
				const TSharedPtr<FJsonObject> M = (*Moves)[MoveIndex].IsValid() ? (*Moves)[MoveIndex]->AsObject() : nullptr;
				const FString MovePath = FString::Printf(TEXT("%s.moves[%d]"), *Path, MoveIndex);
				FFerryMoveView Move;
				Move.Id = FName(*StringAt(M, TEXT("id")));
				Move.Input = StringAt(M, TEXT("input"));
				Move.RangeM = NumberAt(M, TEXT("range_m"), Move.RangeM, MovePath, R);
				Move.ArcDeg = NumberAt(M, TEXT("arc_deg"), Move.ArcDeg, MovePath, R);
				Move.bHeavyInput = Move.Input.EndsWith(TEXT("H"));
				LongestRange = FMath::Max(LongestRange, Move.RangeM);
				View.Moves.Add(Move.Id, Move);
			}
		}
		if (LongestRange > 0.0f)
		{
			View.BurstRangeM = LongestRange;
		}
		if (View.Id.IsNone())
		{
			R.Errors.Add(Path + TEXT(".id: missing"));
			continue;
		}
		Data.Weapons.Add(View.Id, MoveTemp(View));
	}
	Data.Weapons.GetKeys(Data.WeaponsBySlot);
	Data.WeaponsBySlot.Sort([&Data](const FName& A, const FName& B) { return Data.Weapons[A].Slot < Data.Weapons[B].Slot; });
}

void ReadEnemies(const TSharedPtr<FJsonObject>& Root, FFerryDesignData& Data, FFerryDesignDataLoadReport& R)
{
	const FJsonArray* Enemies = ArrayAt(Root, TEXT("enemies"));
	if (Enemies == nullptr)
	{
		R.Errors.Add(TEXT("enemies.json: missing 'enemies' array"));
		return;
	}
	for (int32 EnemyIndex = 0; EnemyIndex < Enemies->Num(); ++EnemyIndex)
	{
		const TSharedPtr<FJsonObject> E = (*Enemies)[EnemyIndex].IsValid() ? (*Enemies)[EnemyIndex]->AsObject() : nullptr;
		const FString Path = FString::Printf(TEXT("enemies.json enemies[%d]"), EnemyIndex);
		FFerryEnemyView View;
		View.Id = FName(*StringAt(E, TEXT("id")));
		View.Name = LocTextAt(E, TEXT("name"));
		View.Rank = FName(*StringAt(E, TEXT("rank"), TEXT("normal")));
		View.DefeatBehavior = FName(*StringAt(E, TEXT("defeat_behavior"), TEXT("flee")));
		View.bRespawnsAtCheckpoint = BoolOr(E, TEXT("respawns_at_checkpoint"), true);
		const TSharedPtr<FJsonObject> KhoenData = ObjectAt(E, TEXT("khoen"));
		const FString FreedFlag = StringAt(ObjectAt(KhoenData, TEXT("on_pry_success")), TEXT("sets_flag"));
		const FString FledFlag = StringAt(ObjectAt(KhoenData, TEXT("fallback_when_disabled")), TEXT("sets_flag"));
		View.FreedFlag = FreedFlag.IsEmpty() ? NAME_None : FName(*FreedFlag);
		View.FledFlag = FledFlag.IsEmpty() ? NAME_None : FName(*FledFlag);
		if (const FJsonArray* Attacks = ArrayAt(E, TEXT("attacks")))
		{
			for (int32 AttackIndex = 0; AttackIndex < Attacks->Num(); ++AttackIndex)
			{
				const TSharedPtr<FJsonObject> A = (*Attacks)[AttackIndex].IsValid() ? (*Attacks)[AttackIndex]->AsObject() : nullptr;
				FFerryEnemyAttackView Attack;
				Attack.Id = FName(*StringAt(A, TEXT("id")));
				Attack.RangeM = NumberAt(A, TEXT("range_m"), Attack.RangeM, FString::Printf(TEXT("%s.attacks[%d]"), *Path, AttackIndex), R);
				const FString Cue = StringAt(ObjectAt(A, TEXT("telegraph")), TEXT("color_cue"), TEXT("none"));
				Attack.bColorCue = !Cue.IsEmpty() && Cue != TEXT("none");
				Attack.EndsInStumbleS = NumberOr(A, TEXT("ends_in_stumble_s"), 0.0f);
				Attack.PushbackM = NumberOr(A, TEXT("pushback_m"), 0.0f);
				View.Attacks.Add(Attack.Id, Attack);
			}
		}
		if (View.Id.IsNone())
		{
			R.Errors.Add(Path + TEXT(".id: missing"));
			continue;
		}
		Data.Enemies.Add(View.Id, MoveTemp(View));
	}
}

void ReadStrings(const TSharedPtr<FJsonObject>& Root, FFerryDesignData& Data)
{
	const TSharedPtr<FJsonObject> Ui = ObjectAt(Root, TEXT("ui"));
	if (!Ui.IsValid())
	{
		return;
	}
	for (const TPair<FString, TSharedPtr<FJsonValue>>& Pair : Ui->Values)
	{
		const TSharedPtr<FJsonObject> Entry = Pair.Value.IsValid() ? Pair.Value->AsObject() : nullptr;
		if (Entry.IsValid() && !Pair.Key.StartsWith(TEXT("_")))
		{
			FFerryLocText Text;
			Text.Vi = StringAt(Entry, TEXT("vi"));
			Text.En = StringAt(Entry, TEXT("en"));
			Data.UiStrings.Add(FName(*Pair.Key), Text);
		}
	}
}

void FlushToLog(const FFerryDesignDataLoadReport& Report)
{
	for (const FString& Warning : Report.Warnings)
	{
		UE_LOG(LogFerry, Warning, TEXT("design data: %s"), *Warning);
	}
	for (const FString& Error : Report.Errors)
	{
		UE_LOG(LogFerry, Error, TEXT("design data: %s"), *Error);
	}
}
} // namespace FerryData

FString FFerryDesignDataLoader::ResolveDataDirectory()
{
	FString Override;
	if (FParse::Value(FCommandLine::Get(), TEXT("FerryDataDir="), Override) && !Override.IsEmpty())
	{
		return FPaths::ConvertRelativePathToFull(Override);
	}
	const FString RepoDir = FPaths::ConvertRelativePathToFull(FPaths::Combine(FPaths::ProjectDir(), TEXT(".."), TEXT("design"), TEXT("data")));
	if (IFileManager::Get().DirectoryExists(*RepoDir))
	{
		return RepoDir;
	}
	// VERIFY: in packaged builds the staged UFS directory lives inside the .pak; FFileHelper reads through
	// the pak platform file, so the path is returned without a DirectoryExists check.
	return FPaths::Combine(FPaths::ProjectContentDir(), TEXT("Data"), TEXT("Design"));
}

TSharedPtr<const FFerryDesignData> FFerryDesignDataLoader::LoadFromDisk(FFerryDesignDataLoadReport& OutReport)
{
	return LoadFromDirectory(ResolveDataDirectory(), OutReport);
}

TSharedPtr<const FFerryDesignData> FFerryDesignDataLoader::LoadFromDirectory(const FString& Directory, FFerryDesignDataLoadReport& OutReport)
{
	using namespace FerryData;
	OutReport = FFerryDesignDataLoadReport();
	OutReport.DataDirectory = Directory;

	FDesignFile Combat, Weapons, Enemies, Items, Lineage, Secrets, Strings;
	bool bOk = true;
	bOk &= ReadDesignFile(Directory, TEXT("combat_tuning.json"), true, Combat, OutReport);
	bOk &= ReadDesignFile(Directory, TEXT("weapons.json"), true, Weapons, OutReport);
	bOk &= ReadDesignFile(Directory, TEXT("enemies.json"), true, Enemies, OutReport);
	bOk &= ReadDesignFile(Directory, TEXT("items.json"), true, Items, OutReport);
	bOk &= ReadDesignFile(Directory, TEXT("lineage.json"), true, Lineage, OutReport);
	bOk &= ReadDesignFile(Directory, TEXT("secrets.json"), true, Secrets, OutReport);
	ReadDesignFile(Directory, TEXT("strings.json"), false, Strings, OutReport); // HUD falls back to keys
	if (!bOk)
	{
		FlushToLog(OutReport);
		return nullptr;
	}

	// 1) Gameplay values: ArpgCore (parses, maps, runs ValidateConfig).
	ArpgCore::FDesignDataSources Sources;
	Sources.CombatTuning = Combat.Utf8;
	Sources.Weapons = Weapons.Utf8;
	Sources.Enemies = Enemies.Utf8;
	Sources.Items = Items.Utf8;
	Sources.Lineage = Lineage.Utf8;
	Sources.Secrets = Secrets.Utf8;
	std::vector<ArpgCore::FError> CoreWarnings;
	ArpgCore::TResult<ArpgCore::FArpgConfig> Core = ArpgCore::LoadDesignData(Sources, &CoreWarnings);
	for (const ArpgCore::FError& Warning : CoreWarnings)
	{
		OutReport.Warnings.Add(TEXT("ArpgCore: ") + FormatCoreError(Warning));
	}
	if (!Core.IsOk())
	{
		for (const ArpgCore::FError& Error : Core.GetErrors())
		{
			OutReport.Errors.Add(TEXT("ArpgCore: ") + FormatCoreError(Error));
		}
		FlushToLog(OutReport);
		return nullptr;
	}

	// 2) Presentation fields: UE Json.
	TSharedRef<FFerryDesignData> Data = MakeShared<FFerryDesignData>();
	Data->Core = MoveTemp(Core.GetValue());
	ReadTuning(Combat.Root, Data->Tuning, OutReport);
	ReadDifficultyNames(Combat.Root, Data->Difficulties);
	ReadWeapons(Weapons.Root, *Data, OutReport);
	ReadEnemies(Enemies.Root, *Data, OutReport);
	if (Strings.Root.IsValid())
	{
		ReadStrings(Strings.Root, *Data);
	}

	// Cross-check: every ArpgCore moveset / enemy / boss has its presentation entry.
	for (const ArpgCore::FMovesetConfig& Moveset : Data->Core.Movesets)
	{
		const FFerryWeaponView* View = Data->FindWeapon(FName(*ToFString(Moveset.WeaponId)));
		if (View == nullptr)
		{
			OutReport.Errors.Add(FString::Printf(TEXT("weapon '%s' has no presentation entry"), *ToFString(Moveset.WeaponId)));
		}
	}
	for (const ArpgCore::FEnemyConfig& Enemy : Data->Core.Enemies)
	{
		if (Data->FindEnemy(FName(*ToFString(Enemy.Id))) == nullptr)
		{
			OutReport.Errors.Add(FString::Printf(TEXT("enemy '%s' has no presentation entry"), *ToFString(Enemy.Id)));
		}
	}
	for (const ArpgCore::FBossConfig& Boss : Data->Core.Bosses)
	{
		if (Data->FindEnemy(FName(*ToFString(Boss.Id))) == nullptr)
		{
			OutReport.Errors.Add(FString::Printf(TEXT("boss '%s' has no presentation entry"), *ToFString(Boss.Id)));
		}
	}

	FlushToLog(OutReport);
	if (OutReport.Errors.Num() > 0)
	{
		return nullptr;
	}
	UE_LOG(LogFerry, Log, TEXT("design data loaded from %s: %d weapons, %d enemies, %d bosses, %d UI strings, %d warnings"),
		*Directory, Data->Weapons.Num(), static_cast<int32>(Data->Core.Enemies.size()), static_cast<int32>(Data->Core.Bosses.size()),
		Data->UiStrings.Num(), OutReport.Warnings.Num());
	return Data;
}
