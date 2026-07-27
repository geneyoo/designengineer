# Workflow Guards

Rulepacks and factories govern *what* an agent writes. This layer governs
*where it writes, what it may touch while writing, when checks run, and what
must be true before work merges*. It is the second half of the drop-in kit and
the half most repos are missing.

The four guards, in the order a project should adopt them:

```text
1. writer isolation   one writer owns one branch, one worktree
2. resource leases    one owner mutates one scarce local resource
3. lanes              which checks run at which moment
4. admission          what must pass before the default branch moves
```

Each is mechanical. None of them is a rule in `AGENTS.md`, because a rule in
`AGENTS.md` is not a guard.

Working prior art for every guard here is `~/shaba` (`scripts/worktree.sh`,
`scripts/claude-worktree-guard.sh`, `scripts/ios/simulator-lease.sh`,
`scripts/merge-queue.sh`, `.githooks/`, `.github/workflows/lightning.yml`).
Extract from there rather than reinventing.

## 1. Writer Isolation

The failure mode: two agents edit the same checkout. One rebases under the
other, a third commits directly to the default branch, and a fourth writes into
a worktree it does not own. None of these produce an error message at the time
of the mistake.

The contract is a lease registry, not a naming convention. Creating a worktree
records `path`, `branch`, `owner`, and `created_at` under the repository's
common git directory, so every worktree of the same clone reads the same
registry. Guards then answer one question: *does the writer hold the lease for
the worktree it is writing into?*

Three enforcement surfaces, because they catch different mistakes:

| Surface | Catches | Bypassed by |
|---|---|---|
| `pre-commit` / `pre-push` hook | commits on the default branch, commits from a worktree owned by another agent | `--no-verify` |
| Editor-tool `PreToolUse` hook | edits into an unleased or foreign worktree, before any commit exists | writes issued through a shell tool |
| Worktree cap plus reap | unbounded worktree sprawl | nothing; it is a create-time refusal |

State the bypasses out loud in the repo's own docs. A guard advertised as a
boundary that is actually defense in depth is worse than one described
accurately, because agents will report a guarantee the repo does not have.

Two policy details are load-bearing:

- **Fail open outside, fail closed inside.** If the guard cannot place the
  target file inside this repository (no git, unparseable payload, another
  repo), allow. Once the target *is* inside this repository, a missing registry
  means no lease can exist, which is a denial, not an unknown.
- **Closing is conditional.** Only a clean, merged worktree may be closed, and
  reaping must preserve any branch that still owns an open child pull request.
  Otherwise the cleanup verb destroys a stack in progress.

Config:

```yaml
workflow:
  writer-isolation:
    kind: worktree-lease
    registry: .git/hatch-worktrees
    create: make wt BRANCH=<type/topic> OWNER=<agent>
    status: make wt-status
    close: make wt-close WT_PATH=<path>
    reap: make wt-reap
    max-active: 10
    guards:
      - surface: git-hook
        event: pre-commit
        command: ./scripts/worktree.sh guard
        fails: closed
      - surface: editor-tool
        event: PreToolUse
        matcher: Edit|Write|NotebookEdit
        command: ./scripts/claude-worktree-guard.sh
        escape: HATCH_ALLOW_UNMANAGED_EDITS
        fails: open
    test: ./scripts/worktree-test.sh
```

Wiring the editor-tool guard for Claude Code is `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR/scripts/claude-worktree-guard.sh\"",
            "timeout": 10,
            "statusMessage": "Checking managed worktree"
          }
        ]
      }
    ]
  }
}
```

The hook reads the tool payload on stdin and writes a `permissionDecision` of
`allow` or `deny` on stdout. A denial should name the lease that is missing and
the command that creates one, because the denial message is the only
remediation the agent gets. This is the same taught-failure contract rulepacks
use.

A worktree-creating tool that registers no lease does not satisfy the rule.
Entering an already-registered worktree does.

## 2. Resource Leases

Covered in full by [`resource-leases.md`](resource-leases.md), including the
pool form for simulators. It belongs to this layer: a lease is writer isolation
for state that lives outside the repository.

The integration rule is the same shape as writer isolation. Acquisition goes in
an explicit setup verb; assertion goes inside every target that can mutate the
resource; the underlying command names the exact leased identifier rather than
`booted`, `latest`, or a display name.

## 3. Lanes

The failure mode: one check policy for every moment. Either the fast loop
carries release-grade validation and agents route around it, or the repo has no
gate anywhere.

A lane is a named check mode selected by an environment variable, with a
default. It answers "what runs on commit and on push" without changing hook
scripts. The default lane should be fast enough that nobody disables it.

```yaml
workflow:
  lanes:
    selector: HATCH_CHECK_MODE
    default: lightning
    modes:
      lightning:
        describe: Workflow safety only; no build, test, lint, or docs gates.
        pre-commit: [workflow.writer-isolation]
        pre-push: [workflow.writer-isolation]
      verification:
        describe: Exhaustive cross-surface checks, opt-in locally.
        pre-commit: [workflow.writer-isolation]
        pre-push: [workflow-test, docs-check, server-verify, web-verify, ios-verify]
```

`HATCH_CHECK_MODE=verification git push` opts a single push into the slow lane.

Two calibrations worth copying:

- **A zero-validation default lane is a legitimate choice** when admission is
  strong. `shaba` runs no lint, build, test, or docs gate on commit or push,
  and moves all of it into pull-request admission. The tradeoff is explicit:
  local speed for a hard remote gate, never for no gate.
- **The default lane must still run the workflow guards.** Lightning skips
  product validation, not writer isolation. Dropping the guard from the fast
  lane removes the only check that runs every time.

When the default lane skips product checks, agents must say so. "Locally
unverified, relies on admission" is accurate. Implying a gate ran is the
failure this whole repo exists to prevent.

## 4. Admission

The failure mode: hooks-only enforcement dies on `--no-verify`, and a merge
queue that is just "click merge" serializes nothing.

Admission is the one gate that cannot be skipped locally. It should be a named
remote check, so the merge tool can wait on it by name rather than on an
aggregate rollup.

```yaml
workflow:
  admission:
    branch: main
    open: make pr-open BRANCH=<branch> TITLE=<title>
    queue: make pr-queue PR=<number>
    requires: [lint, workflow-test, docs-check, product-name-check]
    remote: make workflow-enforce APPLY=1
```

What earns its keep in the `shaba` implementation:

- **Stack awareness.** `pr-queue` follows open head/base branches to infer
  whether the requested pull request is alone or stacked, serializes every
  parent through the gate first, then retargets direct children onto the
  parent's former base before branch deletion. Leaves rebase; stack parents use
  an ancestry-preserving update so child branches in other worktrees stay valid.
- **Interrupted-state repair.** The queue repairs a half-finished retarget and
  retries when another agent merges first. Concurrency is assumed, not
  prohibited.
- **Guards are part of admission.** The remote gate runs the guard test suite
  (`make workflow-test`), so the safety layer is protected by the same
  mechanism it protects.
- **Red default branch reports, but does not block.** The latest verification
  result on `main` is surfaced as a warning, so the repair pull request that
  would make it green is not blocked by it being red.
- **The PR verb is a script, not `gh pr create`.** Wrapping it gives one place
  to route around a provider defect. A live example: since 2026-07-24 GitHub
  answers `POST /repos/<repo>/pulls` with HTTP 500 for every request whose base
  is `main`; `scripts/open-pr.sh` tries the ordinary create first, then falls
  back to create-against-a-temporary-base plus retarget. Wrapping meant one
  script changed instead of every agent learning a workaround.
- **Remote enforcement is a checked-in verb.** `make workflow-enforce` reports
  whether the branch ruleset is active and applies it with `APPLY=1`. Branch
  protection that exists only in a web console is not part of the repo.

## Ratchet Rules

Most repos cannot turn on a size, complexity, or coverage rule, because the
existing code already violates it. The usual answers are both bad: baseline
files that rot, or a rule that stays `warn` forever.

The third severity is a ratchet. It compares the working tree against a base
ref and fails only when a *touched* file that is already over the soft limit
gets worse. Clean files are unaffected, untouched violations are tolerated, and
the hard limit still blocks outright.

```yaml
rulepacks:
  source-size:
    check: ./scripts/ios/swift-source-size-check.sh
    latency: ci
    rules:
      source.file-size:
        severity: ratchet
        baseline:
          ref: HATCH_LINT_BASE_REF
          limit: "1000 lines"
          hard: "1500 lines"
        fix: Extract the new code into a new type instead of growing this file.
        exemplar: docs/workflow-guards.md
```

The base ref comes from the environment because the value differs by surface:
locally it is the merge base, in CI it is the pull request's base SHA. Wire it
in the workflow definition, not in the script.

This severity generalizes past file size. Any monotonic metric with an existing
violation backlog (bundle size, warning count, escape-hatch count, `any` count)
can ratchet instead of waiting for a cleanup that never happens.

## Guards Must Be Tested

An untested guard is prose with a shebang. Every guard in this layer needs a
test that asserts the *denial*, not just the happy path:

```text
scripts/worktree-test.sh               lease creation, ownership, cap, reap safety
scripts/claude-worktree-guard-test.sh  allow, deny, fail-open, escape hatch
scripts/merge-queue-test.sh            stack inference, retarget, interrupted repair
scripts/ios/simulator-lease-test.sh    acquisition, isolation, conflict, auto release
scripts/ios/swift-source-size-check-test.sh  ratchet against a base ref
```

Aggregate them behind one verb (`make workflow-test`) and run that verb in
admission. A guard that silently stopped working is indistinguishable from no
guard, and this is the only way to find out.

## Drop-In Order

For an existing project, adopt in this order. Each step is independently useful
and independently revertible.

1. **Hook path first.** `git config core.hooksPath .githooks`, committed as a
   `make hooks-install` verb. Keep the path worktree-relative; an absolute path
   to one checkout breaks every other worktree.
2. **Refuse default-branch commits.** One `guard` function in `pre-commit` and
   `pre-push`. This is a few lines and removes the most common accident.
3. **Add the lease registry.** `create`, `status`, `close`, `reap`, plus the
   cap. Ownership is now readable, so the next guard has something to check.
4. **Add the editor-tool guard.** It only becomes possible once leases exist.
5. **Name the lanes.** Move the checks the repo already has into an explicit
   default and slow mode. Adding no new checks at this step is fine and often
   correct.
6. **Make admission the real gate.** Run the fast checks remotely on every pull
   request, including the guard tests. Turn on the branch ruleset with a
   checked-in verb.
7. **Wrap the merge.** A queue verb, once more than one branch is ever open at
   a time.
8. **Lease scarce resources.** Simulators, devices, ports, test databases. See
   [`resource-leases.md`](resource-leases.md).
9. **Ratchet the rules you could not previously turn on.**

Steps 1 through 3 are worth doing in almost any repo with more than one agent.
Steps 6 and 7 only pay off once the project has a remote and real pull
requests. Do not install step 7 in a solo repo with no CI; it is ceremony
without a failure mode.

## What This Layer Does Not Do

Stated plainly, because overstating a guarantee is the specific harm here:

- It does not sandbox shell commands. Every editor-tool guard is bypassed by a
  write issued through a shell tool: `git apply`, formatters, generators,
  redirects, package managers. Git hooks are the backstop, and they are
  bypassed by `--no-verify`. Only remote admission is unskippable.
- It does not prevent two agents from making semantically conflicting changes
  in two correctly leased worktrees. It prevents them from overwriting each
  other's files and state.
- It does not scope *which* files an agent may touch inside its own worktree.
  That is the work-order contract in
  [`research/moveset-extensions.md`](research/moveset-extensions.md).
- Lease registries and lock files are local state. A machine that dies holding
  a lease releases it (owner death frees the lock); a machine that dies holding
  a half-merged stack does not repair itself, which is why the queue verb needs
  the repair path.
