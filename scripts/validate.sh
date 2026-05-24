#!/usr/bin/env bash

# Exit immediately if any command fails
set -e

function print_usage() {
  cat << EOU
Usage: $0 [-h|--help] [-c|--commit] [-p|--push] [-q|--quiet] [-v|--verbose]
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
  -q, --quiet     Suppress non-error output.
  -v, --verbose   Show detailed execution logs.
EOH
}

run_fast=false
run_full=false
quiet=false
verbose=false

while getopts :hcpqv-: opt; do
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
    q | quiet)
      quiet=true
      ;;
    v | verbose)
      verbose=true
      ;;
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

if ! $run_fast && ! $run_full; then
  echo "❌ Error: You must specify an action flag (-c or -p)." >&2
  print_usage >&2
  exit 2
fi

function log_step() {
  if ! $quiet; then echo "$1"; fi
}

log_step "🔍 Starting validation sequence..."

# Determine tool flags
ESLINT_FLAGS=(".")
NPM_FLAGS=()
PRETTIER_FLAGS=("--check" ".")
if $quiet; then
  ESLINT_FLAGS=("--quiet" ".")
  NPM_FLAGS=("--silent")
  PRETTIER_FLAGS=("--check" "--log-level" "silent" ".")
elif $verbose; then
  ESLINT_FLAGS=("--debug" ".")
  NPM_FLAGS=("--loglevel" "verbose")
  PRETTIER_FLAGS=("--check" "--log-level" "debug" ".")
fi

if $run_fast; then
  log_step "🧹 Checking formatting..."
  npx prettier "${PRETTIER_FLAGS[@]}"

  log_step "🚨 Linting code..."
  npx eslint "${ESLINT_FLAGS[@]}"

  log_step "ʦ Type-checking..."
  npm run type-check "${NPM_FLAGS[@]}"

  log_step "🐚 Linting shell scripts..."
  npm run lint:sh "${NPM_FLAGS[@]}"

  log_step "🧪 Running Unit Tests..."
  npm run test:unit "${NPM_FLAGS[@]}"
fi

if $run_full; then
  log_step "🐳 Running E2E tests in Docker..."

  E2E_FLAGS=()
  if $quiet; then
    E2E_FLAGS=("--quiet")
  elif $verbose; then
    E2E_FLAGS=("--verbose")
  fi

  ./scripts/test-e2e.sh "${E2E_FLAGS[@]}"
fi

log_step "✅ All checks passed successfully!"
