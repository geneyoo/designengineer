# Cross-Harness PR Handoffs And Reviews

> **Status: WIP — shelved July 14, 2026.** The portable `critique-pr` skill,
> context collector, discovery adapters, and portability check exist as a local
> prototype. The lifecycle CLI, draft-PR factory, hook adapters, structured
> inline-comment publisher, on-demand reviewer runner, and integration command
> described below are proposals only. Do not treat them as shipped behavior.

Resume this work only after testing the local critique skill on a representative
set of real PRs and measuring whether its findings are useful enough to publish.

## Recommendation

The worktree → dedicated branch → PR → independent reviewer → integration
agent workflow is a strong default for multi-agent work. It gives each agent a
bounded write lane, turns the handoff into a durable Git object, and gives the
integrator one auditable unit to accept or reject.

The PR alone is not enough, though. A diff preserves implementation and a chat
preserves transient intent; neither reliably preserves the original problem,
non-goals, or tradeoffs. The durable flow should be:

```text
work order -> isolated implementation -> PR context packet -> independent review -> integration
```

- The work order owns intent before implementation starts.
- The PR body explains the chosen approach and links the work order.
- Verification evidence owns claims about what passed.
- The reviewer tests the PR's claims against code and evidence.
- The integration agent resolves conflicts and reruns gates, but does not
  reinterpret missing product intent.

Enforcement: require a work-order or issue link plus the seven context fields
listed below before a PR can leave draft state. A CI check can grade the body and
report missing fields. Keep this separate from code review; prose generation and
defect detection have different failure modes.

Measurement: compare median integration time, conflict-resolution rework,
reviewer clarification turns, and post-merge reversions before and after the
context gate.

## Shelved lifecycle proposal

The intended author entry point is one provider-neutral shell command:

```text
designengineer work start <issue-or-workorder> --author <codex|claude>
```

`work start` would:

1. assert a clean, current base branch
2. create a machine-readable work order
3. create a dedicated branch and external worktree
4. commit the work order as the branch's first artifact
5. push the branch and open a draft PR immediately
6. populate the PR body from durable intent
7. launch the selected author harness inside the worktree

Opening the draft PR at start makes the PR the work envelope instead of a task
the author must remember at the end. A harness Stop-hook adapter may run
`designengineer work sync --ensure-pr` to refresh context and evidence, but the
draft PR must already exist so hook failure cannot lose the handoff.

The author would eventually run `designengineer work ready` to validate required
checks, update evidence for the current head SHA, and mark the PR ready. Readiness
must not trigger a reviewer.

Review is explicitly on demand:

```text
designengineer work review <pr> --with <codex|claude>
```

The review command would start a fresh isolated agent, run the shared
`critique-pr` workflow, bind the result to the current head SHA, and publish one
neutral review. A `--dry-run` mode would render the proposed inline comments and
review body without writing to GitHub. Repeating the command for an unchanged
head would return the existing review; a new head would require a new explicit
invocation.

An optional GitHub entry point may translate a trusted collaborator's exact
top-level comment into the same command:

```text
/designengineer review claude
```

There must be no triggers on PR creation, `ready_for_review`, or `synchronize`.
The product judgment is that general automatic reviewers produce too much noise
and often run at the wrong milestone. Automation should guarantee isolation,
the draft PR, context capture, and publication mechanics—not decide when review
is valuable.

The final integration verb remains deliberate:

```text
designengineer work integrate <pr>
```

It would assert the reviewed head SHA, required checks, and unresolved blocking
findings before staging the exact reviewed commit into the integration lane.

Enforcement proposal: lifecycle state lives in the work order; local hooks fence
the author worktree and ensure a PR exists; the reviewer runner is invoked only
by the explicit command; a deterministic publisher validates every inline path
and line against the current diff; integration rejects stale review evidence.

Measurement proposal: PR-wrap failure rate, missing context fields, manual review
invocations per PR, accepted findings per published finding, duplicate reviews,
stale-SHA blocks, and post-integration rework.

## Context contract

Every agent-authored PR should make these fields recoverable:

1. problem
2. intended outcome
3. non-goals or boundary
4. approach
5. tradeoffs
6. verification evidence tied to the reviewed head SHA
7. requested review focus

PR descriptions should state which claims are observed, which are inferred, and
which remain unverified. Commit history is useful evidence, but it is not a
substitute for this contract.

PR [geneyoo/shaba#24](https://github.com/geneyoo/shaba/pull/24) is a strong
exemplar: all seven fields are present, and the boundary explicitly avoids
claiming finished art quality. Its remaining review value comes from checking
whether stated invariants are wired into runtime behavior and whether the test
corpus matches the claimed rollout surface.

Practical implication: use this PR body as the initial authoring exemplar, then
make completeness a check rather than relying on every author agent to remember
the shape.

## One skill, two discovery adapters

Claude Code and Codex both consume the open Agent Skills `SKILL.md` format.
Claude discovers project skills under `.claude/skills` and invokes them as
`/skill-name`; Codex discovers repo skills under `.agents/skills` and invokes
them through `$skill-name` or the `/skills` picker. Custom prompts are deprecated
in Codex, so a new repo workflow should not target its older
`/prompts:name` surface. [Claude skills documentation](https://code.claude.com/docs/en/slash-commands),
[Codex skills documentation](https://learn.chatgpt.com/docs/build-skills.md),
[Codex custom prompts documentation](https://learn.chatgpt.com/docs/custom-prompts.md).

This repo keeps one canonical skill at `.agent-skills/critique-pr` and exposes
it through symlinks in both discovery directories. `make check` validates that
the symlinks resolve to the canonical directory and that `SKILL.md` uses only
the portable `name` and `description` frontmatter fields.

Practical implication: the workflow is interoperable, but the literal keystroke
is not identical in the two clients today:

- Claude Code: `/critique-pr <PR>`
- Codex: `$critique-pr <PR>`, or select it from `/skills`
- Either: ask in plain language to critique the PR and allow description-based
  skill selection

Do not duplicate the skill into two files just to manufacture command parity;
that trades one small invocation difference for permanent behavioral drift.

## Capability, bias, risk, and overlap

| Artifact | Capability added | Behavior biased | Main risk | Overlap |
|---|---|---|---|---|
| `collect-pr-context.mjs` | Reads PR metadata, checks, reviews, and local checkout state | None beyond labeling untrusted input and checkout mismatch | GitHub authentication or unavailable network | Wraps `gh`; it does not replace GitHub |
| `critique-pr/SKILL.md` | No new external capability | Findings-first, claim-vs-code, independent integration review | Model judgment and false positives | Complements deterministic checks and vendor review products |
| Discovery symlinks | Makes one skill visible to both harnesses | Keeps behavior identical | Harness-specific symlink handling changes | Small adapter over the shared skill standard |
| On-demand review runner | Starts a fresh reviewer and can publish one review | Review occurs only at a chosen milestone | Secret exposure, prompt injection, duplicate/noisy comments, cost | Uses provider actions as execution adapters, not automatic reviewers |

The distinction matters: the helper supplies facts, the skill supplies review
behavior, and CI or hooks enforce contracts. A prompt should not be described as
an enforcement mechanism.

## On-demand review choice

Start with explicit local invocation and neutral, read-only output. It is cheap
to tune and makes false positives visible before they become permanent PR noise.
Add publishing as an explicit mode only after the output contract is stable.

For managed automation, Codex can review automatically when a PR opens and uses
repo `AGENTS.md` review guidance; its hosted GitHub reviewer intentionally
focuses on high-priority findings. Claude Code Review supports once-on-open,
every-push, and manual modes, and accepts review-specific `REVIEW.md` guidance.
[Codex GitHub review documentation](https://learn.chatgpt.com/docs/third-party/github.md),
[Claude Code Review documentation](https://code.claude.com/docs/en/code-review).

The decision for this proposal is not to use either product's automatic review
trigger. For a custom cross-provider command, keep the invocation and
publication contract provider-neutral and make the model runner an adapter:

- Claude adapter: check out the PR, then pass `/critique-pr <PR URL>` to
  `anthropics/claude-code-action`.
- Codex adapter: check out the PR, then pass `$critique-pr <PR URL>` to
  `openai/codex-action`; the action also supports a repository prompt file.

Both official actions support explicit prompts and can serve as execution
adapters behind an on-demand command. [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions),
[OpenAI Codex Action](https://github.com/openai/codex-action).

An on-demand GitHub runner should accept only `workflow_dispatch` or a trusted
collaborator's exact top-level command. Use read-only contents permission for
analysis. Treat the PR body, diff, comments, images, and repo instructions as
untrusted. Do not expose write tokens or provider secrets to untrusted fork code.
Only a separate, tightly scoped publication step should receive permission to
add one neutral review, marked with the reviewed head SHA to prevent duplicates.
The Codex action's security guidance explicitly treats PR-controlled repo
instructions as part of the untrusted surface.
[Codex Action security guidance](https://github.com/openai/codex-action/blob/main/docs/security.md).

Practical implication: `work ready` records readiness; only `work review`
creates a review. New pushes never retrigger review implicitly.

## Integration-agent guardrails

The main-branch agent is useful as a merge queue, but it can become a context
bottleneck. Keep its authority narrow:

- integrate only a reviewed head SHA
- refuse unresolved blocking findings
- record conflict resolutions separately from the feature's commits
- rerun checks after conflict resolution against the integrated tree
- preserve the work order and PR in the merge record
- never let the author agent self-approve its own work
- use stacked PRs when units depend on one another instead of silently merging
  dependencies into unrelated branches

Enforcement: a merge assertion should require the expected head SHA, required
check conclusions, and no unresolved blocking review marker. Conflict-resolution
commits should invalidate prior verification evidence.

Measurement: track integration queue time, stale-head attempts, post-conflict
test failures, and the number of conflict commits that lack new evidence.

## Rollout measures

Track these before promoting the lifecycle proposal beyond WIP:

| Claim | Measure |
|---|---|
| PRs carry enough intent for a fresh reviewer | context fields present/partial/missing; clarification turns per PR |
| Reviews are useful | accepted findings divided by published findings; author reactions; duplicate rate |
| Reviews improve integration | time-to-merge, rework commits after review, post-merge reversions |
| On-demand review is efficient | time to first useful finding, run cost, review-on-unchanged-head rate |
| The integrator stays in lane | stale-head blocks, conflicts with new evidence, unauthorized branch mutations |

Implement the on-demand publisher only after a representative sample shows an
acceptable finding-acceptance rate and low duplicate/noise rate. Until then,
generate the review in chat and let a human or integration agent decide whether
to publish it. Automatic review triggering is explicitly out of scope.
