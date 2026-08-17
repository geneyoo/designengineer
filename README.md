# Design Engineer

Design Engineer turns a repository's development judgment into artifacts an
agent can inspect, run, and be blocked by: stable commands, schemas, checks,
hooks, CI admission, worktree ownership, and resource leases.

Use it in either of two ways:

- Give an agent this repository and ask it to adopt the contracts into another
  codebase.
- Run the CLI to inventory an existing repository, generate a starter config,
  execute its checks, and query verification evidence.

The operating model and the two proven adoption profiles are in
[`docs/development-flow.md`](docs/development-flow.md).

## Quick start

From a public Git checkout:

```bash
npm install --save-dev github:geneyoo/designengineer
npx designengineer scan .
npx designengineer scan . --write .designengineer/proposed-config.yaml
```

`scan` is read-only unless `--write` is present. It discovers existing Make and
package check commands, hooks, CI, agent guidance, design-system files,
generated-asset candidates, and escape hatches. A write refuses to overwrite
an existing file.

Review the proposal before activating it:

```bash
mv .designengineer/proposed-config.yaml .designengineer/config.yaml
npx designengineer verify check
npx designengineer status
npx designengineer assert check
```

For a non-Node repository, keep this project beside the target and invoke
`node /path/to/designengineer/bin/designengineer.mjs`. The target does not need
to become a Node project.

The shorter initialization form writes the same non-destructive proposal:

```bash
npx designengineer init --adopt .
```

## What ships

- `designengineer scan`: read-only inventory plus a schema-valid proposed
  config.
- `designengineer verify <id|all>`: run registered checks and append evidence
  to the ignored `.designengineer/ledger.jsonl`.
- `designengineer status`: report fresh, stale, failed, and missing evidence
  against the current working-tree fingerprint.
- `designengineer assert <id>`: exit successfully only when matching fresh
  evidence exists; suitable for hooks and agent stop conditions.
- A normative config schema for rulepacks, aggregate checks, factories,
  resource leases, workflow guards, lanes, and admission.
- Runnable examples: documentation-example validation, an asset-style rule,
  fail-closed path detection, and a process-owned macOS resource lease.
- Adoption contracts for hooks-first and guarded multi-agent repositories.

The CLI intentionally does not install hooks, branch protection, worktrees, or
CI into another repository. Those surfaces can overwrite local policy or create
remote state. The scan makes the existing system visible; a human or agent then
adopts the smallest relevant contract from the docs.

`verify` executes the command registered in the target repository's config
through the system shell. Treat `.designengineer/config.yaml` as executable
repository code, with the same trust boundary as a Makefile or package script.

## Core model

```text
repo guidance
  -> stable commands
  -> deterministic checks and taught failures
  -> committed hooks for the local lane
  -> named remote admission
  -> evidence tied to the exact working tree
```

For generated output, add a factory contract:

```text
source of truth -> deterministic generator -> committed output -> drift check -> preview
```

For concurrent writers, add workflow guards:

```text
one writer per worktree -> one owner per scarce resource -> explicit lanes -> remote admission
```

Agent instructions bias behavior. They are not enforcement. A rule becomes a
repo contract only when a check can reject it, a factory makes the legal output,
or a guard prevents the unsafe transition.

## Repository map

- [`docs/development-flow.md`](docs/development-flow.md): start here; current
  end-to-end workflow and adoption profiles.
- [`docs/onboarding.md`](docs/onboarding.md): scan, classify, and migrate an
  existing or new project.
- [`docs/workflow-guards.md`](docs/workflow-guards.md): worktree ownership,
  lanes, admission, ratchets, and rollout order.
- [`docs/resource-leases.md`](docs/resource-leases.md): fixed and pooled
  exclusive-resource contracts.
- [`docs/research/rulepacks.md`](docs/research/rulepacks.md): normalize taste,
  copy, architecture, and design-system checks.
- [`docs/research/factory-patterns.md`](docs/research/factory-patterns.md):
  generated assets with source, preview, and drift control.
- [`docs/research/verification-ledger.md`](docs/research/verification-ledger.md):
  evidence and invalidation model.
- [`schema/config.schema.json`](schema/config.schema.json): normative config
  contract; documentation YAML is tested against it.

## Project bias

Take the first rung that holds: remove unnecessary machinery, reuse an existing
repo command, use the platform, use an installed dependency, and only then add
the minimum new mechanism. Prefer checks and exemplars over prose. Add a
generator only after repeated failures show that a paved output is cheaper than
another rule.

The target user is a design engineer: someone combining product taste, design
systems, frontend craft, architecture, and practical automation. The distinct
claim is not better prompts. It is making architecture executable enough that
agents can operate inside it without silently inventing a new system.

## Development

```bash
npm install
make check
```

`make check` validates documentation examples, the CLI adoption flow, path
selection, the no-sparkles rulepack, and the macOS resource-lease lifecycle.
Portable checks run in CI; the environment-coupled resource test runs on macOS
when its closed input set changes and on a weekly schedule. Full Git history is
scanned separately for secrets.

MIT licensed. See [`LICENSE`](LICENSE).
