# str8flush Adoption Lessons

> Historical adoption case. The scope findings remain current; commands in the
> proposed product changes section are roadmap unless the public README lists
> them as shipped.

The str8flush PR was the first useful pressure test of `init --adopt`.

Result: the direction is right, but the product needs sharper scope hygiene.
The most important distinction is:

```text
detected != adopted
```

The scan can find useful factories, preview surfaces, asset workflows, docs,
and hooks. The PR should only adopt the pieces that are in scope, committed, and
verifiable.

## What Worked

### Adopt, do not replace

The useful path was wrapping the repo's existing shape:

- `Makefile` remained the public API.
- `.githooks` called repo-local commands.
- `scripts/ios/design-system-check.sh` stayed the fast check.
- `make test` stayed the canonical PokerKit content validator.
- `.designengineer/config.yaml` named the system instead of replacing it.

This validates the rulepack claim: adoption can be mostly naming, evidence, and
hook wiring around scripts the repo already trusts.

### Aggregate checks can freshen split rulepacks

str8flush has one fast script that checks design, copy, and architecture. It
would be wasteful to run it three times. The better pattern is:

```yaml
checks:
  ios-design:
    kind: aggregate
    command: make ios-design-check
    freshens:
      - rulepack.ios-design-system
      - rulepack.content-copy
      - rulepack.ios-architecture
```

One execution writes the aggregate ledger entry and alias entries for narrower
rulepacks. Work orders can then require `rulepack.content-copy` without forcing
another run.

### Taught failures are cheap and valuable

The check script emitting `rule:`, `fix:`, and `exemplar:` immediately made the
harness more agent-usable. This should be a V0 requirement, not polish.

## What We Had To Correct

### Factory candidates must not sneak into adoption scope

The scan noticed brand assets and a design dashboard. Both were real signals,
but both depended on unrelated untracked app/icon work. They were removed from
the PR.

Product rule:

```text
Do not register a factory in an adoption PR unless its source, command, check,
and referenced preview/exemplar files are committed in the same scope or
already present on main.
```

The correct status for those findings is `detected-deferred`, not `adopted`.

### Exemplar paths must be committed

The first check output referenced a design dashboard file that was not included
in the PR. That is bad for weak agents: the remediation points at a path they
cannot rely on.

Product rule:

```text
A meta-check should fail if any rule exemplar path is missing, untracked, or
outside the adoption PR's included file set.
```

### Adoption needs PR-scope output

The manual staging step was where most judgment happened. The harness should
make that explicit:

```text
Included:
  .designengineer/config.yaml
  scripts/designengineer
  scripts/ios/design-system-check.sh

Detected but deferred:
  app icon asset outputs
  brand asset render script
  design dashboard preview
  unrelated app/UI files
```

This is not only for humans. It is how a weak agent avoids accidentally mixing
two workflows into one PR.

### Ledger freshness is local evidence, not the PR artifact

The local ledger correctly proved checks passed, but ledger entries are
gitignored and can go stale when staged config changes. PR bodies should report
commands run and results, while `status` remains a local developer tool.

Product rule:

```text
PR creation should include verification commands and check IDs, not ledger
contents.
```

## Product Requirements From This Test

1. `designengineer scan` should emit both detected findings and proposed PR
   scope.
2. Findings need explicit statuses: `detected`, `candidate`, `adopted`,
   `detected-deferred`, and `unmanaged`.
3. `designengineer adopt --from-scan` should write an adoption report before
   modifying hooks.
4. `designengineer adopt --stage` should stage only the proposed scope.
5. `designengineer adopt --verify-scope` should fail if staged files include
   unrelated assets, generated outputs, or untracked dependencies.
6. `designengineer check exemplars` should verify all `exemplar:` paths exist
   and are committed or staged.
7. Aggregate checks should support `freshens:` alias ledger entries.
8. Factory registration should require source, output, check, and preview
   ownership, or mark the finding `detected-deferred`.

## Revised Adoption Ladder

The ladder should be:

```text
inventory -> classify -> propose scope -> wrap -> teach -> measure -> gate -> promote -> factory
```

`propose scope` is the new missing step. Without it, adoption can accidentally
become a mixed feature PR.

## Practical Conclusion

The repo is not ready for a packaged tool yet. The next best implementation is
a scanner/proposer that produces:

- `.designengineer/adoption.md`
- `.designengineer/proposed-config.yaml`
- a proposed staged file list
- a deferred findings list
- verification commands for the PR body

That is the product that str8flush wanted.
