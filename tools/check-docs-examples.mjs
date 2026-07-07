#!/usr/bin/env node
// designengineer rulepack: docs-examples
// Validates every ```yaml block in README.md and docs/**/*.md against the
// config/workorder schemas, validates .designengineer/config.yaml itself
// (including exemplar existence), and appends evidence to the local ledger.
//
// Escape hatch: put `<!-- docs-ok: <reason> -->` on the line above a fence to
// skip that block. Escapes are counted and recorded in the ledger.

import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import Ajv2020 from 'ajv/dist/2020.js'

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..')
const rel = p => relative(repoRoot, p)

const ajv = new Ajv2020.default({ allErrors: true })
const configSchema = JSON.parse(readFileSync(join(repoRoot, 'schema/config.schema.json'), 'utf8'))
const workorderSchema = JSON.parse(readFileSync(join(repoRoot, 'schema/workorder.schema.json'), 'utf8'))
const validateConfig = ajv.compile(configSchema)
const validateWorkorder = ajv.compile(workorderSchema)

const CONFIG_KEYS = new Set(['version', 'rulepacks', 'checks', 'factories', 'tiers'])
const WORKORDER_KEYS = new Set(['task', 'scope', 'exemplar', 'done'])

const failures = []
const firedRules = new Set()
let escapes = 0
let blocksChecked = 0

function fail(ruleId, file, line, detail, fix, exemplar) {
  firedRules.add(ruleId)
  failures.push({ ruleId, file, line, detail, fix, exemplar })
}

function ajvDetail(errors) {
  return errors.map(e => `${e.instancePath || '/'} ${e.message}`).join('; ')
}

// --- collect markdown files ---
function mdFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...mdFiles(p))
    else if (entry.endsWith('.md')) out.push(p)
  }
  return out
}
const files = [join(repoRoot, 'README.md'), ...mdFiles(join(repoRoot, 'docs'))]

// --- extract and validate yaml blocks ---
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!/^```yaml\s*$/.test(lines[i])) continue
    const startLine = i + 1
    const block = []
    for (i++; i < lines.length && !/^```\s*$/.test(lines[i]); i++) block.push(lines[i])

    const prev = lines.slice(0, startLine - 1).reverse().find(l => l.trim() !== '') ?? ''
    if (/<!--\s*docs-ok:.+-->/.test(prev)) { escapes++; continue }

    blocksChecked++
    const loc = `${rel(file)}:${startLine}`
    let parsed
    try {
      parsed = yaml.load(block.join('\n'))
    } catch (e) {
      fail('docs.yaml-parse', rel(file), startLine, e.message.split('\n')[0],
        'Fix the YAML syntax in this example block.',
        'docs/research/rulepacks.md')
      continue
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      fail('docs.unknown-example-shape', rel(file), startLine, 'block is not a YAML mapping',
        'Doc YAML examples must be config fragments or work orders, or carry a docs-ok escape.',
        'docs/research/rulepacks.md')
      continue
    }

    const keys = Object.keys(parsed)
    if (keys.every(k => WORKORDER_KEYS.has(k)) && keys.includes('task')) {
      if (!validateWorkorder(parsed)) {
        fail('docs.invalid-example', rel(file), startLine, ajvDetail(validateWorkorder.errors),
          'Match the work-order contract in schema/workorder.schema.json.',
          'schema/workorder.schema.json')
      }
    } else if (keys.every(k => CONFIG_KEYS.has(k))) {
      if (!validateConfig(parsed)) {
        fail('docs.invalid-example', rel(file), startLine, ajvDetail(validateConfig.errors),
          'Match the config contract in schema/config.schema.json.',
          'schema/config.schema.json')
      }
    } else {
      const unknown = keys.filter(k => !CONFIG_KEYS.has(k) && !WORKORDER_KEYS.has(k))
      fail('docs.unknown-example-shape', rel(file), startLine, `unknown top-level keys: ${unknown.join(', ')}`,
        'Use config keys (version/rulepacks/checks/factories/tiers), work-order keys, or add a docs-ok escape above the block.',
        'schema/config.schema.json')
    }
  }
}

// --- validate the repo's own config, including exemplar existence ---
const configPath = join(repoRoot, '.designengineer/config.yaml')
if (existsSync(configPath)) {
  blocksChecked++
  const config = yaml.load(readFileSync(configPath, 'utf8'))
  if (!validateConfig(config)) {
    fail('docs.invalid-example', rel(configPath), 1, ajvDetail(validateConfig.errors),
      'Match the config contract in schema/config.schema.json.',
      'schema/config.schema.json')
  } else {
    if (config.version === undefined) {
      fail('docs.invalid-example', rel(configPath), 1, 'real config must declare version',
        'Add `version: 1` at the top level.', 'schema/config.schema.json')
    }
    for (const [packId, pack] of Object.entries(config.rulepacks ?? {})) {
      for (const [ruleId, rule] of Object.entries(pack.rules ?? {})) {
        if (!existsSync(join(repoRoot, rule.exemplar))) {
          fail('docs.missing-exemplar', rel(configPath), 1,
            `${packId} rule ${ruleId} exemplar not found: ${rule.exemplar}`,
            'Point exemplar at a committed file in this repo.',
            'docs/research/rulepacks.md')
        }
      }
    }
  }
}

// --- report ---
for (const f of failures) {
  console.error(`ERROR ${f.ruleId}`)
  console.error(`  file: ${f.file}:${f.line}`)
  console.error(`  detail: ${f.detail}`)
  console.error(`  fix: ${f.fix}`)
  console.error(`  exemplar: ${f.exemplar}`)
}

// --- ledger evidence ---
function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: repoRoot, encoding: 'utf8' }).trim()
}
const entry = {
  check: 'docs-examples',
  result: failures.length === 0 ? 'pass' : 'fail',
  rules: [...firedRules].sort(),
  blocks: blocksChecked,
  escapes,
  tree: git('write-tree'),
  worktreeDirty: git('status --porcelain') !== '',
  at: new Date().toISOString(),
  ttl: null,
}
mkdirSync(join(repoRoot, '.designengineer'), { recursive: true })
appendFileSync(join(repoRoot, '.designengineer/ledger.jsonl'), JSON.stringify(entry) + '\n')

if (failures.length > 0) {
  console.error(`\ndocs-examples: ${failures.length} failure(s) across ${blocksChecked} block(s)`)
  process.exit(1)
}
console.log(`docs-examples: ${blocksChecked} block(s) valid, ${escapes} escape(s)`)
