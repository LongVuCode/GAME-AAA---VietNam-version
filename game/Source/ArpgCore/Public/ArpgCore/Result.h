// Result.h - Error-as-value result type. Public ArpgCore APIs never throw; failures are
// reported through TResult / FStatus with a list of FError entries (path + message).
#pragma once

#include <optional>
#include <string>
#include <utility>
#include <variant>
#include <vector>

namespace ArpgCore
{
/** One error or warning. Path is a dotted location (e.g. "combat.moves[2].startup") or empty. */
struct FError
{
	std::string Path;
	std::string Message;
};

/** Value-or-errors container. Check IsOk() before GetValue(). */
template <typename T>
class TResult
{
public:
	static TResult Ok(T InValue)
	{
		TResult R;
		R.Value.emplace(std::move(InValue));
		return R;
	}

	static TResult Fail(FError InError)
	{
		TResult R;
		R.Errors.push_back(std::move(InError));
		return R;
	}

	static TResult Fail(std::vector<FError> InErrors)
	{
		TResult R;
		R.Errors = std::move(InErrors);
		if (R.Errors.empty())
		{
			R.Errors.push_back(FError{"", "unknown error"});
		}
		return R;
	}

	bool IsOk() const { return Value.has_value(); }
	explicit operator bool() const { return IsOk(); }

	/** Precondition: IsOk(). */
	const T& GetValue() const { return *Value; }
	/** Precondition: IsOk(). */
	T& GetValue() { return *Value; }

	const std::vector<FError>& GetErrors() const { return Errors; }

	/** Joins all errors as "path: message; path: message". */
	std::string ErrorSummary() const
	{
		std::string Out;
		for (const FError& E : Errors)
		{
			if (!Out.empty())
			{
				Out += "; ";
			}
			Out += E.Path.empty() ? E.Message : (E.Path + ": " + E.Message);
		}
		return Out;
	}

private:
	std::optional<T> Value;
	std::vector<FError> Errors;
};

/** Result without a payload. */
using FStatus = TResult<std::monostate>;

inline FStatus OkStatus()
{
	return FStatus::Ok(std::monostate{});
}
} // namespace ArpgCore
