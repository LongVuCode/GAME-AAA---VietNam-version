// ProjectFerryEditor.Target.cs - Editor target. NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
using UnrealBuildTool;
using System.Collections.Generic;

public class ProjectFerryEditorTarget : TargetRules
{
	public ProjectFerryEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		// VERIFY: see ProjectFerry.Target.cs (same settings must be used by both targets).
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.AddRange(new string[] { "ProjectFerry", "ProjectFerryEditor" });
	}
}
