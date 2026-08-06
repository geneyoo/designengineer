#!/usr/bin/env bash
set -euo pipefail

# Print whether any path changed between the merge base of two revisions.
# Exit nonzero for invalid revisions or git errors; detector failures must not
# be flattened into either "changed" or "unchanged".

if [[ "$#" -lt 4 || "$3" != "--" ]]; then
    printf 'usage: %s <base> <head> -- <path> [<path> ...]\n' "$0" >&2
    exit 64
fi

readonly BASE_REVISION="$1"
readonly HEAD_REVISION="$2"
shift 3

set +e
git diff --quiet "${BASE_REVISION}...${HEAD_REVISION}" -- "$@"
diff_status=$?
set -e

case "$diff_status" in
    0) printf 'false\n' ;;
    1) printf 'true\n' ;;
    *) exit "$diff_status" ;;
esac
