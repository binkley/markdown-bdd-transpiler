#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Run the TypeScript transpiler directly using tsx, passing all arguments
# along
exec npx tsx transpile.ts "$@"
