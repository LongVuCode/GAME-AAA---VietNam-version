// Defense.h - Dodge (i-frames, perfect dodge) and parry (normal / perfect window, unparryable attacks).
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/CombatTypes.h"

#include <cstdint>

namespace ArpgCore
{
struct FDodgeConfig
{
	float Duration = 0.50f;      // whole dodge action (busy time)
	float IFrameStart = 0.05f;   // seconds from dodge start
	float IFrameEnd = 0.25f;     // exclusive
	float PerfectWindow = 0.08f; // hits landing in [IFrameStart, IFrameStart + PerfectWindow] are perfect
};

struct FParryConfig
{
	float Window = 0.15f;        // normal parry window from press
	float PerfectWindow = 0.05f; // perfect window from press (subset of Window)
	float Duration = 0.40f;      // whole parry action (anti-spam lockout)
	// Posture exchange as fractions of the incoming attack's posture damage (see Damage.h).
	float AttackerPostureOnParry = 0.5f;
	float AttackerPostureOnPerfectParry = 1.0f;
	float DefenderPostureOnParry = 0.3f;
	float DefenderPostureOnPerfectParry = 0.0f;
};

enum class EDefenseAction : std::uint8_t
{
	None,
	Dodge,
	Parry,
};

enum class EDefenseOutcome : std::uint8_t
{
	Hit,
	Dodged,
	PerfectDodge,
	Parried,
	PerfectParry,
};

class ARPGCORE_API FDefenseController
{
public:
	/** ParryWindowScale comes from difficulty (accessibility); it scales both parry windows. */
	FDefenseController(const FDodgeConfig& InDodge, const FParryConfig& InParry, float ParryWindowScale = 1.0f);

	/** Returns false if another defensive action is still running. */
	bool StartDodge();
	bool StartParry();
	void Tick(float DeltaSeconds);

	/** Resolves an attack landing right now. Does not change state. */
	EDefenseOutcome ResolveIncoming(const FAttackData& Attack) const;

	EDefenseAction GetAction() const { return Action; }
	float GetActionElapsed() const { return Elapsed; }
	bool IsBusy() const { return Action != EDefenseAction::None; }
	bool IsInvulnerable() const;
	float GetEffectiveParryWindow() const { return ParryWindow; }
	float GetEffectivePerfectParryWindow() const { return PerfectParryWindow; }

private:
	FDodgeConfig Dodge;
	FParryConfig Parry;
	float ParryWindow;
	float PerfectParryWindow;
	EDefenseAction Action = EDefenseAction::None;
	float Elapsed = 0.0f;
};

/** True for outcomes that reward the Drum meter / count as "perfect". */
inline bool IsPerfectOutcome(EDefenseOutcome Outcome)
{
	return Outcome == EDefenseOutcome::PerfectDodge || Outcome == EDefenseOutcome::PerfectParry;
}
} // namespace ArpgCore
