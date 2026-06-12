# Proposal: Automated PostgreSQL Backups to Digital Ocean Spaces

## Intent

Production has NO working offsite backup. The existing `backup` service in `docker-compose.prod.yml` is broken: it dumps locally only (never uploads to DO Spaces), runs once/day instead of the required cadence, retains 7 days instead of a fixed file count, and uses `restart: "no"` so it dies after the first loop. A droplet failure or volume loss means total data loss. We need reliable, automated, offsite backups now.

## Scope

### In Scope
- New `terraform/scripts/backup-db.sh`: dump via `docker exec ... pg_dump -Fc`, upload to DO Spaces (S3-compatible via `aws-cli`), retain last 2 objects, clean up local temp file.
- Cron injection (`0 0,8,16 * * *` UTC, 3x/day) added to `.github/workflows/deploy-prod.yml`, following the existing ssl-renew cron pattern.
- `aws-cli` install added to `terraform/scripts/setup-droplet.sh` plus a bootstrap step in the deploy workflow so existing servers get it before first run.
- Remove the broken `backup` service from `docker/docker-compose.prod.yml`.

### Out of Scope
- Automated restore tooling / restore runbook (manual restore documented only).
- Backup encryption at rest beyond DO Spaces defaults.
- QA-environment backups (prod only this change).
- Backup verification / integrity checks beyond upload success.
- Alerting/monitoring integration for backup failures (logs to file only).

## Capabilities

### New Capabilities
- `db-backup-automation`: scheduled production database dump, offsite upload to DO Spaces, and fixed-count retention.

### Modified Capabilities
- None

## Approach

Approach A from exploration — shell script + system cron on the prod droplet. Rationale: cron is already managed by the deploy workflow, DO Spaces credentials already live in `/opt/financieramente/.env`, scripts are already rsync'd to the server, and `ssl-renew.sh` is a proven precedent. `pg_dump -Fc` produces compressed dumps; `aws s3` with `--endpoint-url $DO_SPACES_ENDPOINT` makes DO Spaces fully S3-compatible. Backups go under a dedicated `backups/db/` prefix to avoid colliding with the app's `prod/` upload prefix. Retention lists, sorts by timestamped filename, and deletes all but the latest 2.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `terraform/scripts/backup-db.sh` | New | Dump, upload, retain, cleanup |
| `.github/workflows/deploy-prod.yml` | Modified | Add backup cron + aws-cli bootstrap |
| `terraform/scripts/setup-droplet.sh` | Modified | Install aws-cli on bootstrap |
| `docker/docker-compose.prod.yml` | Modified | Remove broken `backup` service |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `aws-cli` missing on existing prod server | High | Bootstrap install step in deploy workflow before first cron run |
| Prefix collision with app uploads (`prod/`) | Med | Use dedicated `backups/db/` prefix |
| Postgres container down at dump time | Med | Check container is running before dumping; exit non-zero + log |
| `/tmp` fills with dump files | Low | `-Fc` compression + delete local file immediately after upload |
| Retention deletes wrong objects | Low | Timestamped filenames guarantee sortable, deterministic ordering |

## Rollback Plan

The change is additive at runtime. To revert: remove the backup cron line from the server crontab (and from `deploy-prod.yml`), delete `backup-db.sh`, and `git revert` the commits. Restore the previous `backup` service block in `docker-compose.prod.yml` if its (broken) behavior is needed temporarily. No schema or app-code changes are involved, so no data migration to undo.

## Dependencies

- DO Spaces credentials present in `/opt/financieramente/.env` (already configured).
- `financieramente-postgres-prod` container running on the droplet.

## Success Criteria

- [ ] Backups appear in DO Spaces under `backups/db/` at 00:00, 08:00, 16:00 UTC.
- [ ] Exactly the 2 most recent dump objects are retained after each run.
- [ ] A backup can be downloaded and successfully restored with `pg_restore`.
- [ ] No local temp dump files remain on the droplet after a run.
- [ ] The broken `backup` service is gone from `docker-compose.prod.yml`.
