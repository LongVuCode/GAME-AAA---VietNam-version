#pragma once

// Portable progression rules, independent from Unreal world actors and SaveGame serialization.
namespace FerrySampleProgress
{
enum class EAction { TalkToNan, ReachLookout, HelpPerson, LowerBridge };
constexpr bool IsValid(int Stage) { return Stage >= 0 && Stage <= 5; }
constexpr int Next(int Stage, EAction Action)
{
	if (!IsValid(Stage)) return Stage; // Invalid saves must be rejected by their reader, not silently converted.
	switch (Action)
	{
	case EAction::TalkToNan: return Stage >= 4 ? 5 : Stage < 1 ? 1 : Stage;
	case EAction::ReachLookout: return Stage < 2 ? 2 : Stage;
	case EAction::HelpPerson: return Stage < 3 ? 3 : Stage;
	case EAction::LowerBridge: return Stage == 3 ? 4 : Stage;
	}
	return Stage;
}
} // namespace FerrySampleProgress
