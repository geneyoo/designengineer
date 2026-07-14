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

- `README.md`: current thesis and product direction.
- `docs/onboarding.md`: new-project vs existing-project setup, scan, and
  migration flow.
- `docs/position.md`: the longer initial argument.
- `docs/research/README.md`: research queue and evaluation template.
- `docs/research/reuse-map.md`: local prior art to extract.
- `docs/research/verification-ledger.md`: evidence model for local verification.
- `docs/research/factory-patterns.md`: generated-output patterns with baked-in
  quality control.
- `docs/research/rulepacks.md`: taste, design-system, copy, and asset-style
  checks normalized into reusable repo-local contracts.
- `docs/resource-leases.md`: process-owned exclusive-resource contract and
  repo integration pattern.
- `schema/config.schema.json`: normative contract for
  `.designengineer/config.yaml`; doc YAML examples must validate against it.
- `schema/workorder.schema.json`: contract for work-order files.
- `tools/check-docs-examples.mjs`: the `docs-examples` rulepack. Validates all
  doc YAML blocks and the repo's own config, checks exemplar existence, and
  appends ledger evidence. Run with `make check`; wired to pre-commit.
- `tools/resource-lease.sh`: macOS reference implementation for session-owned
  resource leases; `tools/test-resource-lease.sh` verifies acquisition,
  repo isolation, conflict rejection, and automatic release.
- `.designengineer/config.yaml`: this repo's own harness config.

## Local Checks

Run `make bootstrap` once after cloning (installs deps and hook path). Every
YAML example added to docs must validate against the schemas; escape hatch is
`<!-- docs-ok: reason -->` on the line above the fence, and escapes are
counted.

## Done Means

For future code changes, prefer leaving one runnable check behind. For research
notes, cite sources and state the practical implication.
