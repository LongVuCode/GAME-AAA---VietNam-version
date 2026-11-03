// Posture.h - Posture ("Thế") meter: damage accumulates toward MaxPosture, regenerates after a
// delay, and breaking it staggers the owner for StaggerDuration seconds.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"

namespace ArpgCore
{
struct FPostureConfig
{
	float MaxPosture = 100.0f;
	float RegenPerSecond = 10.0f;    // accumulated posture removed per second once regen starts
	float RegenDelay = 1.5f;         // seconds after the last posture damage before regen starts
	float StaggerDuration = 3.0f;    // seconds of stagger after a break
	float StaggerDamageMultiplier = 1.5f; // health damage multiplier while staggered
	float PostureAfterStagger = 0.0f;     // accumulated posture (fraction of max) after a normal stagger end
};

class ARPGCORE_API FPosture
{
public:
	explicit FPosture(const FPostureConfig& InConfig);

	/** Adds posture damage. Returns true if this call broke posture. Ignored while staggered. */
	bool ApplyDamage(float Amount);
	/** Removes accumulated posture (e.g. healing items). Ignored while staggered. */
	void Recover(float Amount);
	void Tick(float DeltaSeconds);

	/** Breaks posture now. bIndefinite: the stagger only ends via EndStagger* (final stagger). */
	void ForceStagger(bool bInIndefinite);
	/** Changes MaxPosture (boss phases), keeping the accumulated ratio. */
	void SetMaxPosture(float NewMax);

	/** While paused the stagger timer does not run (used during the pry finisher). */
	void SetStaggerPaused(bool bPaused) { bStaggerPaused = bPaused; }
	/** Ends stagger now; accumulated posture = Max * PostureAfterStagger. */
	void EndStagger();
	/** Ends stagger now and leaves the target RecoverFraction of its posture back
	 *  (accumulated = Max * (1 - RecoverFraction)). Used when a pry beat is missed. */
	void EndStaggerWithRecovery(float RecoverFraction);

	bool IsStaggered() const { return bStaggered; }
	bool IsIndefiniteStagger() const { return bStaggered && bIndefinite; }
	float GetAccumulated() const { return Accumulated; }
	float GetRatio() const;
	float GetStaggerRemaining() const { return StaggerRemaining; }
	/** StaggerDamageMultiplier while staggered, 1 otherwise. */
	float GetDamageMultiplier() const;
	int GetBreakCount() const { return BreakCount; }
	const FPostureConfig& GetConfig() const { return Config; }

private:
	FPostureConfig Config;
	float Accumulated = 0.0f;
	float SinceLastDamage = 0.0f;
	float StaggerRemaining = 0.0f;
	bool bStaggered = false;
	bool bStaggerPaused = false;
	bool bIndefinite = false;
	int BreakCount = 0;
};
} // namespace ArpgCore
