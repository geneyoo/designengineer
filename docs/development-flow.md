# Development Flow

This is the handoff document for incorporating the system into another
repository. Start with the hooks-first profile. Add the guarded multi-agent
profile only when concurrent writers or scarce local resources create an
observed failure mode.

## The shared contract

Every adopted repository should make this path recoverable from files, without
requiring chat history or machine-global prompts:

```text
task intent
  -> repo-local guidance and exemplars
  -> isolated change
  -> stable check commands
  -> local fast lane
  -> remote admission
  -> integration
  -> guarded release
```

Each transition has one owner:

| Transition | Owning artifact | Enforcement |
|---|---|---|
| Understand the repository | `AGENTS.md`, architecture docs, exemplars | Agent discovery; prose only |
| Make a legal change | design system, typed APIs, factories | Compiler plus repo checks |
| Prove the change | `make *-check` / `make *-verify` | Exit status and tests |
| Remember proof | `.designengineer/ledger.jsonl` | Tree fingerprint plus `assert` |
| Commit or push | committed Git hooks | Local, bypassable with `--no-verify` |
| Merge | named CI admission and branch rules | Remote, fail closed |
| Share a writer or device | worktree/resource lease | Ownership assertion in the mutating command |
| Release | one checked-in release verb | Clean-main, exact-input, and confirmation guards |

The distinction is load-bearing: guidance biases; checks reject; factories
construct; guards prevent transitions.

## Profile A: hooks-first

Use this for one or a few writers, modest branch concurrency, and repositories
where local feedback is cheap.

```text
make hooks-install
  -> edit on a feature branch
  -> pre-commit: fast design/lint checks
  -> pre-push: affected full verification
  -> pull request: secret scan plus path-scoped CI
  -> merge
  -> checked-in release command
```

Required properties:

- `core.hooksPath` is a committed relative path, never an absolute checkout
  path.
- Pre-commit stays fast and reports a fix and exemplar for every custom rule.
- Pre-push determines the pushed range from hook input rather than guessing
  from the working tree.
- CI repeats every merge-critical check because hooks are bypassable.
- Generated icons, screenshots, tokens, and galleries declare source, output,
  preview, and drift-check commands.
- Secret scanning checks full history on pull requests, default-branch pushes,
  a schedule, and manual dispatch.

This profile is intentionally simpler than worktree orchestration. Do not add a
merge queue or lease registry to a repository that has not experienced the
failure they prevent.

## Profile B: guarded multi-agent

Use this when several agents write concurrently, branches are stacked, or
simulators/devices/databases are shared.

```text
create/resume managed worktree
  -> acquire writer lease
  -> fast lane: workflow safety only
  -> optional guarded build/install
  -> push and open PR through checked-in verbs
  -> remote portable admission
  -> path-scoped capability jobs
  -> stack-aware integration queue
  -> close clean merged worktree
  -> guarded release from clean current main
```

The proven fast lane deliberately runs no product build, lint, test, or docs
verification. It runs writer-isolation guards, then relies on a hard remote
gate. That trade is valid only when:

- the remote admission status is required and fail closed;
- every guard has denial-path tests in admission;
- capability-specific jobs use a closed set of changed inputs;
- an exhaustive local/manual lane still exists for release confidence; and
- agents report local verification as skipped, never implied.

The reference command shape is:

```text
make wt BRANCH=<type/topic> OWNER=<agent>
make lightning
LIGHTNING_IOS_INSTALL=1 make lightning   # only on an explicit run request
make pr-open BRANCH=<branch> TITLE=<title>
make pr-queue PR=<number-or-url>
make verification                        # explicit exhaustive lane
make release-bump                        # clean primary main only
```

These names are examples, not a required vocabulary. The contract is the
observable state and enforcement described in [`workflow-guards.md`](workflow-guards.md).

## Adopt into an existing repository

Install or invoke the CLI, then inventory before changing policy:

```bash
designengineer scan .
designengineer scan . --write .designengineer/proposed-config.yaml
```

The scanner proposes only commands the repository already exposes. Review the
result and classify every finding:

- `enforced`: wired to a committed hook or CI.
- `runnable`: stable command, not a gate.
- `prose-only`: behavior exists only in guidance.
- `source-only`: source exists without generated output/check.
- `generated`: output exists but freshness is unclear.
- `candidate`: close to a rulepack or factory after light normalization.
- `detected-deferred`: useful, intentionally outside this adoption change.
- `unmanaged`: known workflow intentionally not gated.

Adopt in this order:

1. Register existing public check commands in `.designengineer/config.yaml`.
2. Run them with `designengineer verify`; fix broken entry points before adding
   new rules.
3. Give every custom failure a stable rule ID, fix, and committed exemplar.
4. Put fast checks in pre-commit and affected full checks in pre-push or CI.
5. Add full-history secret scanning and one stable required admission status.
6. Register generated artifacts as factories with drift checks and previews.
7. Add writer isolation, resource leases, ratchets, or a merge queue only for
   measured failures.

The config is executable policy: `designengineer verify` runs its commands
through the system shell. Review config changes with the same care as Makefile,
hook, and workflow changes.

The first adoption pull request should wrap what exists. It should not redesign
the product, regenerate unrelated assets, or silently stage dirty files.

## Give this to an agent

Use this task text with the target repository and this repository available:

```text
Adopt the Design Engineer contracts into this repository.

1. Read the target repository's guidance, configuration, hooks, CI, public
   commands, design-system sources, and generated-asset scripts end to end.
2. Run `designengineer scan .` and treat its output as an inventory, not an
   instruction to install everything.
3. Preserve unrelated changes. Wrap the repository's existing checks before
   inventing new mechanisms.
4. Implement the hooks-first profile unless there is evidence that concurrent
   writers or shared resources require the guarded multi-agent profile.
5. Every new rule needs a stable ID, enforcement command, fix, exemplar, and a
   denial-path test. Every product claim needs a measurement.
6. Add full-history secret scanning and a fail-closed remote admission check.
7. Run the repository-defined complete gate and report exactly what passed and
   what remains unverified.

Do not publish, enable branch protection, rotate credentials, or rewrite
history without explicit approval.
```

## What is portable and what is preference

Portable capabilities:

- repository inventory and schema validation;
- check execution and evidence assertions;
- path-scoped CI detection;
- worktree and resource ownership contracts;
- generated-output drift checks;
- secret scanning.

Repo-specific preferences:

- a ban on a particular icon or punctuation mark;
- exact color, copy, component, and asset rules;
- which lane is the default;
- file-size thresholds;
- release confirmation language.

Copy the capability. Re-express the preference in the target repository's own
tokens, exemplars, and rule IDs.
