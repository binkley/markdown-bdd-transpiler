#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting Docker Compose test environment..."

# Build and run the test-runner service, automatically tearing down when the tests finish
docker compose up --build --abort-on-container-exit test-runner
