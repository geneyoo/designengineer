# Factory Patterns: Generated Quality With Checks

The local repos already contain a stronger pattern than "generators." They
contain factories: repeatable asset or UI production paths with quality control
baked in.

Generator alone means "make files."

Factory means:

```text
source of truth -> deterministic render/build -> preview surface -> drift check -> ledger evidence
```

That distinction matters for this repo because generators remain a hypothesis.
Factories are a narrower, better-evidenced claim: generation is worth it when
the generated output also has a cheap way to inspect, verify, and reject drift.

## Factory Test

A generator qualifies as a full factory only when it has:

- Source of truth: one declared place the human edits.
- Deterministic output: generated files are reproducible.
- No silent hand edits: generated files either stay out of git or have a drift
  check.
- Preview surface: a dashboard, gallery, screenshot, or rendered artifact a
  human can inspect quickly.
- Quality gate: a check that can fail with a fix and exemplar.
- Ledger record: the harness can record that the factory output is fresh for a
  tree hash, a tree hash plus environment fingerprint when rendering depends
  on runtime, or approved under a TTL when human taste is involved.

If any of those are missing, call it a factory candidate and make
`factory status` show the missing criterion. Do not call it a proven factory
until all criteria are satisfied.

## Local Prior Art

### Palette Web Tokens: First Factory Candidate

Source of truth:

- `~/palette/themes/*.instructions.md`

Generator:

- `~/palette/scripts/www/build-tokens.mjs`

Outputs:

- `~/palette/www/src/ui/tokens.css`
- `~/palette/www/src/ui/tokens.ts`

Quality control:

- generated-file headers say not to hand edit
- `make www-tokens-check` catches drift
- token tests ensure the generated artifacts stay coherent

Current gap:

- no dedicated preview surface is documented with the token converter itself

Product lesson:

This is the right first implementation target because it is fast, deterministic,
zero-dependency, and already has a drift check. It is still a factory candidate
until it is linked to a preview surface, such as a web style guide, token
dashboard, or generated token panel.

### Palette Design-System Gallery Factory

Source of truth:

- `~/palette/apps/ios/Palette/UI/DesignSystem/Gallery/PaletteDesignSystemCatalog.swift`

Generator:

- `~/palette/scripts/ios/design-system-gallery.sh`

Outputs:

- `~/palette/build/ios-design-system-gallery/index.html`
- rendered component images under
  `~/palette/build/ios-design-system-gallery/images/`

Quality control:

- simulator-backed snapshot rendering through
  `PaletteDesignSystemGallerySnapshotTests`
- catalog registration is enforced by the design-system check
- docs drift can be checked through the design-system docs target
- ledger freshness must include an environment fingerprint, not only a tree
  hash, because Xcode and simulator runtime changes affect renders

Product lesson:

The gallery turns "use the design system" from prose into a visible inventory
of legal moves. Weak agents can copy the catalog; humans can review the
rendered result. It is the more design-specific factory, but it should be the
second factory after web tokens because its invalidation model is harder.

### Palette App Icon Factory

Source of truth:

- `~/palette/wip_assets/palette-app-icon-1024.png`

Generator:

- `~/palette/scripts/ios/generate-app-icons.sh`

Outputs:

- iOS AppIcon PNG sizes and `Contents.json`
- hero image assets

Quality control:

- source image must exist and be square
- generated sizes are deterministic
- asset catalog metadata is generated alongside the PNGs

Product lesson:

Even a simple asset resizer becomes safer when it owns validation and metadata
instead of leaving agents to manually create many image sizes.

### PrettyPlease Brand/Icon Factory

Source of truth:

- `~/prettyplease/scripts/ios/render-brand-assets.sh`
- brand colors and icon geometry used by the app style system

Generator:

- `make ios-render-brand`

Outputs:

- iOS app icon assets
- web app icon assets
- launch and marketing brand assets

Quality control:

- generated assets are rendered from one brand definition
- `PrettyIconVisualGeometryTests` rasterizes the icon and checks geometry
- design-system checks enforce cross-target palette parity

Product lesson:

Icon quality can be tested mechanically. The test does not decide taste, but
it catches regressions in bounds, centering, and palette consistency.

### PrettyPlease App Screenshot Factory

Source of truth:

- `~/prettyplease/marketing/app-store-screenshots/prettyplease.json`
- captured app screenshots and brand assets

Generator:

- `~/prettyplease/scripts/marketing/appshot`
- `make app-store-screenshots`

Outputs:

- generated App Store screenshot PNGs

Quality control:

- config-driven composition
- fixed output dimensions
- generated outputs stay out of git

Product lesson:

This belongs in the TTL class of the verification ledger. The render can be
deterministic for a tree, but the final approval is taste- and market-coupled,
so the ledger should record screenshot approval with a human timestamp and
expiry.

## Product Implication

Design Engineer Harness should treat factories as a first-class primitive:

```bash
designengineer factory list
designengineer factory run web-tokens
designengineer factory check web-tokens
designengineer factory preview design-system
designengineer factory status
designengineer verify factory.web-tokens
```

`factory check <id>` is an alias for `verify factory.<id>`. Factories must not
create a parallel verification system.

The harness should not assume every repo needs scaffolding generators. It
should discover or declare factories that already exist, then standardize:

- where the source of truth lives
- what command regenerates artifacts
- what command checks freshness
- where preview output appears
- what ledger evidence proves the output is current

## Validation Implication

Factory validation needs its own task class in the eval:

- change a design token and verify generated web artifacts update
- add a design-system component and verify gallery registration/rendering
- change an icon source and verify generated asset sizes and geometry checks
- render an app-store screenshot set and record approval evidence

Measures:

- did the weak agent run the right factory command
- did generated artifacts match the source change
- did the preview exist in the expected location
- did the ledger record fresh evidence
- did any generated artifact require manual cleanup
- did `factory check` use the same ledger/assert/status path as `verify`

The bar is not "can an agent make assets." The bar is "can a weak agent use
the factory without knowing the asset rules."
