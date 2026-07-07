# Render Server Bootstrap Agent Runbook

Use this as copy/paste context for another app agent when adding a
Render-hosted server, worker, Postgres, and local env bootstrap.

## Prompt To Paste

```text
We need to add a no-dashboard Render server bootstrap for this app, using the
same local patterns as these nearby projects:

- ~/palette/render.yaml
- ~/palette/scripts/server/render-common.sh
- ~/palette/docs/server-deployment.md
- ~/palette/docs/dns-runbook.md
- ~/prettyplease/server/README.md
- ~/prettyplease/server/.env.example
- ~/shaba/.claude/worktrees/server-image-gen/render.yaml
- ~/shaba/.claude/worktrees/server-image-gen/scripts/server/render-bootstrap.sh
- ~/shaba/.claude/worktrees/server-image-gen/server/.env.example
- ~/shaba/.claude/worktrees/server-image-gen/docs/genart-server-plan.md

Goal:
- Create a checked-in Render Blueprint for service shape.
- Create a scriptable Render bootstrap path that can create/update services,
  Postgres, env vars, deploys, and smoke checks without dashboard setup.
- Keep real secrets in the actual gitignored server/.env file, not only in
  .env.example.
- Keep required env minimal. Do not ask me to fill every optional default.

Minimal required secrets for a Shaba-like Node server are:
- RENDER_API_KEY
- AUTH_CODE_PEPPER
- RESEND_API_KEY
- OPENAI_API_KEY or OPENAPI_KEY if this app uses OpenAI image generation

Optional defaults should stay in code or comments unless the app really needs
to override them:
- RENDER_WORKSPACE_ID, otherwise use the active Render workspace
- GITHUB_REPO_URL
- RENDER_BRANCH
- SHABA_RENDER_REGION or app-specific region var
- SHABA_RENDER_SERVICE_PLAN or app-specific service plan var
- SHABA_RENDER_POSTGRES_PLAN or app-specific database plan var
- EMAIL_FROM
- APPLE_CLIENT_ID
- provider budget caps

Secret handling rule:
- Do not print .env files, Render CLI config, Wrangler config, or API keys into
  chat.
- If you need to inspect env files, print key names and status only: blank,
  placeholder, or set.
- If you need to reuse a value from another local file, pipe/copy it directly
  into the target server/.env without displaying it.
- Never use cat on secret-bearing files unless the output is redacted.

Implementation shape:
- Prefer a dedicated worktree for these edits.
- Add render.yaml with web service, optional worker, and Postgres.
- Add scripts/server/check-render.sh, scripts/server/render-common.sh, and
  scripts/server/render-bootstrap.sh.
- The bootstrap script should load server/.env first, then validate required
  secrets.
- The bootstrap script may use Render CLI for validation/deploys and Render API
  for creating/updating Postgres, services, and env vars.
- Remember that Render PUT /env-vars replaces the service env list, so the
  script must own the full env set it writes.
- Split least-privilege envs: web gets auth/email secrets; worker gets provider
  keys.
- Use Render Postgres internal connection string for DATABASE_URL.
- Add migrations/predeploy or a worker schema-version startup gate so workers
  cannot race ahead of migrations.
- Add Make targets for validate and bootstrap.
- Update README with the actual minimal required env list.
- Validate with render blueprints validate, shell syntax checks, git diff
  --check, and the app server verify command.
```

## What To Reuse From Local Projects

`~/palette` is the main reference for deployment posture:

- `render.yaml`: checked-in service shape, `sync: false` for secrets, staging
  auto deploy, production manual deploy.
- `docs/server-deployment.md`: principles: CLI first, staging before
  production, secrets outside the repo.
- `docs/dns-runbook.md`: Cloudflare custom domain flow, only needed when the
  app is ready for DNS/custom domains.
- `scripts/server/render-common.sh`: small helpers for service IDs and
  environment normalization.

`~/prettyplease` is the reference for the smaller app server shape:

- `server/README.md`: compact Node server setup and Render fields.
- `server/.env.example`: auth/email/apple config shape without Palette's
  larger chat/agent surface.

`~/shaba/.claude/worktrees/server-image-gen` is the latest no-dashboard
bootstrap reference:

- `render.yaml`: API service, gen-art worker, and Postgres in one Blueprint.
- `scripts/server/render-bootstrap.sh`: creates/updates infra and env vars via
  Render API, loads `server/.env`, maps `OPENAPI_KEY` to `OPENAI_API_KEY`.
- `server/.env.example`: minimal required bootstrap field plus optional
  defaults as comments.

Do not assume these repos contain live secrets. In the Shaba pass, Palette and
PrettyPlease only had placeholders/blanks for the shared Render/Resend/OpenAI
secrets.

## Safe Secret Inspection

Use this to inspect key presence without printing values:

```bash
redacted_env_status() {
  awk -F= '
    /^[A-Za-z_][A-Za-z0-9_]*=/ {
      key=$1
      value=substr($0, length(key) + 2)
      if (value == "") status="blank"
      else if (value ~ /replace_me|\\.\\.\\.|example|changeme|your_/i) status="placeholder"
      else status="set"
      print FILENAME " " key " " status
    }
  ' "$@"
}

redacted_env_status \
  "$HOME/palette/server/.env" \
  "$HOME/palette/server/.env.example" \
  "$HOME/prettyplease/server/.env" \
  "$HOME/prettyplease/server/.env.example" \
  "server/.env" \
  "server/.env.example" 2>/dev/null
```

Use this to find candidate env/config files without printing values:

```bash
find "$HOME/palette" "$HOME/prettyplease" "$HOME/.config" -maxdepth 5 \
  -type f \( -name ".env" -o -name ".env.*" -o -name "*.env" -o -name "render.env" \) \
  -print 2>/dev/null |
while IFS= read -r file; do
  if rg -q '^(RENDER_API_KEY|RESEND_API_KEY|AUTH_CODE_PEPPER|OPENAI_API_KEY|OPENAPI_KEY|CLOUDFLARE_|CF_)=' "$file"; then
    printf '%s\n' "$file"
    redacted_env_status "$file" |
      rg ' (RENDER_API_KEY|RESEND_API_KEY|AUTH_CODE_PEPPER|OPENAI_API_KEY|OPENAPI_KEY|CLOUDFLARE_|CF_) '
  fi
done
```

## Safe Secret Copy Helpers

These helpers update the target env file without printing the secret. They skip
blank values and obvious placeholders.

```bash
set_env_key_silent() {
  key="$1"
  value="$2"
  dest="$3"

  case "$value" in
    ""|*replace_me*|*changeme*|*your_*|"...")
      return 0
      ;;
  esac

  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { updated=0 }
    /^[A-Za-z_][A-Za-z0-9_]*=/ {
      split($0, parts, "=")
      if (parts[1] == key) {
        print key "=" value
        updated=1
        next
      }
    }
    { print }
    END {
      if (!updated) print key "=" value
    }
  ' "$dest" > "$tmp"
  mv "$tmp" "$dest"
}

copy_env_key_silent() {
  key="$1"
  src="$2"
  dest="$3"

  value="$(
    awk -v key="$key" -F= '
      $1 == key {
        print substr($0, length(key) + 2)
        found=1
        exit
      }
      END {
        if (!found) exit 2
      }
    ' "$src"
  )" || return 0

  set_env_key_silent "$key" "$value" "$dest"
  unset value
}
```

Examples:

```bash
# Copy a real value from another env file if it exists there.
copy_env_key_silent RESEND_API_KEY "$HOME/some-app/server/.env" "server/.env"
copy_env_key_silent AUTH_CODE_PEPPER "$HOME/some-app/server/.env" "server/.env"
copy_env_key_silent OPENAI_API_KEY "$HOME/some-app/server/.env" "server/.env"

# Reuse the Render CLI token as RENDER_API_KEY without printing it.
if [ -f "$HOME/.render/cli.yaml" ]; then
  render_token="$(awk '/^    key:/ { print $2; exit }' "$HOME/.render/cli.yaml")"
  set_env_key_silent RENDER_API_KEY "$render_token" "server/.env"
  unset render_token
fi

# Reuse Wrangler auth only if adding Cloudflare DNS automation.
if [ -f "$HOME/Library/Preferences/.wrangler/config/default.toml" ]; then
  cf_token="$(
    python3 - <<'PY'
import pathlib
import re

path = pathlib.Path.home() / "Library/Preferences/.wrangler/config/default.toml"
match = re.search(r'oauth_token\\s*=\\s*"([^"]+)"', path.read_text())
if match:
    print(match.group(1))
PY
  )"
  set_env_key_silent CLOUDFLARE_API_TOKEN "$cf_token" "server/.env"
  unset cf_token
fi
```

## What Not To Do

- Do not paste prose into zsh as commands. Paste this context into the agent.
- Do not run `cat server/.env`, `cat ~/.render/cli.yaml`, `printenv`, or `env`
  in a way that sends secret values to chat.
- Do not copy placeholders from `.env.example` into the real target env as if
  they were secrets.
- Do not require humans to fill `DATABASE_URL` for Render services when the
  bootstrap can read the internal Render Postgres connection string.
- Do not add Cloudflare as required for a plain Render staging deploy. It is
  only needed for custom domains or DNS automation.

## Verification Checklist

After implementation:

```bash
render blueprints validate render.yaml --output json --confirm
bash -n scripts/server/*.sh
git diff --check
npm --prefix server run verify
```

Adjust the final command to the target repo's server verification target.
