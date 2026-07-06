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
- Rulepacks that wrap repo-specific taste checks like copy style,
  design-system usage, and asset style formulas.
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
systems. `palette`, `shaba`, and `prettyplease` already contain early versions
of the core idea: design-system checks, copy-style gates, token drift gates,
asset style formulas, change-scoped verification lanes, hook wiring,
warning/error tiers, and explicit escape hatches.

## Working Product Idea

Working product: **Design Engineer Harness**.

Example interface:

```bash
designengineer init
designengineer init --adopt
designengineer init --new
designengineer scan
designengineer check changed
designengineer check architecture
designengineer verify ios-verify
designengineer verify factory.web-tokens
designengineer status
designengineer assert ios-verify
designengineer factory list
designengineer factory run web-tokens
designengineer factory check web-tokens
designengineer factory preview ios-design-gallery
designengineer add-rulepack copy-style --check "make lint"
designengineer verify rulepack.copy-style
designengineer explain-rules
```

`designengineer factory check <id>` is sugar for `designengineer verify
factory.<id>`. There is one evidence path: the verification ledger.

Generator commands such as `designengineer make component UserMenu` remain a
hypothesis. They should follow evidence that exemplars plus checks are not
enough.

Factories are the narrower proven version of generation: source of truth,
deterministic output, preview surface, and drift check. Existing token, icon,
design-gallery, and screenshot generators in local repos should be extracted
as factories before inventing broad scaffolding.

Example config:

```yaml
checks:
  ios-design:
    command: make ios-design-system-check
    rules:
      - ios-design.raw-color
      - ios-design.raw-font

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

## Build Sequence

The canonical sequence lives in `docs/validation-plan.md`. README should only
state the product bias: prove the harness in `palette`, register the fast
web-token factory candidate first, add taught failures and work orders before
claiming eval success, then generalize only pieces that improve metrics.

The first-run experience is split in `docs/onboarding.md`: adopt existing
projects by scanning and wrapping their current hooks, scripts, assets, and
style language before adding new rules; start new projects with only a thin
paved road.

## Position

Use stock agents by default. Add capability tools when they provide facts,
state, or verification. Build repo-local rails for everything else.

The differentiated claim is not "better prompts for better agents."

It is:

```text
Make architecture executable enough that weaker agents can safely operate inside it.
```
