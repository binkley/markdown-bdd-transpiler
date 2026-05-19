#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Parse arguments
if [[ "$1" == "--verbose" ]]; then
  export TRANSPILER_VERBOSE=true
  echo "Verbose mode enabled."
fi

# Ensure the environment is cleanly torn down when the script exits (success or failure)
trap 'echo -e "\nCleaning up test environment..."; docker compose down' EXIT

echo "Building Docker Compose test environment..."
docker compose build

echo -e "\nRunning test suite..."
# 'run' will automatically start the demo-app dependency and wait for it to be healthy
docker compose run --rm test-runner
