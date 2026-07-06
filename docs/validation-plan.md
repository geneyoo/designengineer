# Build And Validation Plan

The deliverable is a repo-local harness, not a prose methodology. It should
make the fast path faster and the wrong path obvious.

## Product Shape

Working product: **Design Engineer Harness**.

Core CLI:

```bash
designengineer init
designengineer check changed
designengineer verify <check>
designengineer verify factory.<factory>
designengineer status
designengineer assert <check>
designengineer workorder create
designengineer exemplars list [kind]
designengineer factory list
designengineer factory run <factory>
designengineer factory check <factory>      # alias for verify factory.<factory>
designengineer factory preview <factory>
designengineer report rules
```

Project files:

```text
.designengineer/config.yaml
.designengineer/workorders/
.designengineer/ledger.jsonl      # gitignored
.designengineer/exemplars.json
.githooks/pre-commit
.githooks/pre-push
AGENTS.md                         # patched with local usage rules
```

Optional plugin layer:

```text
skills/
  use-designengineer
  create-workorder
  fix-check-failure

hooks/
  PostToolUse: designengineer check changed --fast
  Stop: designengineer assert workorder
```

The CLI is the product. Plugins only teach agents to use it.

There is one evidence system. `factory check web-tokens` writes the same
ledger entry as `verify factory.web-tokens`, and `assert factory.web-tokens`
uses the same freshness rules as every other check.

## DX Invariants

These are product constraints, not aspirations.

- Block sharing, never iterating. Checks gate commit, push, and done-claims;
  they do not block saving files, running the app, or exploration.
- Fast checks are the dopamine. Pre-commit checks should stay under 5 seconds;
  `check changed` should stay under 30 seconds.
- Slow checks move later. Full builds, snapshots, device runs, staging smoke,
  and dependency audits belong in pre-push, CI, or explicit `verify`.
- WARN before ERROR for new rules. Promote only after the repo is clean or the
  escape hatch policy is clear.
- Every ERROR teaches. Failures must include a rule ID, fix guidance, and an
  exemplar reference.
- Humans should not feel work-order ceremony for small edits. Work orders are
  required for weak-agent tiers, not for every human action.
- Escape hatches are allowed but counted. `design-ok:` is a pressure valve, not
  a silent bypass.
- Delete flaky rules quickly. One noisy rule damages trust in the whole
  harness.

## V0 Scope

V0 should prove value inside `palette` before becoming generic.

1. Wrap existing lane verification:
   - consume `tools/lanes/detect.sh`
   - run existing `make *-verify` targets
   - append ledger entries
   - expose `status` and `assert`

2. Normalize design checks:
   - extract rule IDs from existing SwiftUI checks
   - include `fix:` and `exemplar:` fields in failures
   - count `design-ok:` escape hatches

3. Add lightweight work orders:
   - `scope.allow`
   - `max-files`
   - `exemplar`
   - `done` checks

4. Add rule telemetry:
   - ledger records fired rule IDs
   - report hot rules, dead rules, and escape-hatch count

5. Register the first factory candidate:
   - declare source of truth
   - declare generated outputs
   - run existing generator command
   - run existing freshness check
   - expose preview path or explicitly report it missing
   - append ledger evidence

## Factory Contract

Factories are generated workflows with quality control, not broad scaffolding
promises. A workflow can be registered as a factory candidate before it passes
every criterion, but `factory status` must show the missing criteria.

```yaml
factories:
  web-tokens:
    source:
      - themes/*.instructions.md
    run: make www-tokens-build
    check: make www-tokens-check
    verify: factory.web-tokens
    outputs:
      - www/src/ui/tokens.css
      - www/src/ui/tokens.ts
    preview:
      status: missing
      candidate: web style guide or token dashboard
    ledger:
      invalidation: tree-hash
```

A factory should have:

- one source of truth
- deterministic output
- a drift or freshness check
- a preview surface
- ledger evidence

Screenshot and approval-heavy factories can use TTL invalidation for the human
approval record, but deterministic renders should still be tree-hash keyed.
Simulator-backed renders are not tree-only deterministic: their freshness key
must include an environment fingerprint such as Xcode version, simulator
runtime, device family, OS version, scale, and locale, or move the approval
record into the TTL class.

## Ledger Schema

Record rule IDs immediately, even before reporting exists.

```json
{
  "check": "ios-design",
  "result": "fail",
  "rules": ["ios-design.raw-color"],
  "tree": "<hash>",
  "env": null,
  "at": "2026-07-06T18:40:00Z",
  "ttl": null
}
```

Check IDs:

```text
ios-verify              aggregate lane verification
ios-design              atomic design-system check
ios-design.raw-color    rule ID
factory.web-tokens      web token factory freshness check
```

## Validation

Run the same tasks with and without the harness.

Agent profile:

- weak/cheap model
- same prompt budget
- same repo baseline
- same task set

Task set:

- add a SwiftUI empty state
- add a list row variant
- add a small settings control
- make a tokenized color/style change
- update the web-token factory candidate
- render an app screenshot or icon factory
- fix a known design-system violation

Measure:

- time to green
- iterations to green
- files touched outside intended scope
- check-pass rate on first completion claim
- review comments required
- diff size
- escape-hatch count
- rule fire count
- elapsed check time
- flaky-rule count
- factory freshness rate
- manual cleanup required after factory run

Success criteria:

- lower review churn
- fewer out-of-scope edits
- fewer design-system violations
- equal or lower time to verified green for small tasks
- no pre-commit path over the latency budget

Failure criteria:

- common loop adds more than 30 seconds
- agents route around the harness
- humans disable hooks
- check failures require interpretation from a senior
- flaky or noisy rules persist
- factory checks create a parallel evidence path outside the ledger

## Sequence

1. Build ledger v0 in `palette`.
2. Add taught failures to one design-system check.
3. Add escape-hatch counting.
4. Register `web-tokens` as the first factory candidate.
5. Wire `factory check web-tokens` to `verify factory.web-tokens`.
6. Add or declare the missing token preview path.
7. Add one work-order path for a weak-agent task.
8. Run the eval.
9. Generalize only the pieces that improve metrics.

Smoke evals can run earlier to catch obvious product friction. The success
claim waits until taught failures, escape-hatch accounting, a factory check,
and one work-order path all exist, otherwise the eval is measuring half the
harness.

Generators stay deferred until telemetry shows a repeated rule failure that an
exemplar cannot prevent.
