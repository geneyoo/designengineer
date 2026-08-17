# Onboarding And Migration

The adoption model has two first-run paths:

- `new`: starting a project from scratch
- `adopt`: integrating into an existing project with partial rules, assets,
  docs, hooks, and design language

The default should be `adopt`. Most valuable projects are not blank. They
already have taste in scripts, Makefiles, docs, screenshots, style guides,
asset catalogs, and local habits. The harness should detect and wrap that
system before inventing anything.

The CLI ships the existing-project inventory path. New-project setup remains an
agent-guided contract because stack-specific files should not be generated
before the product and enforcement surface are known.

## First-run commands

```bash
designengineer scan .
designengineer init --adopt .
# equivalent explicit destination:
designengineer scan . --write .designengineer/proposed-config.yaml
```

`scan` is read-only by default. It does not install hooks, rewrite files,
promote blocking rules, or generate assets. `--write` creates only the requested
proposal and refuses to overwrite an existing file.

## Existing Project Path

Existing projects get an audit first:

```text
detect -> classify -> propose scope -> wrap -> measure -> promote
```

The current scanner detects:

- public entry points: `Makefile`, `package.json`, `justfile`, `Taskfile`,
  `xcodegen`, SwiftPM, npm scripts
- committed `.githooks`, the active `core.hooksPath`, and GitHub Actions
- Make and package scripts named like `check`, `verify`, `lint`, or `test`
- design-system files: `StyleGuide`, `DesignSystem`, `tokens`, `themes`,
  `components`, `gallery`, `catalog`
- asset sources: app icons, brand SVGs, screenshot configs, generated asset
  catalogs, marketing image scripts
- source-of-truth docs: `AGENTS.md`, `CLAUDE.md`, README, style docs,
  `themes/*.instructions.md`
- existing `design-ok:`, `copy-ok:`, `docs-ok:`, and `sparkles-ok:` escapes
- generated outputs without drift checks
- scripts and configs whose names suggest checks, tokens, icons, assets,
  screenshots, galleries, or catalogs

It reports signals rather than claiming semantic understanding. An agent still
has to trace which commands are stable, which workflow consumes them, and which
generated files have real source/preview contracts.

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

The report suggests the smallest safe moves:

1. Wrap existing checks as rulepacks.
2. Add ledger recording.
3. Add rule IDs and taught failures.
4. Count escape hatches.
5. Add drift checks for generated outputs.
6. Move fast checks to pre-commit.
7. Move slow checks to pre-push or CI.
8. Promote WARN to ERROR only after the repo is clean.

For an existing project, the first win is not adding rules. The first win is
making current rules visible, runnable, and measurable.

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

There is deliberately no automatic staging command yet. The adopting agent or
human should stage only `included` files and verify manually that:

- a registered factory references an untracked source or preview file
- a rule `exemplar:` path is missing or untracked
- generated asset outputs are staged without their source and check
- unrelated dirty files enter the adoption commit

This is the practical difference between `detected` and `adopted`.

## New project path

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
```

An adopting agent should ask for stack and product shape, then create only:

- a minimal style formula
- one fast copy-style rulepack
- one design-system rulepack
- one verification command
- one example factory candidate if the stack has generated assets or tokens

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

This lets mature repos keep momentum. The harness starts as an observability
and wrapping layer, then earns the right to block.

## Scan output

The CLI prints a short report with this shape:

```text
Found:
  5 Make targets that look like checks
  2 git hooks
  3 design-system source folders
  1 token generator without preview
  14 prose-only rules in AGENTS.md
  3 escape-hatch markers

Recommended:
  wrap make ios-design-check as rulepack.ios-design
  wrap scripts/ios/no-em-dash-check.sh as rulepack.copy-style
  add ledger evidence for make ios-verify
  leave all new rules as WARN

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
