# Agent Instructions

This repo is about making agent behavior executable, not merely instructive.

## Working Style

- Prefer small, reviewable documents and prototypes over broad frameworks.
- Preserve the distinction between capability tools and preference prompts.
- Treat hooks, quality-controlled factories, schemas, lint rules, and tests as
  first-class design artifacts.
- Prefer extracting and generalizing working checks from local repos before
  inventing new mechanisms.
- When adding a proposed rule, include how it would be enforced.
- When making a product claim, include how it would be measured.
- When evaluating an existing plugin or skill, separate:
  - what capability it adds
  - what behavior it biases
  - what risks it introduces
  - what overlap it has with this repo

## Product Bias

The target user is a design engineer: someone blending product taste, design
systems, frontend craft, architecture, and practical automation.

The repo should favor:

- Design-system enforcement over generic frontend advice.
- Checks, exemplars, and factories before broad scaffold generators; scaffold
  generators only when they remove a measured repeated failure.
- Checks over reminders.
- Local repo contracts over global agent personality.
- Evidence and verification over claims.
- Escape-hatch accounting over silent drift.

## File Map

- `README.md`: public entry point, runnable CLI quick start, and repository map.
- `bin/designengineer.mjs`: scan, proposal, verify, status, and assert CLI.
- `docs/development-flow.md`: current hooks-first and guarded multi-agent
  workflows, adoption order, and agent handoff prompt.
- `docs/onboarding.md`: new-project vs existing-project setup, scan, and
  migration flow.
- `docs/position.md`: the longer initial argument.
- `docs/research/README.md`: research queue and evaluation template.
- `docs/research/reuse-map.md`: local prior art to extract.
- `docs/research/verification-ledger.md`: evidence model for local verification.
- `docs/research/factory-patterns.md`: generated-output patterns with baked-in
  quality control.
- `docs/research/shaba-pr-421-ci-lessons.md`: capability-scoped CI lanes,
  closed input sets, fail-closed aggregation, and dated cost evidence.
- `docs/research/rulepacks.md`: taste, design-system, copy, and asset-style
  checks normalized into reusable repo-local contracts.
- `docs/resource-leases.md`: fixed and pooled process-owned resource contracts.
- `docs/workflow-guards.md`: writer isolation, lanes, admission, ratchets, and
  the drop-in order.
- `schema/config.schema.json`: normative contract for
  `.designengineer/config.yaml`; doc YAML examples must validate against it.
- `schema/workorder.schema.json`: contract for work-order files.
- `tools/check-docs-examples.mjs`: the `docs-examples` rulepack. Validates all
  doc YAML blocks and the repo's own config, checks exemplar existence, and
  appends ledger evidence. Run with `make check`; wired to pre-commit.
- `tools/resource-lease.sh`: macOS reference implementation for session-owned
  resource leases; `tools/test-resource-lease.sh` verifies acquisition,
  repo isolation, conflict rejection, and automatic release.
- `tools/paths-changed.sh`: fail-closed, path-scoped Git change detector;
  `tools/test-paths-changed.sh` covers positive, negative, error, and usage
  cases.
- `tools/test-cli.mjs`: fixture coverage for non-destructive adoption and
  evidence invalidation.
- `.github/workflows/admission.yml`: Linux portable checks plus a
  change-scoped and weekly macOS resource-lease lane behind one stable status.
- `.github/workflows/secret-scan.yml`: full-history Gitleaks on PRs, main,
  schedule, and manual dispatch.
- `.designengineer/config.yaml`: this repo's own harness config.

## Local Checks

Run `make bootstrap` once after cloning (installs deps and hook path).
`make check` is the complete local gate; `make check-portable` is the
platform-neutral subset used by CI. Every YAML example added to docs must
validate against the schemas; escape hatch is `<!-- docs-ok: reason -->` on
the line above the fence, and escapes are counted.

## Done Means

For future code changes, prefer leaving one runnable check behind. For research
notes, cite sources and state the practical implication.
