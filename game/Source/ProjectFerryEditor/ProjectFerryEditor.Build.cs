// ProjectFerryEditor.Build.cs - Editor-only module (minimal). NOT YET BUILT IN UNREAL ENGINE.
// Future home of data validators (TECH_SPEC §3: data asset lint, secret-graph reachability,
// localization coverage). The graybox level itself is built by Content/Python/build_graybox_longbien.py.
using UnrealBuildTool;

public class ProjectFerryEditor : ModuleRules
{
	public ProjectFerryEditor(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"UnrealEd",
			"ArpgCore",
			"ProjectFerry",
		});
	}
}
