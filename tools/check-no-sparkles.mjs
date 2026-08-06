#!/usr/bin/env node
// designengineer rulepack: no-sparkles
// Bans the "sparkles" / magic-wand AI cliche icon from UI source. Scans tracked
// source, markup, and style files for the sparkle glyph and for the icon-name
// families used across SF Symbols, Material, Lucide/Tabler, Heroicons, Ionicons,
// and Font Awesome. Appends evidence to the local ledger.
//
// Escape hatch: put `sparkles-ok: <reason>` in a comment on the offending line
// or the line directly above it. Escapes are counted and recorded in the ledger.

import { readFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..')
const git = cmd => execSync(`git ${cmd}`, { cwd: repoRoot, encoding: 'utf8' }).trim()

// Files this rulepack scans. Docs/YAML are intentionally excluded so the rule's
// own definition and prose never self-trigger.
const SCAN_EXT = new Set([
  'swift', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'html', 'htm',
  'css', 'scss', 'sass', 'less', 'vue', 'svelte', 'json', 'kt', 'java', 'xml',
])
// The rule's own wiring surface references the tool by name, so it must not
// scan itself: the tool, and package manifests that invoke it.
const EXCLUDE = new Set(['tools/check-no-sparkles.mjs', 'package.json'])

const ESCAPE = /sparkles-ok:/

// Ordered so the most specific label wins. Each pattern is applied per line.
const PATTERNS = [
  { label: 'sparkle glyph', re: /[✨\u{1FA84}]/u },      // ✨  🪄
  { label: 'sparkle icon name', re: /sparkles?/i },          // sparkles, wand.and.sparkles, SparklesIcon, wand-sparkles…
  { label: 'material auto_awesome', re: /\bauto_awesome\b/ }, // Material Symbols "auto_awesome"
  { label: 'material auto_fix (magic wand)', re: /\bauto_fix_(high|normal|off)\b/ },
]

const RULE_ID = 'asset.sparkles-icon'
const FIX = 'Replace the sparkles / magic-wand AI-cliche icon with a purpose-specific glyph (status, spinner, or a domain icon). If it is genuinely intentional, add a `sparkles-ok: <reason>` escape on the line above.'
const EXEMPLAR = 'docs/no-sparkles.md'

const failures = []
let escapes = 0
let filesScanned = 0

const tracked = git('ls-files').split('\n').filter(Boolean)
for (const file of tracked) {
  const ext = file.includes('.') ? file.slice(file.lastIndexOf('.') + 1) : ''
  if (!SCAN_EXT.has(ext) || EXCLUDE.has(file)) continue
  const abs = join(repoRoot, file)
  if (!existsSync(abs)) continue
  filesScanned++
  const lines = readFileSync(abs, 'utf8').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const hit = PATTERNS.find(p => p.re.test(line))
    if (!hit) continue
    const prev = i > 0 ? lines[i - 1] : ''
    if (ESCAPE.test(line) || ESCAPE.test(prev)) { escapes++; continue }
    failures.push({ file, line: i + 1, label: hit.label, snippet: line.trim().slice(0, 120) })
  }
}

for (const f of failures) {
  console.error(`ERROR ${RULE_ID}`)
  console.error(`  file: ${f.file}:${f.line}`)
  console.error(`  detail: ${f.label} — ${f.snippet}`)
  console.error(`  fix: ${FIX}`)
  console.error(`  exemplar: ${EXEMPLAR}`)
}

const entry = {
  check: 'no-sparkles',
  result: failures.length === 0 ? 'pass' : 'fail',
  rules: failures.length ? [RULE_ID] : [],
  files: filesScanned,
  hits: failures.length,
  escapes,
  tree: git('write-tree'),
  worktreeDirty: git('status --porcelain') !== '',
  at: new Date().toISOString(),
  ttl: null,
}
mkdirSync(join(repoRoot, '.designengineer'), { recursive: true })
appendFileSync(join(repoRoot, '.designengineer/ledger.jsonl'), JSON.stringify(entry) + '\n')

if (failures.length > 0) {
  console.error(`\nno-sparkles: ${failures.length} hit(s) across ${filesScanned} file(s)`)
  process.exit(1)
}
console.log(`no-sparkles: ${filesScanned} file(s) clean, ${escapes} escape(s)`)
