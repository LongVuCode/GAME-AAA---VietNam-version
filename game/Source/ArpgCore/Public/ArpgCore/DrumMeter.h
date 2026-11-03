// DrumMeter.h - "Nhịp trống" meter: N notches filled by perfect parries / perfect dodges / hits,
// spent in full for "Hồi trống" (DrumSurge), decaying when out of combat.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"

#include <cstdint>

namespace ArpgCore
{
enum class EDrumEvent : std::uint8_t
{
	PerfectParry,
	PerfectDodge,
	HitLanded, // light hit
	HeavyHit,
	Parry,     // non-perfect parry
	PostureBreak,
	PryBeat,
};

struct FDrumConfig
{
	int Notches = 4;
	float PointsPerNotch = 100.0f;
	float PerfectParryGain = 50.0f;
	float PerfectDodgeGain = 40.0f;
	float HitGain = 10.0f;        // light hit
	float HeavyHitGain = 10.0f;
	float ParryGain = 0.0f;
	float PostureBreakGain = 0.0f;
	float PryBeatGain = 0.0f;
	float HitTakenLoss = 0.0f;     // points lost when the player is hit
	bool bHitTakenKeepsFullNotches = true;
	float DecayDelay = 4.0f;       // seconds without combat before decay starts
	float DecayPerSecond = 15.0f;
	bool bDecayKeepsFullNotches = true; // decay never drops below the last completed notch
	int SurgeCostNotches = -1;     // notches spent by DrumSurge; < 0 = all notches
};

class ARPGCORE_API FDrumMeter
{
public:
	explicit FDrumMeter(const FDrumConfig& InConfig);

	/** Adds the gain for an event; also counts as combat activity. */
	void AddEvent(EDrumEvent Event);
	/** Player took a hit: loses HitTakenLoss (optionally never below a full notch); counts as combat. */
	void OnHitTaken();
	/** Marks combat activity (being hit, enemies in aggro) and resets the decay delay. */
	void NotifyCombatActivity() { SinceCombat = 0.0f; }
	void Tick(float DeltaSeconds);

	int GetFullNotches() const;
	float GetPoints() const { return Points; }
	float GetMaxPoints() const;
	bool CanSurge() const;
	/** Spends SurgeCostNotches. Returns false (and spends nothing) if not enough. */
	bool TrySurge();
	float GetSurgeCost() const;

private:
	FDrumConfig Config;
	float Points = 0.0f;
	float SinceCombat = 0.0f;
};
} // namespace ArpgCore
