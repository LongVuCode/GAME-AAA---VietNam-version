// CombatTypes.h - Shared combat enums and per-attack data.
#pragma once

#include <cstdint>

namespace ArpgCore
{
/** Player input kinds that the combat layer understands. */
enum class EInputType : std::uint8_t
{
	Light,
	Heavy,
	Dodge,
	Parry,
	Drum, // "Hồi trống" release
};

/** Data describing one attack (player move or enemy move). Units: seconds / raw points. */
struct FAttackData
{
	float BaseDamage = 10.0f;        // health damage before multipliers
	float BasePostureDamage = 10.0f; // posture ("Thế") damage before multipliers
	float Weight = 1.0f;             // drives hit-stop duration
	bool bUnparryable = false;       // telegraphed attack that parry cannot stop
	bool bUndodgeable = false;       // e.g. area attack; i-frames do not help
};
} // namespace ArpgCore
