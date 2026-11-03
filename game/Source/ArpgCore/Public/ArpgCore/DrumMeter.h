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
	HitLanded,
};

struct FDrumConfig
{
	int Notches = 4;
	float PointsPerNotch = 100.0f;
	float PerfectParryGain = 50.0f;
	float PerfectDodgeGain = 40.0f;
	float HitGain = 10.0f;
	float DecayDelay = 4.0f;       // seconds without combat before decay starts
	float DecayPerSecond = 15.0f;
	bool bDecayKeepsFullNotches = true; // decay never drops below the last completed notch
};

class ARPGCORE_API FDrumMeter
{
public:
	explicit FDrumMeter(const FDrumConfig& InConfig);

	/** Adds the gain for an event; also counts as combat activity. */
	void AddEvent(EDrumEvent Event);
	/** Marks combat activity (being hit, enemies in aggro) and resets the decay delay. */
	void NotifyCombatActivity() { SinceCombat = 0.0f; }
	void Tick(float DeltaSeconds);

	int GetFullNotches() const;
	float GetPoints() const { return Points; }
	float GetMaxPoints() const;
	bool CanSurge() const;
	/** Spends all notches. Returns false (and spends nothing) if not full. */
	bool TrySurge();

private:
	FDrumConfig Config;
	float Points = 0.0f;
	float SinceCombat = 0.0f;
};
} // namespace ArpgCore
