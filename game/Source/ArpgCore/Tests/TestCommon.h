// TestCommon.h - Shared helpers for ArpgCore tests (standalone build only).
#pragma once

#include <doctest/doctest.h>

#include <fstream>
#include <sstream>
#include <string>

namespace ArpgCoreTest
{
/** Exactly representable step so accumulated time stays exact. */
inline constexpr float Dt = 1.0f / 64.0f;

inline std::string ReadFixture(const std::string& Name)
{
	std::ifstream File(std::string(ARPGCORE_FIXTURE_DIR) + "/" + Name, std::ios::binary);
	REQUIRE_MESSAGE(File.good(), "missing fixture " << Name);
	std::ostringstream Buffer;
	Buffer << File.rdbuf();
	return Buffer.str();
}

/** Calls Fn(dt) repeatedly for Seconds of simulated time. */
template <typename TFn>
void Simulate(float Seconds, TFn&& Fn)
{
	const int Steps = static_cast<int>(Seconds / Dt + 0.5f);
	for (int I = 0; I < Steps; ++I)
	{
		Fn(Dt);
	}
}
} // namespace ArpgCoreTest
