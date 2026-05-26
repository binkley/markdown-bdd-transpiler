#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

function print_usage() {
  cat << EOU
Usage: $0 [-h|--help] [-p:<OPTION>|--playwright:<OPTION>] [-q|--quiet] [-t:<OPTION>|--transpiler:<OPTION>] [-v|--verbose] [FILE...]
EOU
}

function print_help() {
  print_usage
  cat << EOH

Runs the transpiler and executes the generated tests in Docker.
This script acts as a "Porcelain" orchestrator, routing arguments to the
underlying "Plumbing" tools (Transpiler and Playwright).

Options:
  -h, --help       Print this help and exit
  -q, --quiet      Suppress non-error output
  -v, --verbose    Verbose logging

Tool Routing:
  -p:<OPTION>, --playwright:<OPTION>
                   Pass an option directly to Playwright.
                   Separate multiple options with comma.
  -t:<OPTION>, --transpiler:<OPTION>
                   Pass an option directly to the Transpiler.
                   Separate multiple options with comma.

Arguments:
  FILE             Markdown files to transpile and test (e.g., tests/login.md)
                   If not provided, process all test directory files.

Examples:
  $0
                   Transpile and test all files in the test directory.
  $0 tests/example.md
                   Transpile and test only 'tests/example.md'.
  $0 --verbose
                   Show verbose logging from transpiler and Playwright.
  $0 --transpiler:clear-cache
                   Run the transpiler with the '--clear-cache' option to wipe the cache without generating tests.
  $0 --transpiler:update-cache
                   Run the transpiler with the '--update-cache' option to surgically repair missing cache entries.
  $0 --transpiler:ignore-cache
                   Run the transpiler without using or updating the cache.
EOH
}

verbose=false
quiet=false

TRANSPILER_ARGS=()
PLAYWRIGHT_ARGS=()

# Helper function to split comma-separated args
function process_routed_arg() {
  local tool_array_name=$1
  local raw_args=$2

  # Set IFS to comma to split the string
  IFS=',' read -ra ADDR <<< "$raw_args"
  for opt in "${ADDR[@]}"; do
    if [[ "$tool_array_name" == "TRANSPILER_ARGS" ]]; then
      TRANSPILER_ARGS+=("--$opt")
    elif [[ "$tool_array_name" == "PLAYWRIGHT_ARGS" ]]; then
      PLAYWRIGHT_ARGS+=("--$opt")
    fi
  done
}

# Parse arguments and route them
for arg in "$@"; do
  case "$arg" in
    -h | --help)
      print_help
      exit 0
      ;;
    -p:* | --playwright:*)
      process_routed_arg "PLAYWRIGHT_ARGS" "${arg#*:}"
      ;;
    -q | --quiet)
      quiet=true
      ;;
    -t:* | --transpiler:*)
      process_routed_arg "TRANSPILER_ARGS" "${arg#*:}"
      ;;
    -v | --verbose)
      verbose=true
      ;;
    *.md)
      # Route positional .md files to the transpiler
      TRANSPILER_ARGS+=("$arg")

      # Route the expected output .test.ts file to Playwright
      filename=$(basename "$arg")
      PLAYWRIGHT_ARGS+=(".generated/${filename}.test.ts")
      ;;
    *)
      echo "❌ Error: Unknown argument '$arg'. Use --t: for transpiler or --p: for playwright flags." >&2
      print_usage >&2
      exit 2
      ;;
  esac
done

if $quiet && $verbose; then
  echo "❌ Error: Cannot use --quiet and --verbose simultaneously." >&2
  exit 2
fi

function log_step() {
  if ! $quiet; then echo -e "$1"; fi
}

function log_debug() {
  if $verbose; then echo -e "   🔍 $1"; fi
}

DOCKER_FLAGS=""
if $verbose; then
  PLAYWRIGHT_ARGS+=("--reporter=line")
  TRANSPILED_ARGS+=("--verbose")
  log_debug "Verbose mode enabled."
elif $quiet; then
  DOCKER_FLAGS="--quiet"
  PLAYWRIGHT_ARGS+=("--reporter=dot")
  TRANSPILED_ARGS+=("--quiet")
fi

# Provide default dynamic data for the demo app tests
export TEST_DYNAMIC_PATH="${TEST_DYNAMIC_PATH:-/login}"
export TEST_DYNAMIC_USER="${TEST_DYNAMIC_USER:-frontend_wizard}"

# Ensure the environment is cleanly torn down when the script exits
function cleanup() {
  log_step "\nCleaning up test environment..."
  docker compose down --remove-orphans -v > /dev/null 2>&1
}
trap cleanup EXIT

log_step "Building Docker Compose test environment..."
if $quiet; then
  docker compose build --quiet > /dev/null 2>&1
else
  docker compose build
fi

log_step "\nPhase 1: Transpiling Markdown..."
# We run `npm run build` and then `npm run transpile` explicitly, passing the
# routed args.
if $quiet; then
  docker compose run $DOCKER_FLAGS --rm test-runner bash -c "npm run build --silent && npm run transpile --silent -- ${TRANSPILER_ARGS[*]}"
else
  docker compose run --rm test-runner bash -c "npm run build && npm run transpile -- ${TRANSPILER_ARGS[*]}"
fi

log_step "\nPhase 2: Running Playwright Test Suite..."
if $quiet; then
  docker compose run $DOCKER_FLAGS --rm test-runner npx playwright test "${PLAYWRIGHT_ARGS[@]}" > /dev/null
else
  docker compose run --rm test-runner npx playwright test "${PLAYWRIGHT_ARGS[@]}"
fi
