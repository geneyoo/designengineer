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
	@xcrun simctl install "$(SIMULATOR_UDID)" build/Shaba.app

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
