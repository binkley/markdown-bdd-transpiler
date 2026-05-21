#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

function print_usage() {
  cat << EOU
Usage: $0 [-h|--help] [-n|--dry-run] [-y|--yes] <patch|minor|major>
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
EOH
}

confirm=true
dry_run=false

while getopts :hny-: opt; do
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
    *)
      print_usage >&2
      exit 2
      ;;
  esac
done
shift $((OPTIND - 1))

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

run=
if $dry_run; then
  run="echo"
  echo "🔍 DRY RUN. No changes will be made."
fi

# Ensure the working directory is clean before bumping
if ! git diff-index --quiet HEAD --; then
  echo "❌ Error: You have uncommitted changes. Please commit or stash them before releasing." >&2
  exit 1
fi

old_version=$(node -p "require('./package.json').version")

# Calculate the new version safely using a subshell $(...) By doing this work
# inside a subshell, the 'trap' is strictly isolated.  The EXIT trap acts like
# a 'finally {}' block: it guarantees the files are restored whether the
# subshell exits cleanly, errors out, or is interrupted.
new_version=$(
  set -e # Ensure the subshell aborts on errors
  trap 'git restore package.json package-lock.json >/dev/null 2>&1' EXIT INT TERM

  npm --sign-git-tag --no-git-tag-version version "$release_type" > /dev/null

  # "Return" the value to the parent shell by echoing it.
  node -p "require('./package.json').version"

  # The subshell closes here, triggering the EXIT trap to restore the files.
)

if $confirm; then
  read -r -p "🗳️  Ready to release ($old_version -> $new_version) [y/N]: " answer
  case $answer in
    y* | Y*) ;;
    *)
      echo "👎 Release canceled."
      exit 0
      ;;
  esac
fi

function npm_version() {
  local message="Release and publish to NPM version '$new_version'"
  if $dry_run; then
    echo "npm --message \"$message\" --sign-git-tag version \"$release_type"\"
  else
    npm --message "$message" --sign-git-tag version "$release_type" > /dev/null
  fi
}

echo "🎯 Validating for release..."
$run ./validate.sh
# Because of 'set -e' at top, this bails out if validation fails before we
# call either npm or git.

echo "🚀 Bumping '$release_type' release ($old_version -> $new_version)..."
npm_version

echo "📦 Pushing commit and tag (v$new_version) to origin..."
# Tell git to skip pre-push hook since we did this manually above with
# ./validate.sh.
$run git push --follow-tags --no-verify

echo "✅ Release v$new_version triggered! GitHub Actions will now build and publish to NPM."
