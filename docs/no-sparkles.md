# no-sparkles rulepack

Bans the four-pointed "sparkles" glyph and its magic-wand siblings — the default
AI-"generating" cliche icon — from UI source. It has become visual boilerplate:
it signals "AI did something here" without saying *what*, and every product
reaches for the same mark. A design engineer picks an icon that names the action.

## What it catches

- The glyph itself: `✨` (U+2728) and `🪄` (U+1FA84).
- Icon-name families, case- and separator-insensitive on the `sparkle` stem:
  - **SF Symbols**: `sparkles`, `sparkle`, `wand.and.sparkles`, `sparkles.rectangle.stack`
  - **Lucide / Tabler**: `Sparkles`, `wand-sparkles`, `IconSparkles`
  - **Heroicons**: `SparklesIcon`
  - **Ionicons**: `sparkles-outline`
  - **Font Awesome**: `fa-wand-magic-sparkles`, `fa-sparkles`
- **Material Symbols**: `auto_awesome`, `auto_fix_high` (the material spelling of
  the same idea).

## Enforcement

Scoped to source, markup, and style files (Swift, TS/JS, HTML, CSS, Vue, Svelte,
Kotlin, Java, XML, JSON). Docs and YAML are excluded so the rule's own definition
never self-triggers. Wired to `make check` and the pre-commit hook.

```yaml
rulepacks:
  no-sparkles:
    check: node tools/check-no-sparkles.mjs
    latency: pre-commit
    escape: sparkles-ok
    rules:
      asset.sparkles-icon:
        severity: error
        fix: Replace the sparkles / magic-wand AI-cliche icon with a purpose-specific glyph.
        exemplar: docs/no-sparkles.md
```

## Escape hatch

When the sparkle really is the right mark (e.g. a literal "celebration"
affordance, not an AI action), put `sparkles-ok: <reason>` in a comment on the
offending line or the line directly above it. Escapes are counted in
`.designengineer/ledger.jsonl` so drift stays visible.

```swift
// sparkles-ok: confetti burst on streak completion, not an AI action
Image(systemName: "sparkles")
```

## Suggested replacements

| Instead of a sparkle for… | Use |
| --- | --- |
| A generate / compose action | the action's own verb icon (`pencil`, `wand.and.rays` is still a wand — avoid; prefer `square.and.pencil`) |
| Work in progress | a spinner / progress indicator |
| A suggestion or tip | `lightbulb` |
| A model / assistant surface | your product's own assistant mark |
