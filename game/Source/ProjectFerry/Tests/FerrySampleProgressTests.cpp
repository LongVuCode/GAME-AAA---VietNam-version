// UBT ignores this standalone test body. Build explicitly with FERRY_SAMPLE_PROGRESS_TESTS.
#if defined(FERRY_SAMPLE_PROGRESS_TESTS)
#include "Sample/FerrySampleProgress.h"
#include <cassert>
#include <initializer_list>

int main()
{
	using namespace FerrySampleProgress;
	int Stage = 0;
	for (EAction Action : {EAction::TalkToNan, EAction::ReachLookout, EAction::HelpPerson, EAction::LowerBridge, EAction::TalkToNan})
		Stage = Next(Stage, Action);
	assert(Stage == 5);
	// Fast explorers can rescue before talking/visiting the lookout, without a softlock.
	Stage = Next(0, EAction::HelpPerson);
	assert(Stage == 3);
	Stage = Next(Stage, EAction::LowerBridge);
	assert(Next(Stage, EAction::TalkToNan) == 5);
	assert(Next(0, EAction::LowerBridge) == 0);
	assert(Next(2, EAction::LowerBridge) == 2);
	for (int Saved = 0; Saved <= 5; ++Saved)
	{
		assert(IsValid(Saved));
		for (EAction Action : {EAction::TalkToNan, EAction::ReachLookout, EAction::HelpPerson, EAction::LowerBridge})
		{
			const int Once = Next(Saved, Action);
			assert(Once >= Saved && IsValid(Once));
			assert(Next(Once, Action) == Once); // repeated trigger/load cannot award or regress a milestone
		}
	}
	assert(!IsValid(-1) && !IsValid(6));
	assert(Next(6, EAction::HelpPerson) == 6);
}
#endif
