# Server Job Hardening Checklist

Use this when adding or auditing server-side async jobs, especially jobs that
call slow third-party APIs, process user uploads, or run in deployable workers.

## Queue Ownership

- [ ] Jobs have a durable status model: `queued`, `running`, `succeeded`, and
  explicit terminal failure states.
  - Enforcement: store tests cover every terminal transition.
- [ ] A worker claim writes `locked_by`, `locked_at`, and increments attempts in
  one transaction.
  - Enforcement: claim query uses row locking or an equivalent atomic compare.
- [ ] Running jobs have a lease timeout and stale-running recovery.
  - Enforcement: recovery test proves interrupted jobs requeue or fail.
- [ ] Long jobs renew their lease before the stale timeout.
  - Enforcement: worker logs `lease_renewed`; store update only succeeds for
  `status='running'` and the owning `locked_by`.
- [ ] Terminal writes are guarded by lease ownership.
  - Enforcement: worker skips success/failure writes when lease renewal fails.

## Bounded Work

- [ ] Every external API call has a timeout.
  - Enforcement: provider tests simulate a hanging request and expect a timeout
  error code.
- [ ] Retryable failures have attempt limits and backoff.
  - Enforcement: tests cover retryable vs terminal classifications.
- [ ] User-visible polling can always reach a terminal state.
  - Enforcement: poll response includes `pollAfterSeconds`, `failureCode`, and a
  generic `failureMessage`.

## Upload Safety

- [ ] Upload routes enforce content type, sniffed MIME, file count, byte limits,
  and field limits.
  - Enforcement: route tests cover oversized, missing, duplicate, and invalid
  uploads.
- [ ] Raw user inputs have a retention window and cleanup path.
  - Enforcement: terminal and expired paths delete source inputs.
- [ ] Moderation blocks map to safe generic client messages.
  - Enforcement: tests assert machine code plus generic copy, without leaking
  provider details.

## Observability

- [ ] Logs include job id, owner kind, attempt, provider/model, status, duration,
  request id, and safe size metadata.
  - Enforcement: tests or log snapshots assert no prompts, tokens, or raw input
  bytes are logged.
- [ ] Workers emit heartbeat logs with memory usage.
  - Enforcement: deploy smoke checks inspect worker logs or metrics after a job.
- [ ] External provider request IDs are captured on success and failure.
  - Enforcement: provider wrapper returns or throws request id metadata.

## Deploy Smoke

- [ ] A deploy smoke test exercises the public client flow, not private internals:
  create auth/session, upload, poll, fetch manifest, fetch one asset.
  - Enforcement: one command exits nonzero if the job fails, times out, or lacks
  expected output.
- [ ] Paid-provider smoke tests are explicit opt-in.
  - Enforcement: remote smoke requires an allow flag or CI secret.
- [ ] Smoke jobs use harmless generated fixtures by default.
  - Enforcement: no private user photos or production-only identifiers are
  required.

## Alert Candidates

- [ ] Worker restart or crash loop.
- [ ] Job `running` longer than lease plus grace period.
- [ ] Repeated `worker_interrupted` for one job.
- [ ] Provider timeout or 5xx rate above baseline.
- [ ] Memory RSS above expected peak.
- [ ] Smoke test failure after deploy.
