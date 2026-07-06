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
CLI verbs -> generated structure -> local docs -> deterministic checks -> hooks/CI gates
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
- CLI generators for paved-road product and engineering work.
- Hooks that block architectural drift.
- Local `AGENTS.md` files that make repo rules discoverable.
- Skills/plugins that encode design-engineer workflows.
- Checkers that turn subjective review into mechanical feedback.

## Existing Tools To Build Around

These tools appear complementary rather than direct substitutes:

- Context7: live, version-specific library docs.
- Superpowers: workflow methodology, TDD, planning, subagent development.
- LSP plugins: deterministic symbol navigation and diagnostics.
- Frontend Design: useful design heuristics, but not design-system enforcement.

The missing layer is repo-specific executable architecture.

## Working Product Idea

Working name: **Agent Rails** or **Repo Harness**.

Example interface:

```bash
agent-harness init
agent-harness scan
agent-harness make component UserMenu
agent-harness make endpoint invoices.create
agent-harness check changed
agent-harness check architecture
agent-harness explain-rules
```

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

## Position

Use stock agents by default. Add capability tools when they provide facts,
state, or verification. Build repo-local rails for everything else.

The differentiated claim is not "better prompts for better agents."

It is:

```text
Make architecture executable enough that weaker agents can safely operate inside it.
```
