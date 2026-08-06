#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DETECTOR="${ROOT_DIR}/tools/paths-changed.sh"
readonly TEST_REPO="$(mktemp -d "${TMPDIR:-/tmp}/designengineer-paths-changed.XXXXXX")"

cleanup() {
    rm -rf "$TEST_REPO"
}
trap cleanup EXIT

cd "$TEST_REPO"
git init -q
git config user.name test
git config user.email test@example.com
mkdir -p watched
printf 'base\n' > watched/input
printf 'base\n' > unrelated
git add .
git commit -qm base
base_revision="$(git rev-parse HEAD)"

printf 'unrelated\n' >> unrelated
git add unrelated
git commit -qm unrelated
[[ "$($DETECTOR "$base_revision" HEAD -- watched/input)" == "false" ]]

printf 'changed\n' >> watched/input
git add watched/input
git commit -qm watched
[[ "$($DETECTOR "$base_revision" HEAD -- watched/input)" == "true" ]]

if "$DETECTOR" not-a-revision HEAD -- watched/input >/dev/null 2>&1; then
    printf 'paths-changed test: invalid revision incorrectly passed\n' >&2
    exit 1
fi

if "$DETECTOR" "$base_revision" HEAD >/dev/null 2>&1; then
    printf 'paths-changed test: missing path list incorrectly passed\n' >&2
    exit 1
fi

printf 'paths-changed test: unrelated, watched, error, and usage fixtures passed\n'
