#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

function print_usage() {
  cat << EOU
Usage: $0 [-h|--help] [-n|--dry-run] [-y|--yes] [-q|--quiet] [-v|--verbose] <patch|minor|major>
EOU
}

function print_help() {
  print_usage
  cat << EOH

Automates the Semantic Versioning bump and triggers a GitHub Actions NPM Release.

Arguments:
  patch    Bump the third digit (e.g., 1.0.0 -> 1.0.1) for backwards-compatible bug fixes.
  minor    Bump the second digit (e.g., 1.0.0 -> 1.1.0) for backwards-compatible new features.
  major    Bump the first digit (e.g., 1.0.0 -> 2.0.0) for breaking changes.

Options:
  -h, --help      Print this help and exit
  -n, --dry-run   Simulate the release process without making any changes or pushing.
  -y, --yes       Skip confirmation prompt and proceed immediately.
  -q, --quiet     Suppress non-error output
  -v, --verbose   Show detailed execution logs
EOH
}

confirm=true
dry_run=false
quiet=false
verbose=false

while getopts :hnyqv-: opt; do
  [[ $opt == - ]] && opt=${OPTARG%%=*} OPTARG=${OPTARG#*=}
  case $opt in
    h | help)
      print_help
      exit 0
      ;;
    n | dry-run)
      confirm=false
      dry_run=true
      ;;
    y | yes)
      confirm=false
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

case $# in
  1)
    case $1 in
      patch | minor | major)
        release_type="$1"
        ;;
      *)
        echo "❌ Error: Invalid version type: '$1'" >&2
        print_usage >&2
        exit 2
        ;;
    esac
    ;;
  *)
    print_usage >&2
    exit 2
    ;;
esac

function log_step() {
  if ! $quiet; then echo "$1"; fi
}

run=
if $dry_run; then
  run="echo"
  log_step "🔍 DRY RUN. No changes will be made."
fi

# Ensure the working directory is clean before bumping
if ! git diff-index --quiet HEAD --; then
  echo "❌ Error: You have uncommitted changes. Please commit or stash them before releasing." >&2
  exit 1
fi

release_completed=false
function cleanup() {
  if [ "$release_completed" != "true" ] && ! $dry_run; then
    log_step "🧹 Cleaning up aborted release to ensure a clean state..."
    git checkout -- package.json package-lock.json manifest.json CHANGELOG.md > /dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

old_version=$(node -p "require('./package.json').version")

log_step "🔍 Analyzing Git history to calculate next '$release_type' version..."
# We use standard-version's dry-run mode to extract the predicted new version number and changelog
dry_run_output=$(npx standard-version --release-as "$release_type" --dry-run)
new_version=$(echo "$dry_run_output" | grep "bumping version in package.json from" | awk '{print $9}')

if [[ -z "$new_version" ]]; then
  echo "❌ Error: Failed to calculate new version. Is the workspace clean?" >&2
  exit 1
fi

log_step "🎯 Validating codebase before release..."
validate_flags=()
if $quiet; then validate_flags=("--" "--quiet"); fi
if $verbose; then validate_flags=("--" "--verbose"); fi

$run npm run validate:push "${validate_flags[@]}"
# Because of 'set -e' at top, this bails out if validation fails before we proceed.

if $confirm; then
  echo ""
  log_step "📝 Proposed Changelog Addition:"
  echo "$dry_run_output" | awk '/^---$/{flag=!flag; if(flag) next; else exit} flag'
  echo ""

  read -r -p "🗳️  Ready to release ($old_version -> $new_version) and generate CHANGELOG? [y/N]: " answer
  case $answer in
    y* | Y*) ;;
    *)
      echo "👎 Release canceled."
      exit 0
      ;;
  esac
fi

function apply_version_bump() {
  if $dry_run; then
    log_step "npx standard-version --release-as \"$release_type\" --sign --dry-run"
    npx standard-version --release-as "$release_type" --sign --dry-run
  else
    if $quiet; then
      npx standard-version --release-as "$release_type" --sign > /dev/null
    else
      npx standard-version --release-as "$release_type" --sign
    fi
  fi
}

log_step "🚀 Bumping '$release_type' release ($old_version -> $new_version)..."
apply_version_bump

log_step "📦 Pushing commit and tag (v$new_version) to origin..."
# Tell git to skip pre-push hook since we did this manually above with
# npm run validate:push.
if $quiet; then
  $run git push --follow-tags --no-verify > /dev/null 2>&1
else
  $run git push --follow-tags --no-verify
fi

release_completed=true
log_step "✅ Release v$new_version triggered! GitHub Actions will now build and publish to NPM."
