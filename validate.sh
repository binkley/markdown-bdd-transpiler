#!/usr/bin/env bash

# Exit immediately if any command fails
set -e

echo "🔍 Starting pre-push validation..."

echo "🧹 Checking formatting..."
npx prettier --check .

echo "🚨 Linting code..."
npm run lint

echo "ʦ Type-checking..."
npm run type-check

echo "🐳 Running E2E tests in Docker..."
export TEST_DYNAMIC_PATH="/login"
export TEST_DYNAMIC_USER="frontend_wizard"
./run.sh

echo "✅ All checks passed! Ready to push."
