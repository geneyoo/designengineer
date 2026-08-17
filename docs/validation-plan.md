# Build And Validation Plan

The deliverable is a repo-local harness, not a prose methodology. It should
make the fast path faster and the wrong path obvious.

## Shipped product shape

Working product: **Design Engineer Harness**.

Current CLI:

```bash
designengineer scan [repo]
designengineer scan [repo] --write <proposal>
designengineer init --adopt [repo]
designengineer verify <check|all>
designengineer verify factory.<factory>
designengineer status
designengineer assert <check>
```

`scan` inventories existing entry points and proposes, but never installs,
policy. `verify`, `status`, and `assert` are the first evidence path. Factory
run/preview commands, work-order verbs, per-lane fingerprints, rule reports,
and new-project scaffolding remain roadmap items.

Project files:

```text
.designengineer/config.yaml
.designengineer/ledger.jsonl      # gitignored
.githooks/pre-commit
AGENTS.md
```

Optional plugin layer:

```text
skills/
  use-designengineer
  create-workorder
  fix-check-failure

hooks/
  Stop: designengineer assert <required-check>
```

The CLI is the product. Plugins only teach agents to use it.

`init --adopt` scans an existing project and writes a non-destructive proposed
config. New-project scaffolding is deliberately agent-guided rather than
generated. See `docs/onboarding.md`.

There is one evidence system. `verify factory.web-tokens` and
`assert factory.web-tokens` use the same ledger and freshness rules as every
other check.

## DX Invariants

These are product constraints, not aspirations.

- Block sharing, never iterating. Checks gate commit, push, and done-claims;
  they do not block saving files, running the app, or exploration.
- Fast checks are the dopamine. Pre-commit checks should stay under 5 seconds;
  the ordinary explicit verification lane should stay under 30 seconds.
- Slow checks move later. Full builds, snapshots, device runs, staging smoke,
  and dependency audits belong in pre-push, CI, or explicit `verify`.
- CI lanes are capability-scoped. Default to the cheapest runner that can run
  the exact command, prove parity before moving a gate across platforms, and
  condition expensive lanes on a complete input set.
- Conditional lanes fail closed. Selector errors are failures, required
  aggregate statuses inspect every direct dependency result, and
  environment-coupled checks also run on a schedule.
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

## V0 status

The generic CLI now ships repository inventory, config proposal, whole-tree
fingerprinting, check execution, status, and assertion. Fixture tests prove
safe writes and evidence invalidation. The remaining v0 work is adoption and
measurement in a second repository:

1. Wrap existing lane verification:
   - register existing `make *-verify` targets from scan output
   - refine whole-tree fingerprints only after needless invalidation is measured
   - record each lane's CI command, required capabilities, and complete input
     set
   - verify selector fixtures and required-status failure propagation

2. Normalize design checks:
   - extract rule IDs from existing SwiftUI checks
   - include `fix:` and `exemplar:` fields in failures
   - count `design-ok:` escape hatches

3. Register rulepack candidates:
   - wrap existing copy-style and design-system scripts
   - record stable rule IDs such as `copy.no-em-dash`
   - preserve existing Makefile and hook entry points
   - send output through the same ledger as other checks
   - support aggregate checks that freshen split rulepack IDs
   - verify every `exemplar:` path is committed or staged

4. Add lightweight work orders:
   - `scope.allow`
   - `max-files`
   - `exemplar`
   - `done` checks

5. Add rule telemetry:
   - ledger records fired rule IDs
   - report hot rules, dead rules, and escape-hatch count

6. Register the first factory candidate:
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
- adopt an existing repo harness without staging unrelated dirty files
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
- unrelated files staged in adoption PR
- detected-deferred findings count

Success criteria:

- lower review churn
- fewer out-of-scope edits
- fewer design-system violations
- adoption PR contains only proposed scope files
- equal or lower time to verified green for small tasks
- no pre-commit path over the latency budget

Failure criteria:

- common loop adds more than 30 seconds
- agents route around the harness
- humans disable hooks
- check failures require interpretation from a senior
- flaky or noisy rules persist
- factory checks create a parallel evidence path outside the ledger
- adoption PR mixes unrelated generated assets or feature work

## Next sequence

1. Adopt scan/verify/status/assert into a second repository.
2. Add taught failures to one design-system check there.
3. Register one fast rulepack, starting with an existing
   design-system or copy-style script.
4. Add adoption scope output: included, detected-deferred, unmanaged, and
   unrelated-dirty files.
5. Add escape-hatch counting.
6. Register `web-tokens` as the first factory candidate.
7. Wire the token drift command to `verify factory.web-tokens`.
8. Add or declare the missing token preview path.
9. Add one work-order path for a weak-agent task.
10. Run the eval.
11. Generalize only the pieces that improve metrics.

Smoke evals can run earlier to catch obvious product friction. The success
claim waits until taught failures, escape-hatch accounting, a factory check,
and one work-order path all exist, otherwise the eval is measuring half the
harness.

Generators stay deferred until telemetry shows a repeated rule failure that an
exemplar cannot prevent.
