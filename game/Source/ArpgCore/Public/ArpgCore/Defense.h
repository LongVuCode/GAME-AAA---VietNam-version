// Defense.h - Dodge (i-frames, perfect dodge) and parry (normal / perfect window, unparryable attacks).
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/CombatTypes.h"

#include <cstdint>

namespace ArpgCore
{
struct FDodgeConfig
{
	float Duration = 0.50f;      // dodge motion; i-frames are measured from its start
	float Recovery = 0.0f;       // extra busy time after Duration
	float IFrameStart = 0.05f;   // seconds from dodge start
	float IFrameEnd = 0.25f;     // exclusive
	float PerfectWindow = 0.08f; // hits landing in [IFrameStart, IFrameStart + PerfectWindow] are perfect
};

struct FParryConfig
{
	float Window = 0.15f;        // normal parry window from press
	float PerfectWindow = 0.05f; // perfect window from press (subset of Window)
	float Duration = 0.40f;      // whole parry action (anti-spam lockout)
	// Posture exchange (see Damage.h): flat amount + fraction of the incoming attack's posture damage.
	float AttackerPostureFlatOnParry = 0.0f;
	float AttackerPostureFlatOnPerfectParry = 0.0f;
	float AttackerPostureOnParry = 0.5f;
	float AttackerPostureOnPerfectParry = 1.0f;
	float DefenderPostureOnParry = 0.3f;
	float DefenderPostureOnPerfectParry = 0.0f;
};

/** Holding guard (block): reduces damage of guardable attacks. */
struct FGuardConfig
{
	float DamageReduction = 0.7f;   // fraction of health damage removed
	float PostureDamageMult = 1.0f; // multiplier on posture damage taken while guarding
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
	Guarded,
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
	/** Guard held or released. Guard does not block StartDodge/StartParry. */
	void SetGuarding(bool bInGuarding) { bGuarding = bInGuarding; }
	bool IsGuarding() const { return bGuarding; }

	/** Resolves an attack landing right now: dodge/parry first, then guard. Does not change state. */
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
	bool bGuarding = false;
};

/** True for outcomes that reward the Drum meter / count as "perfect". */
inline bool IsPerfectOutcome(EDefenseOutcome Outcome)
{
	return Outcome == EDefenseOutcome::PerfectDodge || Outcome == EDefenseOutcome::PerfectParry;
}
} // namespace ArpgCore
