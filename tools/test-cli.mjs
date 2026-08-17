#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process'
import {
  appendFileSync,
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import yaml from 'js-yaml'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = join(repoRoot, 'bin/designengineer.mjs')
const fixture = mkdtempSync(join(tmpdir(), 'designengineer-cli-'))

function git(...args) {
  return execFileSync('git', ['-C', fixture, ...args], { encoding: 'utf8' }).trim()
}

function invoke(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: fixture,
    encoding: 'utf8',
  })
  assert.equal(
    result.status,
    expectedStatus,
    `command: ${args.join(' ')}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  )
  return result
}

try {
  mkdirSync(join(fixture, '.githooks'), { recursive: true })
  mkdirSync(join(fixture, '.github/workflows'), { recursive: true })
  mkdirSync(join(fixture, 'UI/StyleGuide'), { recursive: true })
  writeFileSync(join(fixture, 'README.md'), '# Fixture\n')
  writeFileSync(join(fixture, 'AGENTS.md'), '# Fixture rules\n')
  writeFileSync(join(fixture, 'UI/StyleGuide/Colors.swift'), 'enum Colors {}\n')
  writeFileSync(join(fixture, '.githooks/pre-commit'), '#!/bin/sh\nmake check\n')
  chmodSync(join(fixture, '.githooks/pre-commit'), 0o755)
  writeFileSync(join(fixture, '.github/workflows/admission.yml'), 'name: admission\n')
  writeFileSync(join(fixture, '.gitignore'), '.designengineer/ledger.jsonl\n')
  writeFileSync(
    join(fixture, 'Makefile'),
    '.PHONY: check ios-verify app-store-screenshots\n\ncheck:\n\t@test -f README.md\n\nios-verify:\n\t@test -f AGENTS.md\n\napp-store-screenshots:\n\t@true\n',
  )
  writeFileSync(
    join(fixture, 'package.json'),
    JSON.stringify({ scripts: { lint: 'true', start: 'false' } }, null, 2) + '\n',
  )

  execFileSync('git', ['init', '-q', fixture])
  git('config', 'user.name', 'Fixture')
  git('config', 'user.email', 'fixture@example.invalid')
  git('config', 'core.hooksPath', '.githooks')
  git('add', '.')
  git('commit', '-q', '-m', 'test: fixture')

  const scan = JSON.parse(invoke(['scan', '.', '--format', 'json']).stdout)
  assert.deepEqual(scan.entrypoints, ['Makefile', 'package.json'])
  assert.equal(scan.hookPath, '.githooks')
  assert(scan.checks.some((check) => check.id === 'check' && check.command === "make 'check'"))
  assert.equal(scan.checks.find((check) => check.id === 'check').classification, 'enforced')
  assert(scan.checks.some((check) => check.id === 'ios-verify'))
  assert.equal(scan.checks.find((check) => check.id === 'ios-verify').classification, 'runnable')
  assert(scan.checks.some((check) => check.id === 'lint'))
  assert(!scan.checks.some((check) => check.id === 'start'))
  assert.equal(scan.factoryCandidates.length, 0)

  invoke(['scan', '.', '--write', '.designengineer/config.yaml'])
  const config = yaml.load(readFileSync(join(fixture, '.designengineer/config.yaml'), 'utf8'))
  assert.equal(config.version, 1)
  assert.equal(config.checks.check.command, "make 'check'")
  assert.equal(config.checks['ios-verify'].command, "make 'ios-verify'")

  const overwrite = invoke(['scan', '.', '--write', '.designengineer/config.yaml'], 2)
  assert.match(overwrite.stderr, /Refusing to overwrite/)

  invoke(['verify', 'check'])
  const fresh = JSON.parse(invoke(['status', '--format', 'json']).stdout)
  assert.equal(fresh.checks.find((check) => check.id === 'check').status, 'fresh')
  invoke(['assert', 'check'])

  config.rulepacks = {
    style: {
      check: "make 'check'",
      latency: 'pre-commit',
      rules: {
        'style.no-raw-value': {
          severity: 'error',
          fix: 'Use the fixture style guide.',
          exemplar: 'AGENTS.md',
        },
      },
    },
  }
  writeFileSync(join(fixture, '.designengineer/config.yaml'), yaml.dump(config))
  invoke(['verify', 'rulepack.style'])
  const aliased = JSON.parse(invoke(['status', '--format', 'json']).stdout)
  assert.equal(aliased.checks.find((check) => check.id === 'style').status, 'fresh')
  invoke(['assert', 'style'])
  invoke(['assert', 'rulepack.style'])

  appendFileSync(join(fixture, 'README.md'), '\nchanged\n')
  const stale = JSON.parse(invoke(['status', '--format', 'json']).stdout)
  assert.equal(stale.checks.find((check) => check.id === 'check').status, 'stale')
  const staleAssert = invoke(['assert', 'check'], 1)
  assert.match(staleAssert.stderr, /check: stale/)

  console.log('designengineer CLI test: scan, safe write, verify, status, and assert passed')
} finally {
  rmSync(fixture, { recursive: true, force: true })
}
