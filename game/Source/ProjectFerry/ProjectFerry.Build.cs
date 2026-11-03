// ProjectFerry.Build.cs - Game module of the ProjectFerry UE project (Demo 0.1 graybox).
// STATUS: NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE"). See docs/BUILD_GUIDE_UE.md.
using UnrealBuildTool;

public class ProjectFerry : ModuleRules
{
	public ProjectFerry(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		// ArpgCore public headers are C++20 (std::optional, std::set, designated defaults).
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"InputCore",
			"EnhancedInput",
			"ArpgCore",
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"AIModule", // AAIController possesses AFerryEnemy so CharacterMovement consumes its input
			"Json",     // UE-side reading of design/data/*.json (presentation fields, see FerryDataSubsystem)
			"UMG",      // not used by the Canvas HUD yet; kept for the next UI step (CommonUI later)
			"Slate",
			"SlateCore",
		});
	}
}
