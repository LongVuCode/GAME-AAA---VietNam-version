// FerryCombatUtils.h - Helpers shared by the game module (plain C++, not parsed by UHT).
// NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#pragma once

#include "CoreMinimal.h"

#include <string>

class AActor;

namespace FerryCombat
{
/** CustomTimeDilation floor during hit-stop. VERIFY: 0 would be a full freeze as the data asks
 *  (time_scale 0) but some engine code divides by the dilated delta; 0.01 is visually a freeze. */
inline constexpr float MinHitStopDilation = 0.01f;

/** Applies the hit-stop of an ArpgCore clock to an actor through CustomTimeDilation (per actor, not global). */
PROJECTFERRY_API void ApplyHitStopDilation(AActor* Actor, bool bStopped, float TimeScaleDuringStop);

/** True when ferry.Debug is non-zero (extra debug drawing). */
PROJECTFERRY_API bool IsDebugDrawEnabled();

/** Converts an ArpgCore id to FName / back. */
PROJECTFERRY_API FName ToName(const std::string& Id);
PROJECTFERRY_API std::string ToStd(FName Id);
} // namespace FerryCombat
