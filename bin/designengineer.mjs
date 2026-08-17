#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import Ajv2020 from 'ajv/dist/2020.js'
import yaml from 'js-yaml'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ignoredWalkDirectories = new Set([
  '.git',
  '.build',
  '.next',
  '.swiftpm',
  'build',
  'DerivedData',
  'dist',
  'node_modules',
  'Pods',
  'vendor',
])
const evidenceFile = '.designengineer/ledger.jsonl'

function fail(message, code = 1) {
  console.error(message)
  process.exit(code)
}

function run(executable, args, cwd, options = {}) {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: options.encoding ?? 'utf8',
    env: process.env,
    stdio: options.stdio ?? 'pipe',
  })
  if (result.error) {
    if (options.allowFailure) return result
    throw result.error
  }
  if (result.status !== 0 && !options.allowFailure) {
    const detail = (result.stderr || result.stdout || '').trim()
    throw new Error(detail || `${executable} exited with ${result.status}`)
  }
  return result
}

function git(root, args, options = {}) {
  return run('git', ['-C', root, ...args], root, options)
}

function repositoryRoot(input = '.') {
  const candidate = resolve(input)
  const result = git(candidate, ['rev-parse', '--show-toplevel'], { allowFailure: true })
  return result.status === 0 ? result.stdout.trim() : candidate
}

function listFiles(root) {
  const tracked = git(
    root,
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { allowFailure: true, encoding: 'buffer' },
  )
  if (tracked.status === 0) {
    return tracked.stdout
      .toString('utf8')
      .split('\0')
      .filter((file) => file && file !== evidenceFile)
      .sort()
  }

  const files = []
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredWalkDirectories.has(entry.name)) continue
      const absolute = join(directory, entry.name)
      if (entry.isDirectory()) walk(absolute)
      else files.push(relative(root, absolute))
    }
  }
  walk(root)
  return files.sort()
}

function readText(root, path, maxBytes = 2_000_000) {
  try {
    const buffer = readFileSync(join(root, path))
    if (buffer.length > maxBytes || buffer.includes(0)) return null
    return buffer.toString('utf8')
  } catch {
    return null
  }
}

function parseMakeTargets(text) {
  if (!text) return []
  const targets = new Set()
  for (const line of text.split('\n')) {
    if (/^[.#\t ]/.test(line) || line.includes(':=')) continue
    const match = line.match(/^([A-Za-z0-9][A-Za-z0-9_.%/-]*(?:\s+[A-Za-z0-9][A-Za-z0-9_.%/-]*)*):(?!=)/)
    if (!match) continue
    for (const target of match[1].split(/\s+/)) {
      if (!target.includes('%')) targets.add(target)
    }
  }
  return [...targets]
}

function checkLike(name) {
  return /(^|[-:])(check|verify|lint|test)$/.test(name)
    || /^(check|verify|lint|test)([-:]|$)/.test(name)
}

function checkPriority(name) {
  const exact = ['check', 'verify', 'lint', 'test']
  const index = exact.indexOf(name)
  return index === -1 ? 10 : index
}

function checkId(name) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return /^[a-z]/.test(normalized) ? normalized : `check-${normalized || 'repository'}`
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function commandIsReferenced(text, check) {
  if (!text) return false
  const makeTarget = check.command.match(/^make '([^']+)'$/)?.[1]
  if (makeTarget) {
    return new RegExp(`\\bmake(?:\\s+-[A-Za-z]+)*\\s+['"]?${regexEscape(makeTarget)}(?:['"\\s]|$)`).test(text)
  }
  const script = check.command.match(/^(?:npm run --silent|pnpm run|yarn|bun run) '([^']+)'$/)?.[1]
  if (script) return new RegExp(`\\b${regexEscape(script)}(?:['"\\s]|$)`).test(text)
  return text.includes(check.command.replaceAll("'", ''))
}

function detectedChecks(root, files) {
  const checks = []
  const usedIds = new Set()
  const add = (id, command, source) => {
    let candidate = checkId(id)
    let suffix = 2
    while (usedIds.has(candidate)) candidate = `${checkId(id)}-${suffix++}`
    usedIds.add(candidate)
    checks.push({ id: candidate, command, source })
  }

  if (files.includes('Makefile')) {
    const targets = parseMakeTargets(readText(root, 'Makefile'))
      .filter(checkLike)
      .sort((left, right) => checkPriority(left) - checkPriority(right) || left.localeCompare(right))
    for (const target of targets.slice(0, 24)) add(target, `make ${shellQuote(target)}`, 'Makefile')
  }

  if (files.includes('package.json')) {
    try {
      const packageJson = JSON.parse(readText(root, 'package.json'))
      const scripts = Object.keys(packageJson.scripts || {})
        .filter((name) => /^[A-Za-z0-9:_-]+$/.test(name) && checkLike(name))
        .sort((left, right) => checkPriority(left) - checkPriority(right) || left.localeCompare(right))
      const runner = files.includes('pnpm-lock.yaml')
        ? 'pnpm run'
        : files.includes('yarn.lock')
          ? 'yarn'
          : files.some((file) => /^bun\.lock/.test(file))
            ? 'bun run'
            : 'npm run --silent'
      for (const script of scripts.slice(0, 24)) {
        if (usedIds.has(checkId(script))) continue
        add(script, `${runner} ${shellQuote(script)}`, 'package.json')
      }
    } catch {
      // Invalid package.json is itself useful scan output, but not a command source.
    }
  }

  if (checks.length === 0) {
    const scripts = files
      .filter((file) => /(^|\/)(check|verify|lint|test)[^/]*\.(?:mjs|js|sh)$/.test(file))
      .slice(0, 24)
    for (const script of scripts) {
      const command = script.endsWith('.sh') ? `bash ${shellQuote(script)}` : `node ${shellQuote(script)}`
      add(script.replace(/\.[^.]+$/, ''), command, script)
    }
  }

  return checks
}

function scanRepository(root) {
  const files = listFiles(root)
  const checks = detectedChecks(root, files)
  const workflows = files.filter((file) => file.startsWith('.github/workflows/'))
  const hooks = files.filter((file) => /^\.githooks\/(pre-commit|pre-push)$/.test(file))
  const guidance = files.filter((file) => /(^|\/)(AGENTS|CLAUDE)\.md$/.test(file))
  const entrypoints = [
    'Makefile',
    'package.json',
    'justfile',
    'Taskfile.yml',
    'project.yml',
    'Package.swift',
  ].filter((file) => files.includes(file))
  const designSystem = files
    .filter((file) => /(^|\/)(StyleGuide|DesignSystem|tokens|themes|components)(\/|\.|$)/i.test(file))
    .slice(0, 20)
  const factoryCandidates = files
    .filter((file) => /(token|app-?icon|brand-?asset|screenshot|appshot|gallery|catalog)/i.test(file))
    .filter((file) => /(script|tool|config|\.json$|\.ya?ml$|\.mjs$|\.sh$)/i.test(file))
    .slice(0, 20)
  const enforcementFiles = [...hooks, ...workflows]
  for (const check of checks) {
    check.surfaces = enforcementFiles.filter((file) => commandIsReferenced(readText(root, file), check))
    check.classification = check.surfaces.length > 0 ? 'enforced' : 'runnable'
  }

  const visualClicheEscape = ['spark', 'les-ok'].join('')
  const escapeCounts = { 'copy-ok': 0, 'design-ok': 0, 'docs-ok': 0, [visualClicheEscape]: 0 }
  for (const file of files) {
    const text = readText(root, file, 500_000)
    if (!text) continue
    for (const marker of Object.keys(escapeCounts)) {
      escapeCounts[marker] += text.match(new RegExp(`${marker}:`, 'g'))?.length || 0
    }
  }

  const hookPath = git(root, ['config', '--get', 'core.hooksPath'], { allowFailure: true }).stdout.trim() || null
  const proposedConfig = {
    version: 1,
    ...(checks.length > 0
      ? {
          checks: Object.fromEntries(
            checks.map(({ id, command }) => [id, { command }]),
          ),
        }
      : {}),
  }

  const gaps = []
  if (guidance.length === 0) gaps.push('No repo-local AGENTS.md or CLAUDE.md guidance was found.')
  if (checks.length === 0) gaps.push('No runnable check, verify, lint, or test entry point was found.')
  if (hooks.length === 0) gaps.push('No committed pre-commit or pre-push hook was found.')
  if (!hookPath) gaps.push('core.hooksPath is not configured in this clone.')
  if (workflows.length === 0) gaps.push('No GitHub Actions workflow was found; local hooks are bypassable.')
  if (factoryCandidates.length > 0) {
    gaps.push('Generated-asset candidates need explicit source, output, preview, and drift-check contracts.')
  }

  return {
    root,
    entrypoints,
    guidance,
    checks,
    hooks,
    hookPath,
    workflows,
    designSystem,
    factoryCandidates,
    escapeCounts,
    gaps,
    proposedConfig,
  }
}

function markdownReport(scan) {
  const lines = [
    '# Design Engineer adoption scan',
    '',
    `Repository: \`${scan.root}\``,
    '',
    '## Detected',
    '',
    `- Entrypoints: ${scan.entrypoints.length ? scan.entrypoints.map((item) => `\`${item}\``).join(', ') : 'none'}`,
    `- Agent guidance: ${scan.guidance.length ? scan.guidance.map((item) => `\`${item}\``).join(', ') : 'none'}`,
    `- Git hooks: ${scan.hooks.length ? scan.hooks.map((item) => `\`${item}\``).join(', ') : 'none'}`,
    `- Active hook path: ${scan.hookPath ? `\`${scan.hookPath}\`` : 'not configured'}`,
    `- CI workflows: ${scan.workflows.length ? scan.workflows.map((item) => `\`${item}\``).join(', ') : 'none'}`,
    `- Design-system signals: ${scan.designSystem.length}`,
    `- Factory candidates: ${scan.factoryCandidates.length}`,
    `- Escape hatches: ${Object.entries(scan.escapeCounts).map(([name, count]) => `${name}=${count}`).join(', ')}`,
    '',
    '## Proposed checks',
    '',
  ]
  if (scan.checks.length === 0) lines.push('No check commands could be proposed safely.')
  else {
    for (const check of scan.checks) {
      const surfaces = check.surfaces.length ? `; ${check.surfaces.join(', ')}` : ''
      lines.push(`- \`${check.id}\`: \`${check.command}\` (${check.classification}${surfaces})`)
    }
  }
  lines.push('', '## Gaps', '')
  if (scan.gaps.length === 0) lines.push('- No baseline gaps detected; inspect semantics before promoting new blockers.')
  else for (const gap of scan.gaps) lines.push(`- ${gap}`)
  lines.push(
    '',
    '## Adoption order',
    '',
    '1. Review the proposed checks and remove commands that are not stable public entry points.',
    '2. Save the proposal as `.designengineer/config.yaml` only after review.',
    '3. Run each check with `designengineer verify <id>` and inspect its failures.',
    '4. Wire fast checks to committed hooks; keep slow checks in CI or an explicit lane.',
    '5. Add writer isolation, remote admission, and resource leases only for observed failure modes.',
    '',
  )
  return lines.join('\n')
}

function configSchema() {
  return JSON.parse(readFileSync(join(packageRoot, 'schema/config.schema.json'), 'utf8'))
}

function validateConfig(config, label) {
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  const validate = ajv.compile(configSchema())
  if (validate(config)) return
  const detail = validate.errors
    .map((error) => `${error.instancePath || '/'} ${error.message}`)
    .join('; ')
  throw new Error(`${label} is invalid: ${detail}`)
}

function writeProposal(root, path, config) {
  validateConfig(config, 'proposed config')
  const destination = resolve(root, path)
  if (existsSync(destination)) throw new Error(`Refusing to overwrite ${destination}`)
  mkdirSync(dirname(destination), { recursive: true })
  writeFileSync(destination, yaml.dump(config, { lineWidth: 100, noRefs: true }), 'utf8')
  return destination
}

function loadConfig(root) {
  const path = join(root, '.designengineer/config.yaml')
  if (!existsSync(path)) throw new Error(`Missing ${path}; run scan --write and review the proposal first.`)
  const config = yaml.load(readFileSync(path, 'utf8'))
  validateConfig(config, path)
  if (config.version === undefined) throw new Error(`${path} must declare version`)
  return config
}

function availableChecks(config) {
  const checks = new Map()
  for (const [id, value] of Object.entries(config.checks || {})) {
    checks.set(id, { id, command: value.command, source: `checks.${id}` })
  }
  for (const [id, value] of Object.entries(config.rulepacks || {})) {
    const qualified = `rulepack.${id}`
    const canonical = checks.has(id) ? qualified : id
    const check = { id: canonical, command: value.check, source: `rulepacks.${id}` }
    checks.set(qualified, check)
    if (!checks.has(id)) checks.set(id, check)
  }
  for (const [id, value] of Object.entries(config.factories || {})) {
    const qualified = `factory.${id}`
    checks.set(qualified, { id: qualified, command: value.check, source: `factories.${id}` })
  }
  return checks
}

function repositoryState(root) {
  const hash = createHash('sha256')
  for (const path of listFiles(root)) {
    const absolute = join(root, path)
    hash.update(path)
    hash.update('\0')
    try {
      const stat = lstatSync(absolute)
      hash.update(String(stat.mode & 0o777))
      hash.update('\0')
      if (stat.isSymbolicLink()) hash.update(readlinkSync(absolute))
      else if (stat.isFile()) hash.update(readFileSync(absolute))
      else hash.update('<non-file>')
    } catch {
      hash.update('<missing>')
    }
    hash.update('\0')
  }
  const status = git(
    root,
    ['status', '--porcelain=v1', '--untracked-files=all', '--', '.', `:(exclude)${evidenceFile}`],
    { allowFailure: true },
  )
  const tree = git(root, ['write-tree'], { allowFailure: true })
  return {
    tree: tree.status === 0 ? tree.stdout.trim() : null,
    fingerprint: hash.digest('hex'),
    worktreeDirty: status.status === 0 ? status.stdout.trim() !== '' : null,
  }
}

function ledgerEntries(root) {
  const path = join(root, evidenceFile)
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try { return [JSON.parse(line)] } catch { return [] }
    })
}

function appendEvidence(root, entry) {
  const path = join(root, evidenceFile)
  mkdirSync(dirname(path), { recursive: true })
  appendFileSync(path, `${JSON.stringify(entry)}\n`)
}

function durationMilliseconds(value) {
  if (!value) return null
  const match = String(value).match(/^([0-9]+)([smhd])$/)
  if (!match) return null
  const unit = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]
  return Number(match[1]) * unit
}

function evidenceStatus(root, config) {
  const state = repositoryState(root)
  const latest = new Map()
  for (const entry of ledgerEntries(root)) latest.set(entry.check, entry)
  const rows = []
  const unique = new Map()
  for (const check of availableChecks(config).values()) unique.set(check.source, check)
  for (const check of unique.values()) {
    const entry = latest.get(check.id)
    let status = 'missing'
    if (entry) {
      const ttl = durationMilliseconds(entry.ttl)
      const unexpired = ttl === null || Date.now() - Date.parse(entry.at) <= ttl
      const sameInput = entry.fingerprint && entry.fingerprint === state.fingerprint
      if (entry.result === 'pass' && sameInput && unexpired) status = 'fresh'
      else if (entry.result === 'fail' && sameInput) status = 'failed'
      else status = 'stale'
    }
    rows.push({ id: check.id, status, at: entry?.at || null, command: check.command })
  }
  return { root, fingerprint: state.fingerprint, checks: rows }
}

function parseOptions(args) {
  const options = { positional: [] }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--json') options.format = 'json'
    else if (arg === '--format' || arg === '--root' || arg === '--write') {
      const value = args[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)
      options[arg.slice(2)] = value
      index += 1
    } else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`)
    else options.positional.push(arg)
  }
  return options
}

function scanCommand(args, initMode = false) {
  const options = parseOptions(args.filter((arg) => arg !== '--adopt'))
  const root = repositoryRoot(options.positional[0] || '.')
  const scan = scanRepository(root)
  const writePath = options.write || (initMode ? '.designengineer/proposed-config.yaml' : null)
  let written = null
  if (writePath) written = writeProposal(root, writePath, scan.proposedConfig)
  if (options.format === 'json') console.log(JSON.stringify({ ...scan, written }, null, 2))
  else {
    console.log(markdownReport(scan))
    if (written) console.log(`Wrote proposed config: ${written}`)
  }
}

function verifyCommand(args) {
  const options = parseOptions(args)
  const id = options.positional[0]
  if (!id) throw new Error('verify requires a check id or all')
  const root = repositoryRoot(options.root || options.positional[1] || '.')
  const checks = availableChecks(loadConfig(root))
  const selected = id === 'all'
    ? [...new Map([...checks.values()].map((check) => [check.source, check])).values()]
    : [checks.get(id)].filter(Boolean)
  if (selected.length === 0) {
    throw new Error(`Unknown check: ${id}. Available: ${[...checks.keys()].join(', ') || 'none'}`)
  }
  for (const check of selected) {
    console.log(`RUN ${check.id}: ${check.command}`)
    const result = spawnSync(check.command, {
      cwd: root,
      env: process.env,
      shell: true,
      stdio: 'inherit',
    })
    const state = repositoryState(root)
    const passed = result.status === 0 && !result.error
    appendEvidence(root, {
      check: check.id,
      result: passed ? 'pass' : 'fail',
      rules: [],
      tree: state.tree,
      fingerprint: state.fingerprint,
      worktreeDirty: state.worktreeDirty,
      env: null,
      at: new Date().toISOString(),
      ttl: null,
    })
    if (!passed) {
      console.error(`FAIL ${check.id}`)
      process.exit(result.status || 1)
    }
    console.log(`PASS ${check.id}`)
  }
}

function statusCommand(args, assertMode = false) {
  const options = parseOptions(args)
  const assertedId = assertMode ? options.positional[0] : null
  if (assertMode && !assertedId) throw new Error('assert requires a check id')
  const rootPosition = assertMode ? options.positional[1] : options.positional[0]
  const root = repositoryRoot(options.root || rootPosition || '.')
  const status = evidenceStatus(root, loadConfig(root))
  if (assertMode) {
    const available = availableChecks(loadConfig(root))
    const requested = available.get(assertedId)
    if (!requested) throw new Error(`Unknown check: ${assertedId}`)
    const row = status.checks.find((check) => check.id === requested.id)
    if (row.status !== 'fresh') fail(`${assertedId}: ${row.status}`)
    console.log(`${assertedId}: fresh`)
    return
  }
  if (options.format === 'json') console.log(JSON.stringify(status, null, 2))
  else for (const row of status.checks) console.log(`${row.status.padEnd(7)} ${row.id}`)
}

function usage() {
  console.log(`designengineer

Usage:
  designengineer scan [repo] [--write PATH] [--format markdown|json]
  designengineer init --adopt [repo]
  designengineer verify <check|all> [--root REPO]
  designengineer status [repo] [--format text|json]
  designengineer assert <check> [--root REPO]

scan is read-only unless --write is provided. Writes always refuse to overwrite.`)
}

try {
  const [command, ...args] = process.argv.slice(2)
  if (!command || command === 'help' || command === '--help') usage()
  else if (command === 'scan') scanCommand(args)
  else if (command === 'init' && args.includes('--adopt')) scanCommand(args, true)
  else if (command === 'verify') verifyCommand(args)
  else if (command === 'status') statusCommand(args)
  else if (command === 'assert') statusCommand(args, true)
  else throw new Error(`Unknown command: ${[command, ...args].filter(Boolean).join(' ')}`)
} catch (error) {
  fail(`designengineer: ${error.message}`, 2)
}
