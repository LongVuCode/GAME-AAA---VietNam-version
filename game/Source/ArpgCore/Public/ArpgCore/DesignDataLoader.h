// DesignDataLoader.h - Reads the designer's data files (design/data/*.json, schema in
// design/schema/README.md) into FArpgConfig. Only gameplay values are read; display strings
// ({vi, en}), codex, labels and presentation fields belong to the UI / content pipeline.
// Errors are returned as values with file-qualified JSON paths (never thrown).
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/Config.h"
#include "ArpgCore/Result.h"

#include <string_view>
#include <vector>

namespace ArpgCore
{
/** Text of each design file (the caller reads the files; ArpgCore does no I/O). */
struct FDesignDataSources
{
	std::string_view CombatTuning; // combat_tuning.json
	std::string_view Weapons;      // weapons.json
	std::string_view Enemies;      // enemies.json
	std::string_view Items;        // items.json
	std::string_view Lineage;      // lineage.json
	std::string_view Secrets;      // secrets.json
};

/** Parses all files, maps them onto ArpgCore structures and runs ValidateConfig.
 *  OutWarnings (optional) receives non-fatal findings (e.g. features not modeled yet). */
ARPGCORE_API TResult<FArpgConfig> LoadDesignData(const FDesignDataSources& Sources, std::vector<FError>* OutWarnings = nullptr);
} // namespace ArpgCore
