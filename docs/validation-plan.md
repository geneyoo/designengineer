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
designengineer status
designengineer assert <check>
designengineer workorder create
designengineer exemplars list [kind]
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

## Ledger Schema

Record rule IDs immediately, even before reporting exists.

```json
{
  "check": "ios-design",
  "result": "fail",
  "rules": ["ios-design.raw-color"],
  "tree": "<hash>",
  "at": "2026-07-06T18:40:00Z",
  "ttl": null
}
```

Check IDs:

```text
ios-verify              aggregate lane verification
ios-design              atomic design-system check
ios-design.raw-color    rule ID
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

## Sequence

1. Build ledger v0 in `palette`.
2. Add taught failures to one design-system check.
3. Add escape-hatch counting.
4. Add one work-order path for a weak-agent task.
5. Run the eval.
6. Generalize only the pieces that improve metrics.

Generators stay deferred until telemetry shows a repeated rule failure that an
exemplar cannot prevent.
