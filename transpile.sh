#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Run the TypeScript transpiler directly using tsx, passing all arguments along
npx tsx transpile.ts "$@"
