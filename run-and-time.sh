#!/usr/bin/env bash

export PS4='+${BASH_SOURCE}:${LINENO}:${FUNCNAME[0]:+${FUNCNAME[0]}():} '

set -eu

function print_usage() {
  echo "Usage: $0 [-h|--help] FILE-NAME COMMAND-LINE"
}

function print_help() {
  print_usage
  cat << EOH
Times and executes COMMAND-LINE.
Silently captures STDOUT to FILE-NAME (does not appear in STDOUT).
Duplicates STDERR to FILE-NAME.err (still appears in STDERR).
Duplicates output of 'time' to FILE-NAME.time (still appears in STDERR).

Options:
   -h, --help   Print help and exit normally

Arguments:
   FILE-NAME      Save file for STDOUT, STDERR, and 'time'. If it has an
                     extension, keep it, else use ".out"
   COMMAND-LINE   Full command line to execute
EOH
}

while getopts :h-: opt; do
  [[ $opt == - ]] && opt=${OPTARG%%=*} OPTARG=${OPTARG#*=}
  case $opt in
    h | help)
      print_help
      exit 0
      ;;
    *)
      print_usage >&2
      exit 2
      ;;
  esac
done
shift $((OPTIND - 1))

case $# in
  0 | 1)
    print_usage >&2
    exit 2
    ;;
  *)
    file_name="$1"
    shift
    ;;
esac

if [[ "$file_name" =~ ^[./] ]]; then
  echo "$0: $file_name: filename cannot start with '.' or '/'" >&2
  exit 2
fi

case $file_name in
  *.*) ext=".${file_name##*.}" file_name="${file_name%.*}" ;;
  *) ext='.out' ;;
esac

if ! command -v "$1" &> /dev/null; then
  echo "$0: $1: command not found" >&2
  exit 127
fi

# 1. We redirect the terminal's stderr to FD 3 as a 'bypass' route.
# 2. Inside the block, 'time' keyword outputs to the block's stderr (FD 2).
# 3. The program's stderr is caught by tee, saved, and sent to FD 3 (to
#    bypass the outer catch).
# 4. The outer catch finally grabs ONLY the timing stats from FD 2.
{
  time "$@" > "$file_name$ext" 2> >(tee "$file_name.err" >&3)
} 3>&2 2> >(tee "$file_name.time" >&2)
