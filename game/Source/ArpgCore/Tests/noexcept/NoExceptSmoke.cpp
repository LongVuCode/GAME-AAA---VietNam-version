// NoExceptSmoke.cpp - Builds ArpgCore with -fno-exceptions -DJSON_NOEXCEPTION (like a UE module with
// exceptions off) and loads the real design data. Standalone CMake only (UBT compiles it empty).
#if defined(ARPGCORE_NOEXCEPT_SMOKE)
#include "ArpgCore/DesignDataLoader.h"

#include <cstdio>
#include <fstream>
#include <sstream>
#include <string>

namespace
{
std::string Read(const char* Name)
{
	std::ifstream File(std::string(ARPGCORE_DESIGN_DATA_DIR) + "/" + Name + ".json", std::ios::binary);
	std::ostringstream Buffer;
	Buffer << File.rdbuf();
	return Buffer.str();
}

int Fail(const char* What)
{
	std::printf("FAIL: %s\n", What);
	return 1;
}
} // namespace

int main()
{
	const std::string Combat = Read("combat_tuning");
	const std::string Weapons = Read("weapons");
	const std::string Enemies = Read("enemies");
	const std::string Items = Read("items");
	const std::string Lineage = Read("lineage");
	const std::string Secrets = Read("secrets");
	ArpgCore::FDesignDataSources S{Combat, Weapons, Enemies, Items, Lineage, Secrets};
	const ArpgCore::TResult<ArpgCore::FArpgConfig> Ok = ArpgCore::LoadDesignData(S);
	if (!Ok.IsOk())
	{
		std::printf("%s\n", Ok.ErrorSummary().c_str());
		return Fail("real design data must load without exceptions");
	}
	S.Items = "{ \"items\": [ ";
	const ArpgCore::TResult<ArpgCore::FArpgConfig> Malformed = ArpgCore::LoadDesignData(S);
	if (Malformed.IsOk() || Malformed.ErrorSummary().find("items: malformed JSON") == std::string::npos)
	{
		return Fail("malformed JSON must be an error value");
	}
	S.Items = Items;
	const std::string BadEnemies = std::string("{\"enemies\": 5}");
	S.Enemies = BadEnemies;
	if (ArpgCore::LoadDesignData(S).ErrorSummary().find("enemies: expected array") == std::string::npos)
	{
		return Fail("type errors must be reported");
	}
	std::printf("OK: no-exception build loads design data and reports errors as values\n");
	return 0;
}
#endif
