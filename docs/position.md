# Initial Position

The best way to scale agents is to stop treating them as autonomous senior
engineers and start treating the repo as an executable operating system.

The senior engineer's job is not to write better prompts. It is to compile
judgment into:

```text
CLI verbs -> generated or exemplar structure -> local docs -> deterministic checks -> hooks/CI gates
```

That is the architecture that lets smart agents scale work out to weaker
agents.

## Hooks Are Not The Whole System

Hooks matter, but hooks are the last line of defense. The better system makes
the correct move obvious before the hook fires.

The hierarchy should be:

1. Paved road: exemplars and, where proven useful, `pnpm make component`,
   `pnpm make endpoint`, `pnpm make migration`, `pnpm make job`.
2. Repo-local law: `AGENTS.md`, folder `AGENTS.md`, architecture maps,
   design-system rules, ownership boundaries.
3. Executable enforcement: ESLint/import boundaries, AST checks, schema checks,
   design-token checks, test requirements, migration rules.
4. Fast feedback: `pnpm agent-check changed`, `pnpm test:related`,
   `pnpm check:architecture`.
5. Agent orchestration: work orders, subagents, review gates, red/green loops,
   evidence before done.

A weak agent should not need taste. It should have a small legal move set.

## Correction From Local Prior Art

The first version of this repo was too abstract. `palette` and `prettyplease`
already contain working pieces of the thesis:

- Design-system checks that ban raw UI controls, colors, fonts, radii, and
  unregistered design-system components.
- Token generation from human-readable sources plus drift checks.
- Change-scoped lane detection that dispatches verification only to affected
  app areas.
- Hook wiring for pre-commit and pre-push checks.
- A two-tier ERROR/WARN design audit.
- Explicit `design-ok:` escape hatches for intentional rule breaks.

That means the next move is extraction and generalization, not more greenfield
design.

## Existing Tools

Context7 is a real win, but it solves live library knowledge, not architecture
enforcement.

Superpowers is the closest overlap. It targets brainstorming, planning,
red/green TDD, subagent-driven development, debugging, and code review. That is
close to "senior directs E3s." But it is still mostly a methodology layer, not
a repo-specific rule compiler.

Anthropic LSP plugins are low-risk, high-signal. They add deterministic symbol
intelligence: go-to-definition, references, diagnostics. That is exactly the
kind of capability agent systems need.

Frontend Design is useful taste guidance, but it is not enough for
design-system enforcement. It can improve output quality, but it does not
guarantee that all UI goes through the system's components.

Ponytail has a useful YAGNI instinct, but it should not be global. Its lesson
belongs in repo rules, not permanent agent personality.

## The Gap

There is room for a plugin or library, but it should not compete with Context7
or Superpowers.

The missing thing is:

```text
A repo harness compiler for agents.
```

Working name: **Agent Rails** or **Repo Harness**.

It would generate and enforce project-specific rails:

```bash
agent-harness init
agent-harness scan
agent-harness check changed
agent-harness check architecture
agent-harness verify ios-design
agent-harness status
agent-harness assert ios-design
agent-harness explain-rules
```

Generator commands such as `agent-harness make component UserMenu` are not yet
proven. The local repos do not contain them. The honest claim is weaker and
more testable: exemplars plus checks may deliver most of the value; generators
should be added only when evals show repeated failures that scaffolding would
prevent.

The plugin layer should be thin:

```text
skills/
  architecture-workorder
  create-generator
  add-guardrail
  fix-guardrail-failure

hooks/
  post-edit: agent-harness check changed
  pre-commit: agent-harness check staged
```

The library layer should be thick: AST checks, import rules, generators, config
schema, examples.

## Verification Ledger

"Evidence before done" needs a local artifact, not a transcript claim.

Proposed primitive:

```bash
agent-harness verify <check> [--scope changed]
agent-harness status
agent-harness assert <check>
```

Each verify run appends to a local `.agent-harness/ledger.jsonl`:

```json
{"check":"ios-verify","tree":"<hash>","result":"pass","at":"2026-07-06T18:40:00Z","ttl":null}
{"check":"staging-smoke","tree":null,"result":"pass","at":"2026-07-06T18:41:00Z","ttl":"4h"}
```

Deterministic checks should be invalidated by input hash, not time. Lint,
build, typecheck, and unit-test results decay with edits. Environment-coupled
checks should use TTLs because the world changes underneath them: staging
smoke, device runs, screenshot approval, dependency audits, and external API
contracts.

Weak agents benefit because "done" becomes mechanical. A hook or reviewer can
ask the ledger what passed against the current tree.

## Measurement Requirement

The repo needs an agentic benchmark before it makes strong claims:

- same tasks
- weak model
- with and without rails
- measure check-pass rate, retries, diff size, elapsed time, and escape-hatch
  count

The ponytail benchmark story is the warning: attractive claims are cheap until
there is a fair baseline.

## Design Engineer Anchor

The "design engineer" angle matters because design-engineering quality is the
clearest example of taste becoming infrastructure.

Bad agent UI happens when agents are free to invent:

- raw controls
- one-off colors
- arbitrary spacing
- page-specific forms
- isolated modals
- bespoke loading/error states
- inaccessible interactions

Good agent UI happens when the repo only permits:

- system components
- design tokens
- approved layout primitives
- typed component variants
- generated page scaffolds
- accessibility checks
- visual regression checks

The same pattern applies outside UI. Architecture is also a design system.

## Immediate Roadmap

1. Extract `palette` and `prettyplease` design checks into a generic harness
   prototype.
2. Extract `palette` lane dispatch into `agent-harness check changed`.
3. Build the verification ledger against existing `make *-verify` targets.
4. Add escape-hatch counting.
5. Run an eval before adding generators or publishing plugin claims.

## Final Opinion

Use stock agents by default. Add Context7, LSP, and maybe Superpowers. Then
build the missing repo-local harness.

The differentiated claim is not "better prompts for better agents."

It is:

```text
Make architecture executable enough that weaker agents can safely operate inside it.
```
