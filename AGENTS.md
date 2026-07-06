# Agent Instructions

This repo is about making agent behavior executable, not merely instructive.

## Working Style

- Prefer small, reviewable documents and prototypes over broad frameworks.
- Preserve the distinction between capability tools and preference prompts.
- Treat hooks, CLI generators, schemas, lint rules, and tests as first-class
  design artifacts.
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
- Checks and exemplars before generators; generators only when they remove a
  measured repeated failure.
- Checks over reminders.
- Local repo contracts over global agent personality.
- Evidence and verification over claims.
- Escape-hatch accounting over silent drift.

## File Map

- `README.md`: current thesis and product direction.
- `docs/position.md`: the longer initial argument.
- `docs/research/README.md`: research queue and evaluation template.
- `docs/research/reuse-map.md`: local prior art to extract.
- `docs/research/verification-ledger.md`: evidence model for local verification.

## Done Means

For future code changes, prefer leaving one runnable check behind. For research
notes, cite sources and state the practical implication.
