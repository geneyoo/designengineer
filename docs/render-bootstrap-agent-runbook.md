# Render Server Bootstrap Agent Runbook

Use this contract when adding a Render-hosted API, optional worker, PostgreSQL,
and CLI-first deployment flow to another repository. It is self-contained; it
does not depend on another local checkout or on credentials from another app.

## Desired result

The target repository owns:

```text
render.yaml                         service/database topology
server/.env.example                names and documentation, never values
scripts/server/check-render.sh     static blueprint validation
scripts/server/render-common.sh    shared API/CLI helpers
scripts/server/render-bootstrap.sh create/update staging infrastructure
scripts/server/render-status.sh    sanitized deployed-state report
server/README.md                    exact setup, deploy, verify, and rollback verbs
```

Expose these behind stable commands such as:

```text
make server-render-validate
make server-render-bootstrap ENV=staging
make server-render-deploy-staging COMMIT=<sha>
make server-render-verify-staging COMMIT=<sha>
make server-render-status
```

The checked-in command is the product surface. An agent should not improvise a
different series of dashboard or API calls for each deployment.

## Secret boundary

- Real values live in a gitignored `server/.env`, the Render environment, or a
  designated secret manager.
- `.env.example` contains names, descriptions, and safe defaults only.
- Never search unrelated repositories or machine-global configuration for
  credentials automatically.
- Never print environment files, CLI credential stores, provider tokens,
  database URLs, private keys, or raw request payloads.
- Diagnostics report a key as `missing`, `blank`, `placeholder`, or `set`; they
  never report its value.
- A web service receives only auth/email/database secrets it consumes. A worker
  receives provider keys only when it performs that provider call.
- CI credentials are least-privilege and scoped to the repository/environment.

An app may require keys such as `RENDER_API_KEY`, an auth pepper, an email
provider key, or an image-generation key. The target server README owns the
actual required set. Do not cargo-cult a key merely because another app used
it.

## Blueprint contract

The Blueprint should make topology and non-secret defaults reviewable:

- separate staging and production services;
- API, optional worker, and PostgreSQL declared together when they are one
  deployable system;
- `sync: false` or the provider equivalent for secrets;
- an explicit runtime, region, plan, health check, build command, and start
  command;
- staging auto-deploy only when the repository wants it; production promotion
  stays deliberate;
- an internal PostgreSQL URL for services running inside Render;
- migration/predeploy ownership or a worker schema-version gate;
- bounded worker concurrency and provider spend controls;
- no customer payloads or credentials in logs.

Remember that replacing a service's environment list may delete keys omitted
from the request. A bootstrap script that uses a replace-style API must own and
send the complete intended set, or use a patch endpoint with documented merge
semantics.

## Bootstrap behavior

`render-bootstrap.sh` should:

1. Require an explicit environment, defaulting at most to staging.
2. Load only the target repository's gitignored server env file.
3. Validate required keys by presence/status without printing values.
4. Resolve the Render workspace and existing resources deterministically.
5. Create or update PostgreSQL before dependent services.
6. Create or update services from the checked-in Blueprint shape.
7. Write the complete intended environment with least-privilege separation.
8. Trigger the exact requested commit SHA, not an ambient branch tip.
9. Wait on provider deployment state with a deadline/backoff, not shell sleep.
10. Run a sanitized smoke check and report service IDs, commit SHA, and status.

Make creation idempotent. Retrying the same environment and commit must update
or resume the same resources rather than create duplicates.

## Staging, production, and rollback

Use staging as the proving environment:

```text
validate blueprint
  -> deploy exact SHA to staging
  -> run migrations/predeploy
  -> verify API, worker, and schema version
  -> record sanitized state
  -> explicitly promote the same SHA to production
```

Production commands require both an explicit production verb and a confirmation
value. Rollback redeploys a known prior SHA through the same command surface; it
does not edit services manually in the dashboard.

Capacity and feature toggles should be reversible commands that report before
and after state. A promotion must fail closed when staging is not on the exact
requested SHA or when required verification is stale.

## Verification

The repository should leave one aggregate check behind. A baseline is:

```bash
render blueprints validate render.yaml --output json --confirm
bash -n scripts/server/*.sh
git diff --check
npm --prefix server run verify
```

Broaden it according to risk:

- fixture tests for Blueprint parsing and environment-set construction;
- denial tests for production confirmation and invalid environments;
- migration tests against a real PostgreSQL service in CI;
- idempotency tests with a fake provider API;
- sanitized staging smoke against an exact SHA;
- secret scanning over full Git history.

The handoff is complete when another agent can discover every supported
operation from `make help` and `server/README.md`, execute staging without the
dashboard, and cannot deploy production or disclose a secret by using the
ordinary command path.
