# Design Engineer

Design Engineer is a research and tooling repo for turning senior design and
engineering judgment into executable systems for AI agents.

The core claim:

> The best way to scale agents is to stop treating them as autonomous senior
> engineers and start treating the repo as an executable operating system.

The goal is to build a suite of repo-local rails that let strong agents encode
judgment once, then let weaker agents safely operate inside that system.

## Thesis

The senior design-engineer role is not just taste, implementation, or prompt
craft. It is the ability to compile product judgment into:

```text
CLI verbs -> generated or exemplar structure -> local docs -> deterministic checks -> hooks/CI gates
```

For UI work, this means agents do not invent ad hoc surfaces. They use the
design system, tokens, components, flows, accessibility rules, layout patterns,
and review checks already present in the repo.

For non-UI work, the same idea becomes service boundaries, migration rules,
schema checks, import constraints, job idempotency, observability defaults, and
test gates.

Weak agents should not need taste. They should have a small legal move set.

## Initial Direction

This repo will track research and prototypes around:

- Design-system enforcement for agent-generated UI.
- CLI factories and exemplar-driven workflows for paved-road product and
  engineering work.
- Hooks that block architectural drift.
- Local `AGENTS.md` files that make repo rules discoverable.
- Skills/plugins that encode design-engineer workflows.
- Checkers that turn subjective review into mechanical feedback.
- A verification ledger that records what actually passed, against which tree.
- Escape-hatch accounting as a drift metric.
- Quality-controlled factories for tokens, icons, snapshots, screenshots, and
  other generated artifacts.

## Existing Tools To Build Around

These tools appear complementary rather than direct substitutes:

- Context7: live, version-specific library docs.
- Superpowers: workflow methodology, TDD, planning, subagent development.
- LSP plugins: deterministic symbol navigation and diagnostics.
- Frontend Design: useful design heuristics, but not design-system enforcement.

The missing layer is repo-specific executable architecture.

This repo should extract from working local prior art before inventing new
systems. `palette` and `prettyplease` already contain early versions of the
core idea: design-system checks, token drift gates, change-scoped verification
lanes, hook wiring, warning/error tiers, and explicit `design-ok:` escape
hatches.

## Working Product Idea

Working product: **Design Engineer Harness**.

Example interface:

```bash
designengineer init
designengineer scan
designengineer check changed
designengineer check architecture
designengineer verify ios-verify
designengineer status
designengineer assert ios-verify
designengineer factory list
designengineer factory run tokens
designengineer factory check tokens
designengineer factory preview ios-design-gallery
designengineer explain-rules
```

Generator commands such as `designengineer make component UserMenu` remain a
hypothesis. They should follow evidence that exemplars plus checks are not
enough.

Factories are the narrower proven version of generation: source of truth,
deterministic output, preview surface, and drift check. Existing token, icon,
design-gallery, and screenshot generators in local repos should be extracted
as factories before inventing broad scaffolding.

Example config:

```yaml
ui:
  designSystem: src/design-system
  forbidRawElements:
    - button
    - input
  forbidInlineColors: true

architecture:
  boundaries:
    - from: src/features/*
      disallowImports:
        - src/app/*
        - src/db/raw/*

backend:
  envSchema: src/env/schema.ts
  requireIdempotencyForJobs: true
  requireTestsFor:
    - parsers
    - money
    - auth
    - migrations
```

## First Sequence

1. Extract the design-system checks and lane dispatch patterns from `palette`
   and `prettyplease`.
2. Prototype a local verification ledger on top of an existing repo's
   `make *-verify` targets.
3. Register one existing token or design-gallery workflow as a factory with a
   run command, preview path, check command, and ledger entry.
4. Count escape hatches such as `design-ok:` and report them as drift.
5. Stand up an agentic eval: same tasks, weak model, with and without rails.
6. Revisit broad generators only after the eval shows where exemplars plus checks
   fall short.

The build and validation details live in `docs/validation-plan.md`.

## Position

Use stock agents by default. Add capability tools when they provide facts,
state, or verification. Build repo-local rails for everything else.

The differentiated claim is not "better prompts for better agents."

It is:

```text
Make architecture executable enough that weaker agents can safely operate inside it.
```
