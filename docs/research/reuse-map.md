# Reuse Map: Palette, Hatch, and PrettyPlease

This is provenance for the portable contracts in this repository, not an
installation guide. It was re-verified against the local source repositories
on 2026-08-17. Public adopters need only the distilled contracts and runnable
examples checked in here.

## 1. Design-system and taste checks

The three source repositories prove the same structure across different
stacks:

- Palette's iOS and web checks reject raw colors, fonts, radii, materials,
  components, and missing design-gallery registrations.
- PrettyPlease's iOS check uses ERROR/WARN tiers, a named `design-ok:` escape,
  and parity checks for extensions that cannot link the main style-guide code.
- Hatch's checks enforce design tokens, copy style, product naming, prohibited
  iconography, and ratcheted Swift source size.

Portable capability: rule IDs, scope, severity, fix, exemplar, and counted
escape hatches.

Behavioral bias: prefer the repository's existing tokens/components over new
visual vocabulary.

Risk: regex checks can overclaim semantic coverage. Use SwiftSyntax, ESLint, or
another AST facility when syntax distinctions matter.

Practical implication: extract a working check as a repo-local rulepack before
turning its preferences into a global agent prompt.

## 2. Quality-controlled factories

Working source patterns include:

- Markdown style sources compiled to web token code with a drift check.
- One brand definition rendered into iOS and web assets.
- App icon generation plus rasterized geometry tests.
- Simulator-backed design-system galleries with HTML previews.
- Config-driven App Store screenshots with raw-source and approved-output
  directories.

Portable capability:

```text
declared source -> deterministic run -> declared outputs -> drift check -> preview
```

Behavioral bias: use the existing asset formula rather than asking an agent to
approximate brand style from prose.

Risk: a generator without a preview or freshness check creates confident drift.

Practical implication: factories have stronger local evidence than generic
component scaffolds. Extract them first.

## 3. Local lanes and remote admission

The sources now demonstrate two valid profiles rather than one universal lane:

- PrettyPlease is hooks-first: pre-commit runs its design check and affected
  Swift lint; pre-push runs affected iOS verification. GitHub separately runs
  path-scoped server CI and a full-history secret scan.
- Hatch is guarded multi-agent: local commit/push runs writer isolation but no
  product checks by default. Pull-request admission runs portable lint and
  guard tests on Linux, provisions a macOS capability job only for its closed
  input set, and runs PostgreSQL-backed server tests on server changes.
  Exhaustive cross-surface verification is explicit/manual.

Portable capability: named lanes, explicit selectors, closed input sets,
toolchain identity, fail-closed aggregation, and one stable required status.

Behavioral bias: keep the default loop cheap enough that agents do not route
around it.

Risk: a zero-validation local lane is safe only with required remote admission.
Hooks-only enforcement is bypassable; CI-only feedback may be too late.

Practical implication: choose the profile from repository latency and
concurrency, then state exactly which checks are skipped at each surface.

## 4. Writer isolation and integration

Hatch's mature workflow adds:

- one branch and leased worktree per writer;
- a structured editor guard plus Git hook backstops;
- a cap and stale-lease reap that preserve dirty/unmerged work;
- checked-in PR-open and branch-enforcement verbs;
- a stack-aware integration queue with child retarget and interrupted-state
  repair;
- denial-path tests for every guard.

Portable capability: observable ownership state and tested transition guards.

Behavioral bias: concurrent agents collaborate through branches, PRs, and
evidence rather than a shared checkout.

Risk: structured editor hooks do not intercept shell writes; Git hooks can be
bypassed. Only remote admission is the hard boundary.

Practical implication: adopt the contract in [`../workflow-guards.md`](../workflow-guards.md)
only when concurrent writers are a real operating mode.

## 5. Exclusive resource pools

The first simulator implementation leased one immutable UDID to the owning
agent process. The current source evolved into a pool with per-worktree
affinity, free-booted-device reuse, TTL/heartbeat ownership, one warm spare,
and surplus-device reaping. The lock remains one per UDID; only allocation
changed.

This repository ships and tests the fixed-identity primitive. The pool form is
specified in [`../resource-leases.md`](../resource-leases.md) but is not
packaged as a generic implementation yet.

Practical implication: fixed leases fit a physical device, port, or database;
pool leases fit simulators and other resources the machine can provision more
than once.

## 6. Release and deployment commands

The mature release pattern owns build-number preparation, generated project
updates, a release branch/worktree, PR admission and merge, final main
fast-forward, archive, and upload behind one verb. Production uses a distinct
confirmation-gated command. A failed upload after a merged bump retries the
same build instead of consuming another number.

Server deployment similarly uses checked-in exact-SHA staging, verification,
promotion, rollback, capacity, and sanitized status commands. The portable
contract is in [`../render-bootstrap-agent-runbook.md`](../render-bootstrap-agent-runbook.md).

Practical implication: release operations are repo behavior, not a checklist
an agent reconstructs from memory.

## 7. Documentation ownership

Hatch's current documentation distinguishes durable product direction, open
roadmap, active behavior contracts, and archives. Completed implementation
history stays in Git; the roadmap cannot become a changelog. This prevents an
agent from treating an old milestone or research note as current scope.

Practical implication: every handoff repository needs a navigation document
that labels current contracts, maintained references, proposals, and archives.
This repository's entry point is [`../development-flow.md`](../development-flow.md).

## What not to carry over

- Machine-global design prompts as required dependencies.
- App-specific architecture or product invariants in a portable kit.
- Absolute home-directory paths or references to temporary worktrees.
- Long prose rules when an existing check, type, factory, or hook can enforce
  the behavior.
- Provider workarounds taught independently to every agent instead of hidden
  behind one checked-in command.
- A merge queue in a solo repository with no CI or stacked branches.

## Remaining gaps

- The scanner proposes stable-looking commands but does not infer semantic
  dependency graphs or automatically install policy.
- The generic resource implementation does not allocate pools.
- Architecture boundary checks still depend on target-stack tooling.
- Factory preview and invalidation contracts need adoption in a second public
  repository before they should become generated scaffolds.
- Product claims still need comparative agent-task measurements: pass rate,
  retries, diff size, elapsed time, and escape count with and without rails.
