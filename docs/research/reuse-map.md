# Reuse Map: palette and prettyplease

Both repos already contain embryonic versions of the harness. The risk for
this repo is not ideation; it is staying a thesis repo while the working
machinery sits unextracted next door. Extract, don't invent.

## Highest-value extractions (in order)

### 1. Design-system checks (the proven core)

- `~/palette/scripts/ios/design-system-check.sh` (167 lines, rg+awk):
  bans raw SwiftUI fonts/colors/radii/materials/Button/List, forces
  `Palette*` tokens/components, and enforces gallery-catalog registration.
  Escape hatch: `palette-design-system: allow-system-button`.
- `~/palette/scripts/www/design-audit*.{sh,mjs}`: stylelint token-prefix
  enforcement + JSX inline-style guard. Same rule, web flavor.
- `~/prettyplease/scripts/ios/design-system-check.sh`: two-tier ERROR/WARN
  model with `// design-ok: <reason>` escape hatch and a cross-target
  palette-parity check (shield extension hexes must exist in Colors.swift).

Generalization target: `designengineer check design` driven by config, with
the ERROR/WARN split and named escape hatches from prettyplease.

### 2. Token generator with drift check

- `~/palette/scripts/www/build-tokens.mjs` (433 lines, zero-dep): parses
  `themes/*.md` markdown tables → generates `tokens.css`/`tokens.ts`;
  `make www-tokens-check` diffs generated vs committed.

This is the "compile judgment into artifacts" pattern working end to end:
markdown source of truth → generated code → drift gate.

Better label: token factory. It has a source of truth, generated outputs, and
a freshness check.

### 3. Lane dispatch (change-scoped verification)

- `~/palette/tools/lanes/detect.sh` + `dispatch.sh`: map changed files to a
  lane (ios/server/www), dispatch verify/lint/build/test to just that lane.
- `.githooks/pre-commit` + `pre-push` in both repos consume it.

This is the substrate for `designengineer check changed` and for the
verification ledger (see `verification-ledger.md`).

### 4. Gallery-catalog enforcement

- `~/palette/apps/ios/Palette/UI/DesignSystem/Gallery/PaletteDesignSystemCatalog.swift`
  plus the check that every component registers there.

"Every legal move is enumerated and demo'd" — exactly the small-legal-move-set
claim, already enforced mechanically.

### 5. CI template

- `~/palette/.github/workflows/server-ci.yml`: minimal Actions wiring for
  `make *-verify` gates. prettyplease has no CI; hooks-only enforcement dies
  on `--no-verify`.

### 6. Quality-controlled factories

- `~/palette/scripts/ios/design-system-gallery.sh`: simulator-backed design
  system gallery render that writes
  `build/ios-design-system-gallery/index.html` and component images.
- `~/palette/scripts/ios/generate-app-icons.sh`: validates a square source
  image, generates AppIcon sizes, hero assets, and asset-catalog metadata.
- `~/prettyplease/scripts/ios/render-brand-assets.sh`: renders iOS/web brand
  assets from a single brand definition.
- `~/prettyplease/PrettyPleaseTests/PrettyIconVisualGeometryTests.swift`:
  rasterizes the app icon and checks geometry so icon regressions are
  mechanical failures.
- `~/prettyplease/scripts/marketing/appshot`: config-driven App Store
  screenshot renderer.

Generalization target: `designengineer factory *`, not a generic scaffold
generator. The harness should declare each factory's source, outputs, run
command, check command, preview path, and ledger invalidation mode.

## What NOT to carry over

- `~/prettyplease/CLAUDE.md` (362 lines of prose rules) is the anti-pattern
  by this repo's own thesis. Much of it (the sleep ban, style rules) should
  compile down to hooks and lint rules, not travel as instructions.
- The themes/*.md table format is fine for palette but should not be the
  harness's required token source; accept any source, require the drift check.

## Gaps neither repo covers (honest scoreboard for the thesis)

- No scaffold generators (`make component` does not exist anywhere). The
  "CLI verbs → generated structure" leg of the thesis has zero prior art in
  our own repos. The proven local pattern is narrower: quality-controlled
  factories for tokens, icons, galleries, and screenshots.
- No import/architecture boundary checks (buy: dependency-cruiser or
  eslint-plugin-boundaries for TS; SwiftLint custom rules → SwiftSyntax for
  real Swift AST).
- No escape-hatch accounting: `design-ok:` markers accumulate silently.
  `designengineer check drift` should count and report them.
- No measurement. See eval note below.

## Eval requirement (the ponytail lesson)

Every claim this repo makes needs an agentic benchmark before it ships as a
recommendation: same tasks, weak model (Haiku-class), with/without rails;
measure check-pass rate, diff size, escape-hatch count, retries. The corrected
ponytail benchmarks are the template for honest reporting.
