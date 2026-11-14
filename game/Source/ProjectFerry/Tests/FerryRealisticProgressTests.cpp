// UBT ignores this standalone test. Build explicitly with FERRY_REALISTIC_PROGRESS_TESTS.
#if defined(FERRY_REALISTIC_PROGRESS_TESTS)
#include "Sample/FerryRealisticProgress.h"
#include <cassert>

int main()
{
	using namespace FerryRealisticProgress;
	for (int Stage = 0; Stage < 4; ++Stage)
	{
		assert(IsValid(Stage, false));
		assert(!IsValid(Stage, true));
		assert(!CanSpawnBoss(Stage, false));
		assert(!CanReturn(Stage, false));
	}
	// Reaching the bridge opens the encounter, but cannot complete the quest without release.
	assert(IsValid(4, false));
	assert(CanSpawnBoss(4, false));
	assert(!CanReturn(4, false));
	// A saved release removes the boss, and allows returning both now and after loading.
	assert(IsValid(4, true) && IsValid(5, true));
	assert(CanReturn(4, true) && CanReturn(5, true));
	assert(!CanSpawnBoss(4, true) && !CanSpawnBoss(5, true));
	// A tampered/completed slot without its release milestone must not be accepted.
	assert(!IsValid(5, false));
	assert(!IsValid(-1, false) && !IsValid(6, true));
	assert(!CanReturn(6, true));
}
#endif
