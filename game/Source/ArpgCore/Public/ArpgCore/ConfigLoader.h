// ConfigLoader.h - Loads FArpgConfig from JSON text (nlohmann/json is used only in the .cpp).
// Errors are returned as values (never thrown). Unknown keys produce warnings.
// NOTE: the JSON layout here is ArpgCore's own fixture format; it will be aligned with the
// game-designer schema (design/schema/README.md) in a later step.
#pragma once

#include "ArpgCore/ArpgCoreApi.h"
#include "ArpgCore/Config.h"
#include "ArpgCore/Result.h"

#include <string_view>
#include <vector>

namespace ArpgCore
{
/** Parses + validates. OutWarnings (optional) receives non-fatal findings such as unknown keys. */
ARPGCORE_API TResult<FArpgConfig> LoadConfigFromJson(std::string_view JsonText, std::vector<FError>* OutWarnings = nullptr);
} // namespace ArpgCore
