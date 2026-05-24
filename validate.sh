#!/usr/bin/env bash

# Exit immediately if any command fails
set -e

function print_usage() {
  cat << EOU
Usage: $0 [-h|--help] [-c|--commit] [-p|--push]
EOU
}

function print_help() {
  print_usage
  cat << EOH

Validates the project via formatting, linting, type-checking, and tests.

Options:
  -h, --help      Print this help and exit
  -c, --commit    Run fast checks (Formatting, JS/SH Linting, Type-checking, Unit Tests).
  -p, --push      Run full checks (Fast checks + Dockerized E2E Playwright tests).
EOH
}

run_fast=false
run_full=false

while getopts :hcp-: opt; do
  [[ $opt == - ]] && opt=${OPTARG%%=*} OPTARG=${OPTARG#*=}
  case $opt in
    h | help)
      print_help
      exit 0
      ;;
    c | commit)
      run_fast=true
      ;;
    p | push)
      run_fast=true
      run_full=true
      ;;
    *)
      print_usage >&2
      exit 2
      ;;
  esac
done
shift $((OPTIND - 1))

if ! $run_fast && ! $run_full; then
  echo "❌ Error: You must specify an action flag (-c or -p)." >&2
  print_usage >&2
  exit 2
fi

echo "🔍 Starting validation sequence..."

if $run_fast; then
  echo "🧹 Checking formatting..."
  npx prettier --check .

  echo "🚨 Linting code..."
  npm run lint:js

  echo "ʦ Type-checking..."
  npm run type-check

  echo "🐚 Linting shell scripts..."
  npm run lint:sh

  echo "🧪 Running Unit Tests..."
  npm run test:unit
fi

if $run_full; then
  echo "🐳 Running E2E tests in Docker..."
  export TEST_DYNAMIC_PATH="/login"
  export TEST_DYNAMIC_USER="frontend_wizard"
  npm run test:e2e
fi

echo "✅ All checks passed successfully!"
