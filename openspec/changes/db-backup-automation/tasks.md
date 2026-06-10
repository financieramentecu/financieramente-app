# Tasks: Automated PostgreSQL Backup to Digital Ocean Spaces

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~130–160 (3 file mods + 1 new shell script) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | N/A — single PR |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 4 file changes shipped together | PR 1 | Self-contained; no mid-state deploy risk |

> Note on Strict TDD Mode: This change ships no application code. All changed files are shell scripts and CI/CD YAML. The Vitest suite (`npm run test:unit`) is unaffected. Verification is operational: `bash -n` syntax check + shellcheck + manual prod run. TDD cycle does not apply to this change.

---

## Phase 1: Foundation — Remove Broken Service & Resolve Open Questions

- [x] 1.1 Confirmed: `.env` on prod contains `DATABASE_URL`. Per user clarification, use `pg_dump -d "$DATABASE_URL"` directly.
- [x] 1.2 Region strategy: hardcode `AWS_DEFAULT_REGION=nyc3` per user clarification.
- [x] 1.3 Remove the entire `backup:` service block from `docker/docker-compose.prod.yml`. Verified `docker compose config` parses cleanly after removal.

## Phase 2: Core Implementation — Backup Script

- [x] 2.1 Create `terraform/scripts/backup-db.sh` with `set -euo pipefail` shebang, `log()` timestamp helper writing to `/var/log/financieramente/backup.log`, and `trap` for temp-file cleanup on any exit.
- [x] 2.2 Add credential setup block: `set -a; source /opt/financieramente/.env; set +a`, then `export AWS_ACCESS_KEY_ID="$DO_SPACES_KEY"` and `export AWS_SECRET_ACCESS_KEY="$DO_SPACES_SECRET"`, plus `AWS_DEFAULT_REGION=nyc3`.
- [x] 2.3 Add container guard: `docker ps --format '{{.Names}}' | grep -q financieramente-postgres-prod` — on failure log error and `exit 1`.
- [x] 2.4 Add dump step: `docker exec financieramente-postgres-prod pg_dump -Fc -d "$DATABASE_URL" > /tmp/financieramente_$(date -u +%Y%m%d_%H%M%S).dump`. Filename assigned to variable for reuse.
- [x] 2.5 Add upload step: `aws s3 cp "$TMPFILE" "s3://$DO_SPACES_BUCKET/backups/db/..." --endpoint-url "$DO_SPACES_ENDPOINT"` — exit non-zero on aws failure, log error.
- [x] 2.6 Add retention step (runs only after successful upload): list `s3://$DO_SPACES_BUCKET/backups/db/`, awk `$4`, sort, keep newest 2 via mapfile+array. Guard: skip if <= 2 objects.
- [x] 2.7 Temp cleanup via `trap cleanup EXIT` (runs regardless of outcome). Log successful completion.

## Phase 3: Infrastructure — awscli Installation

- [x] 3.1 In `terraform/scripts/setup-droplet.sh`, add `awscli` to the existing `apt-get install -y` essential-packages block (idempotent; no new block needed).
- [x] 3.2 In `.github/workflows/deploy-prod.yml`, add a bootstrap step before the copy step: `ssh ... "command -v aws > /dev/null 2>&1 || apt-get install -y awscli"` to handle existing servers.

## Phase 4: CI/CD Wiring — Deploy Workflow

- [x] 4.1 In the scp/copy step of `.github/workflows/deploy-prod.yml`, add `backup-db.sh` to the files transferred to the prod droplet (mirroring how `ssl-renew.sh` is scp'd). Added `chmod +x` for the script on the remote.
- [x] 4.2 Add idempotent cron injection step in `.github/workflows/deploy-prod.yml` following the ssl-renew pattern: `(crontab -l 2>/dev/null | grep -v 'backup-db.sh' || true; echo "0 0,8,16 * * * /opt/financieramente/terraform/scripts/backup-db.sh >> /var/log/financieramente/backup.log 2>&1") | crontab -`. Step runs after awscli bootstrap and copy steps.

## Phase 5: Verification

- [x] 5.1 Run `bash -n terraform/scripts/backup-db.sh` locally — exits 0 (syntax OK).
- [x] 5.2 Run `shellcheck terraform/scripts/backup-db.sh` — exits 0, no warnings (shellcheck 0.11.0).
- [ ] 5.3 Trigger a manual run on prod after deploy: `ssh prod /opt/financieramente/terraform/scripts/backup-db.sh` — assert exit 0, object appears in `backups/db/`, exactly 2 objects remain, `/tmp` has no leftover dump file.
- [ ] 5.4 Tail `/var/log/financieramente/backup.log` and confirm timestamped log lines are present.
- [ ] 5.5 Download the newest dump object and run `pg_restore --list` on it to assert it is a valid Fc-format archive.
- [ ] 5.6 Confirm crontab on prod shows exactly one `backup-db.sh` entry. Re-run deploy; confirm no duplicates appear.
