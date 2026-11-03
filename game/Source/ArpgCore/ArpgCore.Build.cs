// ArpgCore.Build.cs - Unreal module rules for ArpgCore (module of the ProjectFerry UE project).
// STATUS: NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE"). The AI environment has no UE
// Editor; only the standalone CMake build (CMakeLists.txt) has been compiled and tested.
// See README.md for the build steps the Product Owner should run on Windows and the log to send back.
using System.IO;
using UnrealBuildTool;

public class ArpgCore : ModuleRules
{
	public ArpgCore(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		// DesignDataLoader.cpp includes nlohmann/json and wraps parsing in try/catch so that no exception
		// crosses the public API. Exceptions must therefore be enabled for this module only.
		bEnableExceptions = true;

		// Pure C++ module: Core is needed only for IMPLEMENT_MODULE (Private/UE/ArpgCoreModule.cpp).
		PublicDependencyModuleNames.Add("Core");

		// Vendored single-header libraries (MIT): <repo>/third_party/nlohmann/json.hpp.
		// ModuleDirectory = <repo>/game/Source/ArpgCore
		PrivateIncludePaths.Add(Path.Combine(ModuleDirectory, "..", "..", "..", "third_party"));

		// UBT compiles every .cpp under this folder, including Tests/*.cpp. Those files are wrapped in
		// #if defined(ARPGCORE_STANDALONE_TESTS), which only the CMake build defines, so they compile
		// to empty translation units here (doctest is never included by the UE build).
	}
}
