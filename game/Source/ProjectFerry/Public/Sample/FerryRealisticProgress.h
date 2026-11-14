#pragma once

/** Portable guards for the optional level06 boss milestone; legacy sample05 stays unchanged. */
namespace FerryRealisticProgress
{
constexpr bool IsValid(int Stage, bool bBossFreed)
{
	return Stage >= 0 && Stage <= 5 && (Stage != 5 || bBossFreed) && (!bBossFreed || Stage >= 4);
}
constexpr bool CanSpawnBoss(int Stage, bool bBossFreed) { return Stage == 4 && !bBossFreed; }
constexpr bool CanReturn(int Stage, bool bBossFreed) { return (Stage == 4 || Stage == 5) && bBossFreed; }
} // namespace FerryRealisticProgress
