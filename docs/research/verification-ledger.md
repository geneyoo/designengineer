# Verification Ledger: local verify + fingerprint/TTL evidence

Checks do not just pass or fail: the CLI leaves a queryable record. "Evidence
before done" is then mechanical rather than a transcript claim.

## Shape

```bash
designengineer verify <check|all>                 # run check, append record
designengineer verify factory.<id>                # factory checks are checks
designengineer status                             # what's fresh, stale, missing
designengineer assert <check>                     # exit 0 iff fresh evidence exists
```

Ledger: `.designengineer/ledger.jsonl` (gitignored; CI always re-verifies).

```json
{"check":"ios-verify","tree":"<git index tree>",
 "fingerprint":"<working tree sha256>","result":"pass","rules":[],
 "env":null,"at":"2026-07-06T18:40:00Z","ttl":null}
{"check":"factory.web-tokens","tree":"<git index tree>",
 "fingerprint":"<working tree sha256>","result":"pass","rules":[],
 "env":null,"at":"2026-07-06T18:40:30Z","ttl":null}
{"check":"factory.ios-design-gallery","tree":"<git tree hash of gallery inputs>",
 "result":"pass","rules":[],"env":{"xcode":"18.0","runtime":"iOS 20.0"},
 "at":"2026-07-06T18:40:45Z","ttl":null}
{"check":"staging-smoke","tree":null,
 "result":"pass","rules":[],"env":null,"at":"2026-07-06T18:41:00Z","ttl":"4h"}
```

Record `rules` from day one, even before reporting exists. Rule telemetry
depends on this field and retrofitting it later would create needless schema
drift.

## Invalidation: hash, environment fingerprint, TTL

Different staleness models need different keys, and conflating them is the
classic mistake:

- **Deterministic checks** (lint, design-system check, build, unit tests):
  valid while the working-tree fingerprint is unchanged. TTL is wrong here — results
  don't decay with time, they decay with edits. This is Bazel/Nx/Gradle
  cache-key semantics (key = check id + input hash); reuse the model, don't
  invent theory.
- **Environment-coupled checks** (staging smoke, external API contract,
  device/simulator run, visual screenshot approval, dep audit): the world
  changes under you, so these need TTLs. `ttl` field is for this class only.
- **Environment-sensitive deterministic renders** (simulator snapshots,
  screenshot generators, visual galleries): valid while the input tree hash and
  environment fingerprint both match. The fingerprint should include the
  relevant runtime, such as Xcode version, simulator OS/runtime, device family,
  scale, locale, browser engine, or Playwright/browser version.

A CLI record is fresh iff `fingerprint` matches the current working tree and
`ttl` has not elapsed. The CLI also records Git's index tree and dirty state for
diagnosis. Environment fingerprints remain part of the contract for checks
whose outputs depend on Xcode, a simulator runtime, browser, locale, or another
toolchain input.

Factories do not get a separate evidence path. A factory freshness check is a
normal check with an id like `factory.web-tokens`, so work orders and Stop hooks
can use `assert factory.web-tokens` exactly like `assert ios-design`.

## Why this matters for weak agents specifically

1. **"Done" becomes checkable.** A Stop/pre-commit hook runs
   `designengineer assert` for the checks the task's work order names. A weak
   agent cannot claim done without fresh ledger entries — the claim is
   mechanical, not trusted.
2. **Expensive checks stop re-running.** Agent asks `status` before spending
   ten minutes on a full build the fingerprint says is already verified. This
   is the lane-dispatch idea (palette `tools/lanes/`) generalized: dispatch
   scoped verification, then remember it.
3. **Audit trail for the orchestrator.** The senior agent reviewing a junior
   agent's work reads the ledger, not the transcript: what was actually run,
   against which tree, when.

## Shipped v0

`bin/designengineer.mjs` loads the repo-local config, wraps existing check
commands, fingerprints tracked and non-ignored untracked files, appends pass or
fail evidence, and implements `status` and `assert`. Fixture tests cover scan,
safe proposal writes, verification, freshness, and invalidation after an edit.

## Open questions

- Fingerprint granularity: v0 hashes the whole repository. Per-check input
  globs can reduce needless invalidation after evidence justifies the added
  configuration.
- Should CI publish ledger entries back (signed) so local `assert` can trust
  CI runs? Defer; local-only is enough for v0.
- Escape-hatch counting could live here too: each `verify` records the
  current `design-ok:` count, making drift a time series for free.
