# Onboarding And Migration

The harness needs two first-run paths:

- `new`: starting a project from scratch
- `adopt`: integrating into an existing project with partial rules, assets,
  docs, hooks, and design language

The default should be `adopt`. Most valuable projects are not blank. They
already have taste in scripts, Makefiles, docs, screenshots, style guides,
asset catalogs, and local habits. The harness should detect and wrap that
system before inventing anything.

## First-Run Commands

```bash
designengineer init --adopt
designengineer scan
designengineer scan --write .designengineer/proposed-config.yaml
designengineer adopt --from-scan

designengineer init --new
```

`scan` should be read-only by default. It should not install hooks, rewrite
files, promote new blocking rules, or generate assets. It produces an inventory
and a proposed config.

## Existing Project Path

Existing projects get an audit first:

```text
detect -> classify -> propose scope -> wrap -> measure -> promote
```

Detection should look for:

- public entry points: `Makefile`, `package.json`, `justfile`, `Taskfile`,
  `xcodegen`, SwiftPM, npm scripts
- hooks: `.githooks`, `.git/hooks`, `core.hooksPath`, Claude/Codex hooks
- CI: GitHub Actions, Xcode Cloud notes, Vercel/Cloudflare deploy checks
- lint and test tools: SwiftLint, ESLint, Stylelint, Prettier, Vitest, XCTest
- design-system files: `StyleGuide`, `DesignSystem`, `tokens`, `themes`,
  `components`, `gallery`, `catalog`
- asset sources: app icons, brand SVGs, screenshot configs, generated asset
  catalogs, marketing image scripts
- source-of-truth docs: `AGENTS.md`, `CLAUDE.md`, README, style docs,
  `themes/*.instructions.md`
- existing escape hatches: `design-ok:`, `copy-ok:`, rule-specific allow tags
- generated outputs without drift checks
- scripts whose names include `check`, `verify`, `lint`, `design`, `tokens`,
  `icon`, `asset`, `snapshot`, `screenshot`, `gallery`, or `audit`
- workflow guards: existing `git worktree` usage, branch or worktree lease
  registries, editor-tool hooks in `.claude/settings.json` or `.codex/`,
  check-mode environment variables, PR and merge wrapper scripts, branch
  rulesets, and lock files for simulators, devices, ports, or test databases

Workflow guards deserve their own pass because they are usually the widest gap
and the cheapest to close. The scan should report, specifically: whether the
default branch can be committed to directly, whether more than one agent can
write to the same checkout, whether any check is unskippable, and whether any
scarce local resource is selected by name rather than by identity. See
[`workflow-guards.md`](workflow-guards.md) for the contract and the adoption
order.

The scan should classify each finding:

```text
enforced        command is wired to hook or CI
runnable        command exists but is not a gate
prose-only      rule exists only in docs or agent instructions
source-only     source of truth exists but no generated output or check
generated       output exists but freshness is unclear
candidate       close to a rulepack or factory after light normalization
detected-deferred useful signal, but outside the current adoption scope
unmanaged       known workflow that should not be gated yet
unknown         human review needed
```

The product should then suggest the smallest safe moves:

1. Wrap existing checks as rulepacks.
2. Add ledger recording.
3. Add rule IDs and taught failures.
4. Count escape hatches.
5. Add drift checks for generated outputs.
6. Move fast checks to pre-commit.
7. Move slow checks to pre-push or CI.
8. Promote WARN to ERROR only after the repo is clean.
9. Install the workflow guards in the order given in `workflow-guards.md`,
   starting with the hook path and a default-branch refusal.

For an existing project, the first win is not adding rules. The first win is
making current rules visible, runnable, and measurable.

The one exception is writer isolation. Refusing commits on the default branch
and giving each agent its own leased worktree adds no rules to the code and
prevents a class of loss that no amount of later measurement can undo, so it
can go in before the inventory is complete.

## PR Scope Hygiene

Adoption must also protect PR scope. A scanner will often find useful but
unrelated work: generated app icons, brand asset scripts, new preview surfaces,
or app files changed by another workflow. Those findings should be reported,
not silently adopted.

`designengineer scan` should separate:

```text
included            files the adoption PR should create or modify
detected-deferred   useful findings left out of this PR
unmanaged           workflows intentionally not gated
unrelated-dirty     local changes the harness must not stage
```

`designengineer adopt --from-scan` should stage only `included` files. A
`--verify-scope` pass should fail when:

- a registered factory references an untracked source or preview file
- a rule `exemplar:` path is missing or untracked
- generated asset outputs are staged without their source and check
- unrelated dirty files enter the adoption commit

This is the practical difference between `detected` and `adopted`.

## New Project Path

New projects should get a thin paved road, not a large framework.

Suggested files:

```text
.designengineer/config.yaml
.githooks/pre-commit
.githooks/pre-push
AGENTS.md
docs/design-system.md
themes/colors.instructions.md
themes/fonts.instructions.md
themes/ui-common-elements.instructions.md
scripts/design-system-check.sh
scripts/copy-style-check.sh
scripts/worktree.sh
```

The new-project path should ask for stack and product shape, then create only:

- a minimal style formula
- one fast copy-style rulepack
- one design-system rulepack
- one verification command
- one example factory candidate if the stack has generated assets or tokens
- writer isolation: the hook path, a default-branch refusal, and the worktree
  lease verbs

Writer isolation is the one guard a blank repo should get on day one, because
retrofitting it means retrofitting every agent's habits. The rest of
`workflow-guards.md` (lanes, admission, merge queue, resource leases) waits
until the project has a remote, real pull requests, or more than one agent.

It should avoid broad component generators until telemetry shows repeated
failure that exemplars and checks do not solve.

## Migration Ladder

Projects with a design language but weak enforcement should move up this
ladder:

1. **Inventory**: scan current hooks, scripts, docs, assets, and checks.
2. **Name**: assign stable check IDs and rule IDs.
3. **Scope**: decide which detected findings are included in this PR.
4. **Wrap**: register existing scripts as `rulepack.<id>` or
   `factory.<id>`.
5. **Teach**: add `fix:` and `exemplar:` output to failures.
6. **Measure**: append ledger entries and count escape hatches.
7. **Gate**: wire fast checks to pre-commit, slow checks to pre-push or CI.
8. **Promote**: move WARN rules to ERROR only after data shows they are clean.
9. **Factory**: when the same violation repeats, build a source-to-output
   factory instead of adding more prose.
10. **Isolate and admit**: install the workflow guards, ending with an
    unskippable remote gate. See `workflow-guards.md`.

This lets mature repos keep momentum. The harness starts as an observability
and wrapping layer, then earns the right to block.

Steps 1 through 9 run on the rule ladder; step 10 runs on the workflow ladder
and is independent of it. A repo with no rules at all still benefits from
writer isolation, and a repo with excellent rules still loses work without it.

## First Screen

The NUX should show a short report:

```text
Found:
  5 Make targets that look like checks
  2 git hooks
  3 design-system source folders
  1 token generator without preview
  14 prose-only rules in AGENTS.md
  3 escape-hatch markers
  0 workflow guards: main accepts direct commits, no worktree leases,
    simulator selected by name, no unskippable remote check

Recommended:
  wrap make ios-design-check as rulepack.ios-design
  wrap scripts/ios/no-em-dash-check.sh as rulepack.copy-style
  add ledger evidence for make ios-verify
  leave all new rules as WARN
  install workflow.writer-isolation: hook path + main refusal (2 files)

Deferred:
  detected app icon asset workflow, not included in this PR
  detected design dashboard preview, missing committed snapshot check
  ignored unrelated dirty app files
```

Every recommendation should include:

- command it will run
- files it will touch
- latency class
- whether it blocks
- how to undo or disable it

The product promise is seamless adoption: detect first, wrap what exists,
avoid ceremony for humans, and make agents prove claims with local evidence.
