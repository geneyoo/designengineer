#!/usr/bin/env bash
set -euo pipefail

# macOS process-owned resource leases for agent sessions.
# Public interface:
#   resource-lease.sh acquire <resource-identity>
#   resource-lease.sh assert  <resource-identity>
#   resource-lease.sh status  <resource-identity>
#
# DESIGNENGINEER_SESSION_PID may explicitly name a live owner process. Without
# it, the tool discovers the nearest Codex, Claude, or interactive shell
# ancestor. The launchd-held advisory lock releases automatically when that
# process exits; no explicit unlock command exists.

readonly SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
readonly LEASE_ROOT="${DESIGNENGINEER_LEASE_DIR:-${TMPDIR:-/tmp}/designengineer-resource-leases}"

RESOURCE_IDENTITY=""
RESOURCE_HASH=""
LOCK_FILE=""
OWNER_FILE=""
LEASE_TOKEN=""

usage() {
    printf 'usage: %s acquire|assert|status <resource-identity>\n' "$0" >&2
    exit 64
}

require_provider() {
    if [[ "$(uname -s)" != "Darwin" ]] \
        || ! command -v lockf >/dev/null 2>&1 \
        || ! command -v launchctl >/dev/null 2>&1 \
        || ! command -v plutil >/dev/null 2>&1; then
        printf 'The macos-lockf resource-lease provider requires macOS, lockf, launchctl, and plutil.\n' >&2
        exit 69
    fi
}

set_resource_context() {
    RESOURCE_IDENTITY="$1"
    [[ -n "$RESOURCE_IDENTITY" ]] || usage
    if [[ "$RESOURCE_IDENTITY" == *$'\n'* ]]; then
        printf 'Resource identity cannot contain a newline.\n' >&2
        exit 64
    fi

    RESOURCE_HASH="$(printf '%s' "$RESOURCE_IDENTITY" | shasum -a 256 | awk '{ print substr($1, 1, 16) }')"
    mkdir -p "$LEASE_ROOT"
    LOCK_FILE="${LEASE_ROOT}/${RESOURCE_HASH}.lock"
    OWNER_FILE="${LOCK_FILE}.owner"
}

current_repo() {
    git rev-parse --show-toplevel 2>/dev/null || pwd -P
}

find_session_pid() {
    if [[ -n "${DESIGNENGINEER_SESSION_PID:-}" ]]; then
        if [[ "$DESIGNENGINEER_SESSION_PID" =~ ^[0-9]+$ ]] \
            && kill -0 "$DESIGNENGINEER_SESSION_PID" 2>/dev/null; then
            printf '%s\n' "$DESIGNENGINEER_SESSION_PID"
            return 0
        fi
        printf 'DESIGNENGINEER_SESSION_PID is not live: %s\n' \
            "$DESIGNENGINEER_SESSION_PID" >&2
        return 1
    fi

    local pid="$PPID"
    local fallback=""
    while [[ -n "$pid" && "$pid" != "0" && "$pid" != "1" ]]; do
        local command_name
        local parent_pid
        local terminal
        command_name="$(ps -o comm= -p "$pid" | xargs basename 2>/dev/null || true)"
        terminal="$(ps -o tty= -p "$pid" | xargs || true)"

        case "$command_name" in
            codex|claude)
                printf '%s\n' "$pid"
                return 0
                ;;
            zsh|bash|fish)
                if [[ -n "$terminal" && "$terminal" != "??" ]]; then
                    fallback="$pid"
                fi
                ;;
        esac

        parent_pid="$(ps -o ppid= -p "$pid" | xargs || true)"
        [[ "$parent_pid" =~ ^[0-9]+$ ]] || break
        pid="$parent_pid"
    done

    if [[ -n "$fallback" ]]; then
        printf '%s\n' "$fallback"
        return 0
    fi

    printf 'Could not identify the owning Codex, Claude, or terminal session.\n' >&2
    printf 'Set DESIGNENGINEER_SESSION_PID to a live, persistent PID.\n' >&2
    return 1
}

read_owner_value() {
    local key="$1"
    [[ -f "$OWNER_FILE" ]] || return 1
    awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$OWNER_FILE"
}

lock_is_held() {
    ! lockf -t 0 "$LOCK_FILE" true 2>/dev/null
}

write_owner_file() {
    local session_pid="$1"
    local token="$2"
    local launch_label="$3"
    local owner_repo="$4"
    local temporary_owner="${OWNER_FILE}.$$"
    {
        printf 'resource=%s\n' "$RESOURCE_IDENTITY"
        printf 'session_pid=%s\n' "$session_pid"
        printf 'holder_pid=%s\n' "$$"
        printf 'token=%s\n' "$token"
        printf 'launch_label=%s\n' "$launch_label"
        printf 'repo=%s\n' "$owner_repo"
        printf 'started_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    } > "$temporary_owner"
    mv "$temporary_owner" "$OWNER_FILE"
}

remove_owner_file() {
    local token="$1"
    [[ "$(read_owner_value token 2>/dev/null || true)" == "$token" ]] || return 0
    rm -f "$OWNER_FILE"
}

hold_lease() {
    local session_pid="$1"
    local token="$2"
    local launch_label="$3"
    local owner_repo="$4"
    local poll_seconds="$5"

    LEASE_TOKEN="$token"
    trap 'remove_owner_file "$LEASE_TOKEN"' EXIT
    trap 'exit 0' INT TERM
    write_owner_file "$session_pid" "$token" "$launch_label" "$owner_repo"

    while kill -0 "$session_pid" 2>/dev/null; do
        sleep "$poll_seconds"
    done
}

same_owner() {
    local session_pid="$1"
    local owner_repo="$2"
    [[ "$(read_owner_value session_pid 2>/dev/null || true)" == "$session_pid" ]] \
        && [[ "$(read_owner_value repo 2>/dev/null || true)" == "$owner_repo" ]]
}

assert_lease() {
    local session_pid
    local owner_repo
    session_pid="$(find_session_pid)"
    owner_repo="$(current_repo)"

    if ! lock_is_held || [[ ! -f "$OWNER_FILE" ]]; then
        printf 'No active lease for %s.\n' "$RESOURCE_IDENTITY" >&2
        printf 'Run: %s acquire %q\n' "$SCRIPT_PATH" "$RESOURCE_IDENTITY" >&2
        return 1
    fi
    if ! same_owner "$session_pid" "$owner_repo"; then
        printf 'Resource is leased by another agent:\n' >&2
        printf '  resource: %s\n' "$RESOURCE_IDENTITY" >&2
        printf '  session_pid: %s\n' "$(read_owner_value session_pid 2>/dev/null || printf unknown)" >&2
        printf '  repo: %s\n' "$(read_owner_value repo 2>/dev/null || printf unknown)" >&2
        printf 'The lease releases automatically when that process exits.\n' >&2
        return 1
    fi
}

start_holder() {
    local session_pid="$1"
    local token="$2"
    local launch_label="$3"
    local owner_repo="$4"
    local poll_seconds="$5"
    local launch_plist="${LOCK_FILE}.${token}.plist"

    plutil -create xml1 "$launch_plist"
    plutil -insert Label -string "$launch_label" "$launch_plist"
    plutil -insert ProgramArguments -array "$launch_plist"
    local argument_index=0
    local argument
    for argument in \
        /usr/bin/lockf -t 0 "$LOCK_FILE" "$SCRIPT_PATH" hold \
        "$RESOURCE_IDENTITY" "$session_pid" "$token" "$launch_label" \
        "$owner_repo" "$poll_seconds"; do
        plutil -insert "ProgramArguments.${argument_index}" -string "$argument" "$launch_plist"
        argument_index=$((argument_index + 1))
    done
    plutil -insert RunAtLoad -bool true "$launch_plist"
    plutil -insert KeepAlive -bool false "$launch_plist"
    plutil -insert StandardOutPath -string /dev/null "$launch_plist"
    plutil -insert StandardErrorPath -string /dev/null "$launch_plist"
    plutil -insert EnvironmentVariables -dictionary "$launch_plist"
    plutil -insert EnvironmentVariables.DESIGNENGINEER_LEASE_DIR \
        -string "$LEASE_ROOT" "$launch_plist"

    if ! launchctl bootstrap "gui/$(id -u)" "$launch_plist"; then
        rm -f "$launch_plist"
        printf 'Could not start the resource lease holder.\n' >&2
        return 1
    fi
    rm -f "$launch_plist"
}

acquire_lease() {
    local session_pid
    local owner_repo
    session_pid="$(find_session_pid)"
    owner_repo="$(current_repo)"

    if lock_is_held; then
        if same_owner "$session_pid" "$owner_repo"; then
            printf 'Resource is already leased to this agent: %s\n' "$RESOURCE_IDENTITY"
            return 0
        fi
        printf 'Resource is already leased by another agent: %s\n' "$RESOURCE_IDENTITY" >&2
        printf '  session_pid: %s\n' "$(read_owner_value session_pid 2>/dev/null || printf unknown)" >&2
        printf '  repo: %s\n' "$(read_owner_value repo 2>/dev/null || printf unknown)" >&2
        return 1
    fi

    local poll_seconds="${DESIGNENGINEER_LEASE_POLL_SECONDS:-1}"
    if [[ ! "$poll_seconds" =~ ^[0-9]+([.][0-9]+)?$ ]] \
        || ! awk -v seconds="$poll_seconds" 'BEGIN { exit !(seconds > 0) }'; then
        printf 'DESIGNENGINEER_LEASE_POLL_SECONDS must be a positive number.\n' >&2
        return 1
    fi

    local token="${session_pid}-$$-${RANDOM}"
    local launch_label="com.geneyoo.designengineer.resource-lease.${RESOURCE_HASH}.${session_pid}.$$"
    start_holder "$session_pid" "$token" "$launch_label" "$owner_repo" "$poll_seconds"

    local attempt
    for attempt in {1..40}; do
        if lock_is_held; then
            local observed_token
            observed_token="$(read_owner_value token 2>/dev/null || true)"
            if [[ "$observed_token" == "$token" ]]; then
                printf 'Resource leased to this agent; automatic release is active:\n'
                printf '  resource: %s\n' "$RESOURCE_IDENTITY"
                printf '  session_pid: %s\n' "$session_pid"
                printf '  repo: %s\n' "$owner_repo"
                return 0
            fi
            [[ -z "$observed_token" ]] || break
        fi
        sleep 0.05
    done

    printf 'Could not acquire resource; another agent won the lease: %s\n' \
        "$RESOURCE_IDENTITY" >&2
    return 1
}

show_status() {
    if ! lock_is_held; then
        printf 'Resource is unlocked: %s\n' "$RESOURCE_IDENTITY"
        return 0
    fi

    printf 'Resource is locked: %s\n' "$RESOURCE_IDENTITY"
    if [[ -f "$OWNER_FILE" ]]; then
        sed 's/^/  /' "$OWNER_FILE"
    else
        printf '  owner metadata is initializing\n'
    fi
}

command="${1:-}"
resource="${2:-}"
[[ -n "$command" && -n "$resource" ]] || usage
require_provider
set_resource_context "$resource"

case "$command" in
    acquire)
        [[ "$#" == 2 ]] || usage
        acquire_lease
        ;;
    assert)
        [[ "$#" == 2 ]] || usage
        assert_lease
        ;;
    status)
        [[ "$#" == 2 ]] || usage
        show_status
        ;;
    hold)
        [[ "$#" == 7 ]] || exit 64
        hold_lease "$3" "$4" "$5" "$6" "$7"
        ;;
    *)
        usage
        ;;
esac
