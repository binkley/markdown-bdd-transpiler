#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

function print_usage() {
  cat << EOU
Usage: $0 [-h|--help] [-v|--verbose]
EOU
}

function print_help() {
  print_usage
  cat << EOH

Runs the transpiler and executes the generated tests.

Options:
  -h, --help       Print this help and exit
  -v, --verbose    Verbose logging (shows transpiler logs and Playwright test steps)
EOH
}

verbose=false
while getopts :hv-: opt; do
  [[ $opt == - ]] && opt=${OPTARG%%=*} OPTARG=${OPTARG#*=}
  case $opt in
    h | help)
      print_help
      exit 0
      ;;
    v | verbose) verbose=true ;;
    *)
      print_usage >&2
      exit 2
      ;;
  esac
done
shift $((OPTIND - 1))

case $# in
  0) ;;
  *)
    print_usage >&2
    exit 2
    ;;
esac

if $verbose; then
  export PLAYWRIGHT_VERBOSE=true
  export TRANSPILER_VERBOSE=true
  echo "Verbose mode enabled."
fi

# Ensure the environment is cleanly torn down when the script exits (success
# or failure)
trap 'echo -e "\nCleaning up test environment..."; docker compose down' EXIT

echo "Building Docker Compose test environment..."
docker compose build

echo -e "\nRunning test suite..."
# 'run' will automatically start the demo-app dependency and wait for it to be
# healthy
docker compose run --rm test-runner
