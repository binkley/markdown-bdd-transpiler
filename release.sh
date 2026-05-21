#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

function print_usage() {
  cat << EOU
Usage: $0 [-h|--help] [-n|--dry-run] <patch|minor|major>
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
EOH
}

DRY_RUN=false

while getopts :hn-: opt; do
  [[ $opt == - ]] && opt=${OPTARG%%=*} OPTARG=${OPTARG#*=}
  case $opt in
    h | help)
      print_help
      exit 0
      ;;
    n | dry-run)
      DRY_RUN=true
      ;;
    *)
      print_usage >&2
      exit 2
      ;;
  esac
done
shift $((OPTIND - 1))

case $# in
  1)
    VERSION_TYPE="$1"
    if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
      echo "❌ Error: Invalid version type '$VERSION_TYPE'." >&2
      print_usage >&2
      exit 2
    fi
    ;;
  *)
    print_usage >&2
    exit 2
    ;;
esac

if $DRY_RUN; then
  echo "🔍 DRY RUN ENABLED. No changes will be made."
  echo ""
fi

# Ensure the working directory is clean before bumping
if ! git diff-index --quiet HEAD --; then
  echo "❌ Error: You have uncommitted changes. Please commit or stash them before releasing." >&2
  exit 1
fi

echo "🚀 Bumping $VERSION_TYPE version in package.json..."
if $DRY_RUN; then
  echo "[DRY RUN] Would execute: npm version $VERSION_TYPE"
  # Simulate extracting the new version (just appending '-dryrun')
  CURRENT_VERSION=$(node -p "require('./package.json').version")
  NEW_VERSION="${CURRENT_VERSION}-${VERSION_TYPE}-dryrun"
else
  # This command automatically bumps the version, creates a commit, and creates a v* tag
  npm version "$VERSION_TYPE"
  # Extract the new version from package.json for logging
  NEW_VERSION=$(node -p "require('./package.json').version")
fi

echo "📦 Pushing commit and tag (v$NEW_VERSION) to origin..."
if $DRY_RUN; then
  echo "[DRY RUN] Would execute: git push --follow-tags"
else
  git push --follow-tags
fi

echo "✅ Release v$NEW_VERSION triggered! GitHub Actions will now build and publish to NPM."
