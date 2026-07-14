#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly LEASE_TOOL="${ROOT_DIR}/tools/resource-lease.sh"
readonly RESOURCE="test-resource:$PPID:$RANDOM"
readonly TEST_LEASE_DIR="${TMPDIR:-/tmp}/designengineer-resource-lease-test-$$"
LEASE_LABEL=""
OWNER_PID=""

if [[ "$(uname -s)" != "Darwin" ]] \
    || ! launchctl print "gui/$(id -u)" >/dev/null 2>&1; then
    printf 'resource-lease test: skipped (macOS GUI launchd session required)\n'
    exit 0
fi

cleanup() {
    if [[ -n "$LEASE_LABEL" ]]; then
        launchctl bootout "gui/$(id -u)/${LEASE_LABEL}" >/dev/null 2>&1 || true
    fi
    local owner_file
    owner_file="$(find "$TEST_LEASE_DIR" -name '*.owner' -type f -print -quit 2>/dev/null || true)"
    if [[ -n "$owner_file" ]]; then
        local holder_pid
        holder_pid="$(awk -F= '$1 == "holder_pid" { print $2 }' "$owner_file")"
        if [[ -n "$holder_pid" ]] && kill -0 "$holder_pid" 2>/dev/null; then
            kill "$holder_pid" 2>/dev/null || true
        fi
    fi
    if [[ -n "$OWNER_PID" ]] && kill -0 "$OWNER_PID" 2>/dev/null; then
        kill "$OWNER_PID" 2>/dev/null || true
    fi
    rm -rf "$TEST_LEASE_DIR"
}
trap cleanup EXIT

export DESIGNENGINEER_LEASE_DIR="$TEST_LEASE_DIR"
export DESIGNENGINEER_LEASE_POLL_SECONDS=0.05

initial_status="$($LEASE_TOOL status "$RESOURCE")"
[[ "$initial_status" == *"is unlocked"* ]]

sleep 30 &
owner_pid=$!
OWNER_PID="$owner_pid"
DESIGNENGINEER_SESSION_PID="$owner_pid" "$LEASE_TOOL" acquire "$RESOURCE" >/dev/null
DESIGNENGINEER_SESSION_PID="$owner_pid" "$LEASE_TOOL" acquire "$RESOURCE" >/dev/null
DESIGNENGINEER_SESSION_PID="$owner_pid" "$LEASE_TOOL" assert "$RESOURCE"
owner_file="$(find "$TEST_LEASE_DIR" -name '*.owner' -type f -print -quit)"
LEASE_LABEL="$(awk -F= '$1 == "launch_label" { print $2 }' "$owner_file")"

if (
    cd "$TEST_LEASE_DIR"
    DESIGNENGINEER_SESSION_PID="$owner_pid" "$LEASE_TOOL" assert "$RESOURCE" >/dev/null 2>&1
); then
    printf 'resource-lease test: a different repo was incorrectly allowed\n' >&2
    exit 1
fi

if DESIGNENGINEER_SESSION_PID="$$" "$LEASE_TOOL" assert "$RESOURCE" >/dev/null 2>&1; then
    printf 'resource-lease test: conflicting owner was incorrectly allowed\n' >&2
    exit 1
fi
if DESIGNENGINEER_SESSION_PID="$$" "$LEASE_TOOL" acquire "$RESOURCE" >/dev/null 2>&1; then
    printf 'resource-lease test: conflicting owner incorrectly acquired the lease\n' >&2
    exit 1
fi

kill "$owner_pid"
wait "$owner_pid" 2>/dev/null || true
OWNER_PID=""
for _ in {1..20}; do
    status="$($LEASE_TOOL status "$RESOURCE")"
    [[ "$status" == *"is unlocked"* ]] && break
    sleep 0.05
done
[[ "$status" == *"is unlocked"* ]]

printf 'resource-lease test: idempotency, repo isolation, conflict rejection, and automatic release passed\n'
