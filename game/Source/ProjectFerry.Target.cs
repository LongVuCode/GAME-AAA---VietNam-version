// ProjectFerry.Target.cs - Game target. NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
using UnrealBuildTool;
using System.Collections.Generic;

public class ProjectFerryTarget : TargetRules
{
	public ProjectFerryTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		// VERIFY: "Latest" tracks the installed engine (5.6 / 5.7). If UBT warns, replace with the
		// values from a fresh UE C++ template of the pinned version (e.g. BuildSettingsVersion.V5 and
		// EngineIncludeOrderVersion.Unreal5_6 / Unreal5_7).
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.AddRange(new string[] { "ProjectFerry" });
	}
}
