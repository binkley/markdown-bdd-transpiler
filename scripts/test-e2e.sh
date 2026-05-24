#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

function print_usage() {
  cat << EOU
Usage: $0 [-h|--help] [-q|--quiet] [-v|--verbose]
EOU
}

function print_help() {
  print_usage
  cat << EOH

Runs the transpiler and executes the generated tests.

Options:
  -h, --help       Print this help and exit
  -q, --quiet      Suppress non-error output
  -v, --verbose    Verbose logging (shows transpiler logs and Playwright test steps)
EOH
}

verbose=false
quiet=false

while getopts :hqv-: opt; do
  [[ $opt == - ]] && opt=${OPTARG%%=*} OPTARG=${OPTARG#*=}
  case $opt in
    h | help)
      print_help
      exit 0
      ;;
    q | quiet) quiet=true ;;
    v | verbose) verbose=true ;;
    *)
      print_usage >&2
      exit 2
      ;;
  esac
done
shift $((OPTIND - 1))

if $quiet && $verbose; then
  echo "❌ Error: Cannot use --quiet and --verbose simultaneously." >&2
  exit 2
fi

case $# in
  0) ;;
  *)
    print_usage >&2
    exit 2
    ;;
esac

function log_step() {
  if ! $quiet; then echo -e "$1"; fi
}

function log_debug() {
  if $verbose; then echo -e "   🔍 $1"; fi
}

DOCKER_FLAGS=""
if $verbose; then
  export PLAYWRIGHT_VERBOSE=true
  export TRANSPILER_VERBOSE=true
  log_debug "Verbose mode enabled."
elif $quiet; then
  export PLAYWRIGHT_REPORTER="dot"
  export TRANSPILER_QUIET=true
  DOCKER_FLAGS="--quiet"
fi

# Provide default dynamic data for the demo app tests
export TEST_DYNAMIC_PATH="${TEST_DYNAMIC_PATH:-/login}"
export TEST_DYNAMIC_USER="${TEST_DYNAMIC_USER:-frontend_wizard}"

# Ensure the environment is cleanly torn down when the script exits (success
# or failure)
function cleanup() {
  log_step "\nCleaning up test environment..."
  docker compose down > /dev/null 2>&1
}
trap cleanup EXIT

log_step "Building Docker Compose test environment..."
if $quiet; then
  docker compose build --quiet > /dev/null 2>&1
else
  docker compose build
fi

log_step "\nRunning test suite..."
# 'run' will automatically start the demo-app dependency and wait for it to be
# healthy
if $quiet; then
  docker compose run $DOCKER_FLAGS --rm test-runner
else
  docker compose run --rm test-runner
fi
