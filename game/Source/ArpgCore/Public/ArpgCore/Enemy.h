// Enemy.h - Data for regular enemies and their attacks (design: enemies.json). Pure data: AI
// selection, movement and telegraph presentation belong to the game layer.
#pragma once

#include "ArpgCore/CombatTypes.h"
#include "ArpgCore/Posture.h"

#include <string>
#include <vector>

namespace ArpgCore
{
struct FEnemyAttack
{
	std::string Id;
	FAttackData Attack; // BaseDamage = damage, BasePostureDamage = player_the_damage
	float Windup = 0.5f;
	float Hold = 0.0f;  // extra delay of a delayed attack
	float Active = 0.1f;
	float Recovery = 0.5f;
	int Hits = 1;       // damage values are per hit
	float Cooldown = 1.0f;
	bool bDelayed = false;
};

struct FEnemyConfig
{
	std::string Id;
	std::string Rank = "normal"; // normal / elite / boss
	float MaxHealth = 100.0f;
	FPostureConfig Posture;
	float InterruptThreshold = 0.0f; // minimum posture damage that interrupts (game layer)
	float FrontDamageMult = 1.0f;    // damage multiplier for hits from the front (game layer)
	std::vector<FEnemyAttack> Attacks;
};
} // namespace ArpgCore
