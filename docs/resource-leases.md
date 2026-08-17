# Process-Owned Resource Leases

Parallel agents need a mechanical ownership boundary around scarce local
resources. A simulator name in prose is not enough: two agents can resolve the
same name differently, or one can boot the most recently used device and
mutate another session's state.

The reference implementation is `tools/resource-lease.sh`. On macOS it holds
an advisory `lockf` lock in a non-restarting launchd child, records ownership
metadata, and watches the owning agent or terminal process. When that process
exits, the holder exits and the operating system releases the lock. There is
deliberately no `release` command that can free another live session's lease.

## Contract

Declare a stable resource identity and the commands it guards:

```yaml
resources:
  ios-simulator:
    kind: process-lease
    provider: macos-lockf
    identity: ios-simulator:51503619-6BAB-475A-A2BA-4F9B1B1CE6FF
    owner: agent-session
    release: process-exit
    guards:
      - make ios-install
      - make ios-run
```

Use an immutable identifier such as a simulator UDID, device UDID, database
name, or port plus host. A display name is metadata, not identity.

The three public operations are:

```bash
tools/resource-lease.sh acquire ios-simulator:51503619-6BAB-475A-A2BA-4F9B1B1CE6FF
tools/resource-lease.sh assert ios-simulator:51503619-6BAB-475A-A2BA-4F9B1B1CE6FF
tools/resource-lease.sh status ios-simulator:51503619-6BAB-475A-A2BA-4F9B1B1CE6FF
```

- `acquire` is idempotent for the same owner and repo.
- `assert` fails unless the current owner and repo hold the lease.
- `status` is read-only and reports the owner metadata when locked.
- owner death is the only normal release path.

The tool discovers the nearest Codex, Claude, or interactive shell ancestor.
Automation can set `DESIGNENGINEER_SESSION_PID` to an explicit live process.
`DESIGNENGINEER_LEASE_DIR` changes the state directory, and
`DESIGNENGINEER_LEASE_POLL_SECONDS` changes owner-liveness polling.

## Repo Integration

Put acquisition in an explicit setup target and assertions inside every target
that can mutate the resource:

```make
LEASE_TOOL := $(HOME)/designengineer/tools/resource-lease.sh
SIMULATOR_UDID := 51503619-6BAB-475A-A2BA-4F9B1B1CE6FF
SIMULATOR_RESOURCE := ios-simulator:$(SIMULATOR_UDID)

.PHONY: ios-sim-lock ios-install ios-run

ios-sim-lock:
	@$(LEASE_TOOL) acquire "$(SIMULATOR_RESOURCE)"

ios-install:
	@$(LEASE_TOOL) assert "$(SIMULATOR_RESOURCE)"
	@xcrun simctl install "$(SIMULATOR_UDID)" build/App.app

ios-run:
	@$(LEASE_TOOL) assert "$(SIMULATOR_RESOURCE)"
	@xcrun simctl launch "$(SIMULATOR_UDID)" com.example.app
```

Use the exact identifier again in the underlying command. The lease prevents
contention; it does not repair a target that still selects "booted", "latest",
or a non-unique display name.

Run `make test-resource-lease` on macOS to verify unlocked status, idempotent
acquisition, repo isolation, same-owner assertion, competing-owner rejection,
and automatic release after the owner process exits.

## Pool Leases

A fixed identity is the right contract for a resource there is exactly one of:
a physical device, a port, a shared staging database. It is the wrong contract
for a resource the machine can make more of. Pinning every worktree to one
simulator UDID serializes agents that did not need to be serialized, and the
second agent either blocks or, worse, quietly picks a different device by name.

The pool form keeps one-writer-per-resource while letting the repository use
several. The pool contract below evolved from the fixed-identity implementation
after parallel worktrees began competing for simulators.

The mechanics that matter:

- **The lock stays per identity.** One `lockf` lock per UDID, exactly as
  before. The pool is an allocation strategy layered on top, not a weaker lock.
- **Affinity, not assignment.** Each worktree remembers a preferred UDID in
  the repository's common git directory, keyed by a hash of the worktree path.
  A busy preferred device is not an error; allocation simply continues to the
  next free one. Closing a managed worktree removes its saved preference.
- **Reuse before boot.** Allocation prefers an already-booted free device over
  booting another. Booting is the expensive step.
- **Idle expiry with a heartbeat.** Leases expire after a TTL. Long-running
  commands hold the lease open with a keepalive rather than by extending the
  TTL for everyone. Owner death still frees the OS lock immediately; the TTL
  covers the case where the owner lives but has moved on.
- **A warm spare and a reap grace.** Keep one free device booted so the next
  acquisition is fast, and shut down surplus free devices after a grace period
  so the pool does not grow without bound.

```yaml
resources:
  ios-simulator:
    kind: pool-lease
    provider: macos-lockf
    identity: ios-simulator
    owner: agent-session
    release: [process-exit, ttl-expiry]
    pool:
      select: xcrun simctl list devices available
      affinity: worktree
      ttl: 300s
      keepalive: ./scripts/ios/simulator-lease.sh keepalive
      warm: 1
      reap-grace: 90s
    guards:
      - make ios-install
      - make ios-test
    test: ./scripts/ios/simulator-lease-test.sh
```

Two integration rules survive from the fixed-identity form and get sharper
here:

- **Resolve the identity once, then name it.** `SIMULATOR_UDID="$(make
  ios-sim-udid)"` and pass that UDID to every `simctl` call. A pool makes
  "booted" and "latest" more dangerous, not less, because there is now more
  than one candidate.
- **One install path.** If a second target can install or launch without
  asserting the lease, the pool guarantees nothing. Route every mutating
  command through the guarded verb.

The lease test must cover pool behavior without touching real Simulators:
allocation, affinity reuse, contention falling through to a free device,
expiry, and cleanup of surplus devices.
