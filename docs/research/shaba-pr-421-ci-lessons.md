# Shaba PR 421: Capability-Scoped CI

Source: private source-repository PR 421, reviewed 2026-08-06. The portable
evidence and corrections are preserved in this note. Pricing cross-check:
[GitHub Actions runner pricing](https://docs.github.com/en/enterprise-cloud@latest/billing/reference/actions-runner-pricing).

## What The PR Proved

Shaba's pull-request lint mixed portable checks with one test that genuinely
needed `xcrun swiftc`. The PR moved the portable work to Linux, dispatched the
macOS test only for its own inputs, and preserved one stable required
`admission` status that fails when an upstream job fails.

The useful pattern is capability scoping, not an operating-system preference:

```text
command -> required capabilities -> closed input set -> cheapest valid runner
```

Parity was measured before moving SwiftLint: enabled rules and firing
violations matched across macOS and Linux. Historical path frequency was then
used to estimate how often the macOS lane would run.

The exact dollar figures in the PR are not a reusable fact. The PR used an
older `$0.08` macOS rate; on 2026-08-06 GitHub's published standard rates are
`$0.062` for macOS and `$0.006` for Linux, with each job rounded up to a whole
minute. The roughly 10x relationship remains, but cost reports must record the
rate, source, and observation date used.

## Review Findings That Generalize

Four review corrections are more valuable than the final YAML:

- New Make entry points were initially missing from `.PHONY`, allowing a file
  with the target name to turn a required check into a false pass.
- `git diff --name-only | grep -q` could convert an early-match SIGPIPE into an
  ambiguous pipeline status. A path-scoped `git diff --quiet` removed the
  pipeline; statuses other than `0` (unchanged) and `1` (changed) should fail
  the detector rather than silently select a lane.
- CI initially pinned SwiftLint without constraining local `make lint`, so the
  same public command could enforce a different tool version by PATH order.
- The downloaded release archive initially had no digest verification.

The detector also exposed input-closure economics. Running the gated test
through Make made the whole `Makefile` an input, and unrelated Makefile churn
raised the expensive-lane trigger rate from 1.4% to 7.2%. Calling the hermetic
test directly closed the job over the test, its dependencies, and the workflow
that invokes it.

## Harness Contract To Extract

A change-scoped CI lane should declare or derive:

- its public local aggregate command
- the exact command CI invokes
- required runner capabilities
- the complete transitive input set for conditional dispatch
- the stable required status that aggregates the lane result
- tool versions and downloaded-artifact digests
- whether freshness depends on source, environment, or both

Enforcement belongs in `designengineer check workflow`, not in an agent
reminder. The check should verify that Make-backed entry points are phony,
every conditional lane has positive and negative selector fixtures, detector
errors fail closed, downloaded executables are verified, and a required
aggregate inspects every direct dependency result.

Measure the decision with:

- actual and billed minutes per job
- dated runner rates and resulting cost
- duplicate command executions per pull request
- conditional-lane trigger rate over repository history
- cross-runner rule and violation parity
- false-negative and false-positive selector fixtures
- required-gate failures injected for failed, cancelled, and skipped upstreams

## Application In This Repo

This repo had the same smaller shape: `make check` combined portable Node
rulepacks with a macOS GUI-launchd integration test, and no GitHub workflow
enforced either.

`.github/workflows/admission.yml` now runs `make check-portable` on Linux and
uses the portable job's output to choose the runner for one stable `admission`
job. The final job uses macOS only when `resource-lease.sh`, its test, or the
workflow or selector changes. `tools/paths-changed.sh` preserves Git's
three-way status instead of flattening detector errors; its portable test
leaves fixtures for unrelated changes, watched changes, invalid revisions,
and invalid usage. A weekly run covers environment drift because
launchd-backed behavior is environment-coupled rather than
source-deterministic. The macOS test now fails instead of reporting a skip
when GitHub Actions lacks a GUI launchd domain.

Branch protection is external state: `admission` becomes a merge gate only
after the repository requires the `admission / admission` status.
