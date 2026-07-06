# Moveset Extensions

The current system defines the repo-level moveset: checks, exemplars, hooks,
ledger. The next layer scopes the moveset per task and closes the loop from
failures back into rules. Each proposal states its enforcement, per AGENTS.md.

## 1. Work orders: the moveset applied per task

The senior→junior handoff should be a machine-readable contract, not a chat
message:

```yaml
# .agent-harness/workorders/invoices-empty-state.yaml
task: Add empty state to invoices list
scope:
  allow: [apps/ios/Palette/Features/Invoices/**]
  deny-new-deps: true
  max-files: 6
exemplar: apps/ios/Palette/Features/Contacts/ContactsEmptyState.swift
done:
  - verify: ios-verify
  - verify: ios-design
```

Enforcement: a PreToolUse hook denies edits outside `scope.allow`; a Stop
hook runs `agent-harness assert` for every `done` entry. "Done" is not a
claim, it is ledger state matching the contract.

Why it matters: weak agents fail by wandering. Scope fences plus a named
exemplar plus asserted checks remove the three main failure modes (wrong
files, wrong pattern, unverified claims) mechanically.

Measurement: eval tasks run with and without work orders; compare files
touched outside intended scope, retries, and review time.

## 2. Checks that teach: remediation is part of the check contract

A check failure a weak agent can't act on costs a full extra loop. Every
ERROR must carry its fix:

```text
ERROR raw Color(red:green:blue:) in InvoiceRow.swift:41
  fix: use PaletteColor tokens (see UI/DesignSystem/Tokens/PaletteColor.swift)
  exemplar: UI/DesignSystem/Components/PaletteListRow.swift
```

Enforcement: harness check-output schema requires `fix:` and `exemplar:`
fields; a meta-check lints the rules themselves for missing remediation.

This also resolves the instruction-budget tension: rules live nowhere in
standing context. They are injected just-in-time, at the exact moment of
violation, via PostToolUse feedback. Zero tokens until needed.

Measurement: iterations-to-green per check failure, before and after
remediation messages.

## 3. Exemplar index and freshness

If exemplars are the paved road, they must be findable and pristine.

- Mark them: `// exemplar: list-row` (Swift), `/* exemplar: form */` (TS).
- Index them: `agent-harness exemplars [kind]` returns paths; work orders
  reference them by kind, not path.
- Keep them pristine: a check requires every exemplar file to pass all
  ERROR-tier checks with zero escape hatches. A rotting exemplar is worse
  than none — weak agents copy it faithfully.

Enforcement: exemplar-freshness runs in `check changed` whenever an exemplar
file is touched, and in CI always.

## 4. Rule telemetry: prune dead rules, promote hot ones

Escape-hatch counting generalizes to per-rule failure telemetry. Each ledger
entry records which rules fired. Over time:

- A rule that never fires is dead weight — delete it (instruction budget is
  real even for checks: runtime, noise, maintenance).
- A rule that fires constantly is a signal the paved road is missing — this
  is the trigger for investing in a generator or better exemplar, replacing
  guesswork with data. It is the standing answer to "when do generators
  earn their keep."

Enforcement: `agent-harness report rules` over ledger history; a quarterly
prune is a documented maintenance verb.

## 5. Progressive trust: moveset width scales with agent tier

Not every agent gets the same legal moves:

```yaml
tiers:
  paved-only:    # weak/cheap agents
    verbs: [check, verify, status]
    require-workorder: true
  trusted:       # senior agents
    verbs: [check, verify, add-guardrail, workorder create]
```

Enforcement: harness verbs read the tier from env/config; hooks deny
out-of-tier verbs. A weak agent cannot create its own work order or add an
escape hatch — the same reason juniors don't approve their own PRs.

## 6. Taste capture via approved snapshots

Design judgment that can't be expressed as a token rule can be expressed as
an approved artifact: iOS snapshot tests and web screenshot diffs, with
approvals recorded in the ledger as TTL-class evidence (approvals decay;
re-approval is a human verb, not an agent verb).

Enforcement: `verify ios-snapshots` fails on any un-approved pixel diff;
approval writes a ledger entry with a TTL.

## Sequencing

Work orders (1) and remediation messages (2) are the two that most change
weak-agent throughput and both sit directly on machinery already planned
(hooks + ledger). Exemplar index (3) is small and unblocks (1)'s exemplar
references. Telemetry (4) falls out of the ledger schema if rule IDs are
recorded from day one — decide that field now even if reporting comes later.
(5) and (6) are second wave.

## DX constraints

These extensions should preserve the fast local loop:

- Work orders are required for weak-agent tiers, not every human edit.
- Pre-commit remains fast; slow checks move to pre-push, CI, or explicit
  `verify`.
- New rules start as WARN unless the repo already satisfies them.
- Every blocking failure includes remediation and an exemplar.
- Escape hatches are allowed, counted, and reviewed later.
