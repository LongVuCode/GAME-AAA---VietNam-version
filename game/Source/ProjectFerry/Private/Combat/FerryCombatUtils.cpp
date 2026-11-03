// FerryCombatUtils.cpp - NOT YET BUILT IN UNREAL ENGINE.
#include "Combat/FerryCombatUtils.h"

#include "GameFramework/Actor.h"
#include "HAL/IConsoleManager.h"

static TAutoConsoleVariable<int32> CVarFerryDebug(
	TEXT("ferry.Debug"), 0,
	TEXT("1 = draw player attack sweeps and enemy attack ranges (telegraph spheres are always drawn in the graybox)."),
	ECVF_Default);

namespace FerryCombat
{
void ApplyHitStopDilation(AActor* Actor, bool bStopped, float TimeScaleDuringStop)
{
	if (Actor != nullptr)
	{
		Actor->CustomTimeDilation = bStopped ? FMath::Max(TimeScaleDuringStop, MinHitStopDilation) : 1.0f;
	}
}

bool IsDebugDrawEnabled()
{
	return CVarFerryDebug.GetValueOnGameThread() != 0;
}

FName ToName(const std::string& Id)
{
	return FName(UTF8_TO_TCHAR(Id.c_str()));
}

std::string ToStd(FName Id)
{
	const FString Text = Id.ToString();
	return std::string(TCHAR_TO_UTF8(*Text));
}
} // namespace FerryCombat
