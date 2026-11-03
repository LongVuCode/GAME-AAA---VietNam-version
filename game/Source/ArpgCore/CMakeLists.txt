# Standalone build of ArpgCore (pure C++20, no Unreal) + doctest unit tests.
#   cmake -S game/Source/ArpgCore -B build/arpgcore -G Ninja -DCMAKE_BUILD_TYPE=Debug
#   cmake --build build/arpgcore && ctest --test-dir build/arpgcore --output-on-failure
# Coverage: add -DARPGCORE_COVERAGE=ON, run ctest, then build the `coverage` target.
cmake_minimum_required(VERSION 3.20)
project(ArpgCore LANGUAGES CXX)

option(ARPGCORE_COVERAGE "Instrument ArpgCore and tests with --coverage (gcov)" OFF)
option(ARPGCORE_BUILD_TESTS "Build the doctest unit tests" ON)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

get_filename_component(ARPGCORE_REPO_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../.." ABSOLUTE)
set(ARPGCORE_THIRD_PARTY "${ARPGCORE_REPO_ROOT}/third_party")

set(ARPGCORE_WARNINGS -Wall -Wextra -Wpedantic -Werror)

# Unreal-only sources (module boilerplate) live in Private/UE and are not part of this build.
file(GLOB ARPGCORE_SOURCES CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/Private/*.cpp")
file(GLOB ARPGCORE_HEADERS CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/Public/ArpgCore/*.h")

add_library(ArpgCore STATIC ${ARPGCORE_SOURCES} ${ARPGCORE_HEADERS})
target_include_directories(ArpgCore PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/Public")
# nlohmann/json is a private dependency (only DesignDataLoader.cpp includes it).
target_include_directories(ArpgCore SYSTEM PRIVATE "${ARPGCORE_THIRD_PARTY}")
target_compile_options(ArpgCore PRIVATE ${ARPGCORE_WARNINGS})

if(ARPGCORE_COVERAGE)
  target_compile_options(ArpgCore PUBLIC --coverage -O0 -g)
  target_link_options(ArpgCore PUBLIC --coverage)
endif()

if(ARPGCORE_BUILD_TESTS)
  enable_testing()
  file(GLOB ARPGCORE_TEST_SOURCES CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/Tests/*.cpp")
  add_executable(ArpgCoreTests ${ARPGCORE_TEST_SOURCES})
  target_link_libraries(ArpgCoreTests PRIVATE ArpgCore)
  target_include_directories(ArpgCoreTests SYSTEM PRIVATE "${ARPGCORE_THIRD_PARTY}")
  target_compile_options(ArpgCoreTests PRIVATE ${ARPGCORE_WARNINGS})
  # Real design data, given relative to the repo root (design/data/*.json by game-designer).
  set(ARPGCORE_DESIGN_DATA_RELPATH "design/data" CACHE STRING "Design data folder, relative to the repo root")
  target_compile_definitions(ArpgCoreTests PRIVATE
    ARPGCORE_STANDALONE_TESTS=1
    ARPGCORE_FIXTURE_DIR="${CMAKE_CURRENT_SOURCE_DIR}/Tests/fixtures"
    ARPGCORE_DESIGN_DATA_DIR="${ARPGCORE_REPO_ROOT}/${ARPGCORE_DESIGN_DATA_RELPATH}")

  # One CTest entry per doctest suite, discovered from TEST_SUITE("Name") in Tests/*.cpp.
  set(ARPGCORE_TEST_SUITES "")
  foreach(test_file IN LISTS ARPGCORE_TEST_SOURCES)
    file(STRINGS "${test_file}" suite_lines REGEX "TEST_SUITE\\(\"[A-Za-z0-9_]+\"\\)")
    foreach(line IN LISTS suite_lines)
      string(REGEX REPLACE ".*TEST_SUITE\\(\"([A-Za-z0-9_]+)\"\\).*" "\\1" suite "${line}")
      list(APPEND ARPGCORE_TEST_SUITES "${suite}")
    endforeach()
  endforeach()
  list(REMOVE_DUPLICATES ARPGCORE_TEST_SUITES)
  foreach(suite IN LISTS ARPGCORE_TEST_SUITES)
    add_test(NAME ArpgCore.${suite} COMMAND ArpgCoreTests --test-suite=${suite} --no-version)
  endforeach()
  # Also run the whole binary once so test cases outside any suite are never skipped.
  add_test(NAME ArpgCore.All COMMAND ArpgCoreTests --no-version)

  # The whole library again with exceptions OFF (as a UE module might be), loading the real data.
  add_executable(ArpgCoreNoExceptSmoke ${ARPGCORE_SOURCES} "${CMAKE_CURRENT_SOURCE_DIR}/Tests/noexcept/NoExceptSmoke.cpp")
  target_include_directories(ArpgCoreNoExceptSmoke PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/Public")
  target_include_directories(ArpgCoreNoExceptSmoke SYSTEM PRIVATE "${ARPGCORE_THIRD_PARTY}")
  target_compile_options(ArpgCoreNoExceptSmoke PRIVATE ${ARPGCORE_WARNINGS} -fno-exceptions)
  target_compile_definitions(ArpgCoreNoExceptSmoke PRIVATE JSON_NOEXCEPTION ARPGCORE_NOEXCEPT_SMOKE=1
    ARPGCORE_DESIGN_DATA_DIR="${ARPGCORE_REPO_ROOT}/${ARPGCORE_DESIGN_DATA_RELPATH}")
  add_test(NAME ArpgCore.NoExceptionsSmoke COMMAND ArpgCoreNoExceptSmoke)
endif()

if(ARPGCORE_COVERAGE)
  find_package(Python3 COMPONENTS Interpreter REQUIRED)
  if(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    find_program(ARPGCORE_LLVM_COV NAMES llvm-cov REQUIRED)
    set(ARPGCORE_GCOV_CMD "${ARPGCORE_LLVM_COV} gcov")
  else()
    find_program(ARPGCORE_GCOV NAMES gcov REQUIRED)
    set(ARPGCORE_GCOV_CMD "${ARPGCORE_GCOV}")
  endif()
  add_custom_target(coverage
    COMMAND ${Python3_EXECUTABLE} "${ARPGCORE_REPO_ROOT}/tools/coverage_summary.py"
      --build-dir "${CMAKE_BINARY_DIR}"
      --gcov "${ARPGCORE_GCOV_CMD}"
      --filter "${CMAKE_CURRENT_SOURCE_DIR}/Private/"
      --filter "${CMAKE_CURRENT_SOURCE_DIR}/Public/"
      --target-filter "${CMAKE_CURRENT_SOURCE_DIR}/Private/"
      --min-percent 80
    WORKING_DIRECTORY "${CMAKE_BINARY_DIR}"
    COMMENT "Summarizing line coverage (run ctest first)"
    VERBATIM)
endif()
