# Rulepacks: Taste Compiled Into Checks

Rulepacks are the easiest way to bake local quality control into the harness.
They are not a new lint framework. They are a contract around existing scripts
so hooks, agents, work orders, and the verification ledger can use them
consistently.

```text
repo taste -> rulepack config -> existing script -> taught failure -> ledger evidence
```

This is the right abstraction for rules like:

- no em dash characters in product repos
- no raw colors outside the style guide
- no raw fonts or spacing values
- no ad hoc assets outside the declared visual formula
- no unregistered design-system components
- no generic or off-brand copy

The rulepack does not replace the repo's script. It names it, scopes it,
standardizes output, and records evidence.

## Contract

```yaml
rulepacks:
  copy-style:
    check: make copy-style-check
    latency: pre-commit
    escape: copy-ok
    rules:
      copy.no-em-dash:
        severity: error
        fix: Use ASCII punctuation or split the sentence.
        exemplar: docs/copy-style.md
        scope:
          include:
            - "**/*.swift"
            - "**/*.md"
            - "**/*.html"
            - "**/*.ts"
            - "**/*.tsx"
          exclude:
            - "**/build/**"
            - "**/DerivedData/**"
            - "**/node_modules/**"

  ios-design-system:
    check: make ios-design-check
    latency: pre-commit
    escape: design-ok
    rules:
      design.raw-color:
        severity: error
        fix: Use semantic color tokens from the style guide.
        exemplar: Shaba/UI/StyleGuide/Colors.swift
      design.raw-font:
        severity: warn
        fix: Use semantic type tokens.
        exemplar: Shaba/UI/StyleGuide/Typography.swift

  palette-asset-style:
    check: make asset-style-check
    latency: explicit
    escape: asset-ok
    rules:
      asset.palette-soft-modular:
        severity: error
        fix: Use the Palette soft modular object formula.
        exemplar: themes/ui-common-elements.instructions.md
```

Minimum fields:

- `check`: command the repo already knows how to run
- `latency`: `pre-commit`, `pre-push`, `ci`, or `explicit`
- `rules`: stable rule IDs for telemetry and work orders
- `fix`: remediation text emitted when the rule fails
- `exemplar`: a concrete local file to copy from
- `escape`: optional escape-hatch marker that is counted

## Output Shape

Every blocking failure should be teachable:

```text
ERROR copy.no-em-dash
  file: README.md:20
  fix: Use ASCII punctuation or split the sentence.
  exemplar: docs/copy-style.md
```

Warnings can use the same shape without blocking.

The harness should parse rule IDs from output when possible. If an existing
script cannot emit structured output yet, the first wrapper can map its command
to a coarse rule ID such as `ios-design` and improve precision later.

## Aggregate Checks

Some repos have one fast script that enforces several rulepacks. Do not split
that into repeated executions just to get cleaner names. Register the script as
an aggregate check and let one pass freshen narrower rulepack entries:

```yaml
checks:
  ios-design:
    kind: aggregate
    command: make ios-design-check
    freshens:
      - rulepack.ios-design-system
      - rulepack.content-copy
      - rulepack.ios-architecture
```

This keeps the local loop fast while giving work orders and reports precise
rulepack names.

## Exemplar Integrity

Every `exemplar:` path emitted by a rule must exist and be committed or staged
in the same adoption scope. A failure that points to an untracked preview file
is worse than no exemplar because weak agents will copy from unstable context.

Add a meta-check:

```bash
designengineer check exemplars
```

It should fail when an exemplar path is missing, ignored, untracked, or outside
the current PR scope.

## Existing Local Prior Art

### Shaba copy style

`~/shaba/scripts/ios/no-em-dash-check.sh` is the smallest proven rulepack
candidate:

- scans the repo with `git grep`
- runs in `.githooks/pre-commit`
- is exposed through `make lint`
- finishes fast enough to be invisible

It needs only small normalization before extraction:

- add rule ID `copy.no-em-dash`
- add `fix:` output
- decide whether `copy-ok:` is allowed
- record failures and escape hatches in the ledger

### Palette, Shaba, and PrettyPlease design systems

The design-system checks already enforce the high-value category:

- raw color construction
- raw system hues
- raw fonts
- raw radius and spacing
- unregistered components
- cross-target palette drift

These should become repo-specific rulepacks first, not a shared universal
design linter. The shared part is the contract: rule IDs, severity, scopes,
fix guidance, exemplars, escape-hatch accounting, and ledger evidence.

### Palette asset style formula

Palette has a stronger primitive than "generate assets." It has a style
formula for future assets:

- `themes/colors.instructions.md`
- `themes/fonts.instructions.md`
- `themes/ui-common-elements.instructions.md`
- reference images under `themes/`
- token generation through `scripts/www/build-tokens.mjs`
- icon output through `scripts/ios/generate-app-icons.sh`

This is a design-engineer factory input. Future asset factories should consume
the style formula as source material, render outputs deterministically where
possible, expose a preview, and check drift or approval status.

The enforceable claim is not "agents know the Palette style." The claim is:

```text
Palette style lives in files, factories consume those files, and rulepacks
block assets or UI that ignore them.
```

## Adoption Path

1. Keep the existing script.
2. Register it in `.designengineer/config.yaml` as a rulepack.
3. Add stable rule IDs.
4. Add `fix:` and `exemplar:` output.
5. Verify all exemplars are committed or staged.
6. Add escape-hatch counting.
7. Wire fast rulepacks to pre-commit.
8. Wire slow rulepacks to pre-push, CI, or explicit `verify`.
9. Record every run in `.designengineer/ledger.jsonl`.

This preserves the dopamine loop: the user keeps the Makefile target and the
fast hook, while agents gain a mechanical contract.

## Product Implication

`designengineer init` should not install a big opinionated rule set by default.
It should scan for existing hooks and Makefile targets, then offer to wrap them:

```bash
designengineer scan
designengineer add-rulepack copy-style --check "make lint"
designengineer add-rulepack ios-design-system --check "make ios-design-check"
designengineer verify rulepack.copy-style
designengineer report rules
```

Stock repos stay stock. High-quality repos get their existing taste compiled
into a reusable, measurable interface.
