# Reuse Map: palette, shaba, and prettyplease

These repos already contain embryonic versions of the harness. The risk for
this repo is not ideation; it is staying a thesis repo while the working
machinery sits unextracted next door. Extract, don't invent.

## Highest-value extractions (in order)

### 1. Design-system and taste checks (the proven core)

- `~/palette/scripts/ios/design-system-check.sh` (167 lines, rg+awk):
  bans raw SwiftUI fonts/colors/radii/materials/Button/List, forces
  `Palette*` tokens/components, and enforces gallery-catalog registration.
  Escape hatch: `palette-design-system: allow-system-button`.
- `~/palette/scripts/www/design-audit*.{sh,mjs}`: stylelint token-prefix
  enforcement + JSX inline-style guard. Same rule, web flavor.
- `~/prettyplease/scripts/ios/design-system-check.sh`: two-tier ERROR/WARN
  model with `// design-ok: <reason>` escape hatch and a cross-target
  palette-parity check (shield extension hexes must exist in Colors.swift).
- `~/shaba/scripts/ios/design-system-check.sh`: compact PrettyPlease-derived
  design-system check for colors, system hues, fonts, and radii.
- `~/shaba/scripts/ios/no-em-dash-check.sh`: a tiny copy-style guard wired
  into `.githooks/pre-commit` and `make lint`.

Generalization target: `designengineer check design` driven by config, with
the ERROR/WARN split and named escape hatches from prettyplease. Better
generalization target: `designengineer verify rulepack.<id>`, where design,
copy, architecture, and asset-style rules use the same contract.

### 2. Token factory candidate with drift check

- `~/palette/scripts/www/build-tokens.mjs` (433 lines, zero-dep): parses
  `themes/*.md` markdown tables → generates `tokens.css`/`tokens.ts`;
  `make www-tokens-check` diffs generated vs committed.

This is the "compile judgment into artifacts" pattern working end to end:
markdown source of truth → generated code → drift gate.

Better label: token factory candidate. It has a source of truth, generated
outputs, and a freshness check. It needs a declared preview path before the
repo should call it a full factory.

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
- `~/palette/themes/*.instructions.md`: Palette's style formula for future
  colors, fonts, common UI elements, and asset treatment. This is source
  material for token and asset factories, not prose to keep in agent memory.

Generalization target: `designengineer factory *`, not a generic scaffold
generator. The harness should declare each factory's source, outputs, run
command, check command, preview path, and ledger invalidation mode. Factory
checks should use check IDs such as `factory.web-tokens` and write the same
ledger entries as `designengineer verify`.

### 7. Process-owned exclusive resource leases

- `~/shaba/scripts/ios/simulator-lease.sh`: macOS `lockf` plus a
  non-restarting launchd holder, binding a simulator UDID to the owning Codex,
  Claude, or terminal process. Guarded Make targets assert ownership; the lease
  disappears after the owner exits, with no manual unlock step.
- `~/shaba/Makefile`: makes simulator selection explicit and puts the lease
  assertion directly in every simulator-mutating target.

This was extracted after parallel agents selected different iPhone 17
simulators and installed into each other's sessions. The generalized prototype
is `tools/resource-lease.sh`, with lifecycle coverage in
`tools/test-resource-lease.sh`. The stable identity can represent a simulator,
physical device, port, test database, or any other exclusive local resource.

`shaba` has since moved past the prototype's fixed single identity to a pool:
per-worktree affinity, reuse of an already-booted free device before booting
another, TTL expiry with a keepalive heartbeat, one warm spare, and reaping of
surplus free devices. The lock is still one per UDID; only allocation changed.
`tools/resource-lease.sh` does not implement the pool form yet, so pool
behavior is a documented contract with working prior art, not a shipped
prototype. See `docs/resource-leases.md`.

### 8. Workflow guards: writer isolation, lanes, and admission

The largest unextracted block, and the one with no equivalent anywhere else in
the local prior art:

- `~/shaba/scripts/worktree.sh`: the lease registry. Records path, branch,
  owner, and creation time under the common git directory; refuses commits on
  the default branch; refuses work in a worktree owned by another agent; caps
  active managed worktrees; closes only clean merged worktrees and preserves
  branches that still own an open child PR.
- `~/shaba/scripts/claude-worktree-guard.sh`: a `PreToolUse` hook that denies
  `Edit`/`Write`/`NotebookEdit` into an unleased or foreign worktree. Fails
  open for targets it cannot place in the repository, fails closed once it can.
  Documents its own bypass surface (shell writes) rather than overclaiming.
- `~/shaba/.githooks/pre-commit`, `pre-push`, and `HATCH_CHECK_MODE`: named
  check lanes. The default lane runs the workflow guards and nothing else; the
  slow lane is opt-in per push.
- `~/shaba/.github/workflows/lightning.yml`: admission as a named remote check,
  running lint with the PR base SHA as ratchet base, plus guard tests, docs,
  and naming gates.
- `~/shaba/scripts/merge-queue.sh`: stack-aware serialization, child retarget
  before branch deletion, interrupted-retarget repair, and retry when another
  agent merges first.
- `~/shaba/scripts/open-pr.sh` and `scripts/github-enforce.sh`: wrapping the PR
  verb so a provider defect is routed around in one place, and keeping branch
  protection as a checked-in verb instead of console state.
- `~/shaba/scripts/ios/swift-source-size-check.sh`: the ratchet severity.
  Touched files already over the soft limit may not grow; the hard limit blocks
  outright; the base ref arrives by environment so local and CI differ.
- `~/shaba/scripts/*-test.sh` behind `make workflow-test`: every guard has a
  test that asserts the denial, and admission runs them.

Generalization target: `docs/workflow-guards.md` states the contract and the
`workflow:` config block. The harness verbs (`designengineer wt`,
`designengineer lane`, `designengineer admit`) are not designed yet, and should
not be until the contract has been adopted into a second repo by hand.

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
