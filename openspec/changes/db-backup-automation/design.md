# Design: Automated PostgreSQL Backups to Digital Ocean Spaces

## Technical Approach

System-cron + shell-script on the prod droplet, following the existing `ssl-renew.sh` precedent. A new `terraform/scripts/backup-db.sh` sources `/opt/financieramente/.env`, runs `pg_dump -Fc` inside the running `financieramente-postgres-prod` container, uploads the compressed dump to DO Spaces (`backups/db/` prefix) via aws-cli, prunes to the latest 2 objects, and removes the local temp file. aws-cli is installed in `setup-droplet.sh` (new servers) and bootstrapped in `deploy-prod.yml` (existing server). The broken `backup` service is removed from `docker-compose.prod.yml`.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|----------|--------|-----------------------|-----------|
| Scheduler | System cron via deploy workflow | docker `backup` service; DO managed backups | Mirrors proven `ssl-renew.sh` pattern; creds + scripts already on server; the docker service was the broken thing we're replacing |
| Dump method | `docker exec ... pg_dump -Fc` | mount-volume dump; `psql` plain SQL | `-Fc` is compressed + `pg_restore`-ready; exec needs no extra volume; container already runs |
| S3 client | aws-cli + `--endpoint-url` | `s3cmd`; `rclone`; DO API | DO Spaces is S3-compatible; aws-cli is the standard, scriptable, env-var-driven |
| Credential mapping | Export `DO_SPACES_KEY/SECRET` as `AWS_ACCESS_KEY_ID/SECRET_ACCESS_KEY` | `~/.aws/credentials` file | No persisted secret on disk; ephemeral per-run env; `.env` is the single source |
| Retention | `aws s3 ls` sorted, delete all but newest 2 | `--mtime` find; lifecycle policy | Timestamped filenames give deterministic lexical sort; no DO lifecycle config needed |
| Log location | `/var/log/financieramente/backup.log` | flat `/var/log/financieramente-backup.log` | Matches existing logrotate glob `/var/log/financieramente/*.log` (setup-droplet.sh) |
| Script delivery | scp in deploy-prod.yml copy step | rely on rsync | Scripts are NOT auto-rsync'd; the existing step scp's ssl scripts explicitly — add backup-db.sh there |

## Data Flow

```
cron (0,8,16 UTC) ──► backup-db.sh
   │  source /opt/financieramente/.env  (DO_SPACES_*, POSTGRES_*)
   │  guard: docker ps financieramente-postgres-prod running? ──no──► log + exit 1
   ▼
docker exec pg_dump -Fc ──► /tmp/backup_<ts>.dump
   ▼
aws s3 cp --endpoint-url $DO_SPACES_ENDPOINT ──► s3://$BUCKET/backups/db/backup_<ts>.dump
   ▼
aws s3 ls backups/db/ | sort | head -n -2 ──► aws s3 rm (old objects)
   ▼
rm /tmp/backup_<ts>.dump ──► all stdout/stderr ──► /var/log/financieramente/backup.log
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `terraform/scripts/backup-db.sh` | Create | `set -euo pipefail`, `log()` timestamp helper, source `.env`, export AWS creds from `DO_SPACES_*`, container guard, `pg_dump -Fc`, upload, retention (keep 2), temp cleanup, non-zero exit on any failure |
| `terraform/scripts/setup-droplet.sh` | Modify | Add `apt-get install -y awscli` to essential-packages block (idempotent) |
| `.github/workflows/deploy-prod.yml` | Modify | (a) scp `backup-db.sh` + `chmod +x` in the copy step; (b) bootstrap `apt-get install -y awscli` if missing; (c) idempotent cron injection following ssl-renew pattern |
| `docker/docker-compose.prod.yml` | Modify | Remove entire broken `backup:` service (lines ~120-147) |

## Interfaces / Contracts

Credential + config mapping inside `backup-db.sh`:

```bash
set -a; source /opt/financieramente/.env; set +a
export AWS_ACCESS_KEY_ID="$DO_SPACES_KEY"
export AWS_SECRET_ACCESS_KEY="$DO_SPACES_SECRET"
# $DO_SPACES_ENDPOINT already includes region: https://<region>.digitaloceanspaces.com
# aws s3 still needs a --region flag; derive or pin (e.g. nyc3) — see Open Questions
```

Cron line (idempotent injection, ssl-renew style — note `terraform/scripts` path, not `/opt/scripts`):

```bash
(crontab -l 2>/dev/null | grep -v 'backup-db.sh' || true
 echo "0 0,8,16 * * * /opt/financieramente/terraform/scripts/backup-db.sh >> /var/log/financieramente/backup.log 2>&1") | crontab -
```

Retention (keep newest 2; filenames sort lexically by timestamp):

```bash
aws s3 ls "s3://$DO_SPACES_BUCKET/backups/db/" --endpoint-url "$DO_SPACES_ENDPOINT" \
  | awk '{print $4}' | sort | head -n -2 \
  | while read -r obj; do aws s3 rm "s3://$DO_SPACES_BUCKET/backups/db/$obj" --endpoint-url "$DO_SPACES_ENDPOINT"; done
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | n/a (shell infra, no app code) | `bash -n backup-db.sh` syntax check; `shellcheck` if available |
| Integration | Dump→upload→retention→cleanup on droplet | Manual run on prod; assert object appears in `backups/db/`, exactly 2 retained, `/tmp` empty |
| E2E | Restore validity | Download newest dump, `pg_restore` into throwaway DB (manual, per success criteria) |

This change ships no application code, so it sits OUTSIDE the strict-TDD app test suite. Verification is operational (run + inspect), not Vitest-based.

## Migration / Rollout

Additive at runtime. Order: (1) merge script + workflow changes; (2) deploy installs aws-cli + injects cron + removes backup service; (3) wait for next 00/08/16 UTC slot or trigger manually. No schema/data migration. Rollback per proposal: strip cron line, remove script, git revert.

## Open Questions

- [ ] aws-cli `s3` requires a region; `DO_SPACES_ENDPOINT` embeds it in the host but aws still needs `--region`/`AWS_DEFAULT_REGION`. Pin a value (e.g. `nyc3`) or parse it from the endpoint host? Recommend deriving from endpoint to avoid a second config source.
- [ ] Confirm `.env` on the server actually contains `POSTGRES_USER`/`POSTGRES_DB` (workflow writes them) so the container guard + `pg_dump -U $POSTGRES_USER $POSTGRES_DB` resolve correctly.
