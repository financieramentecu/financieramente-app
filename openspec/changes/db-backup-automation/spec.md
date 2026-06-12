# db-backup-automation Specification

## Purpose

Automated, scheduled PostgreSQL backups from production to Digital Ocean Spaces.
Replaces a broken Docker-based backup service with a reliable shell script + cron approach that matches the existing ssl-renew pattern.

---

## Requirements

### Requirement: Backup Script Execution

The backup script MUST perform a complete dump-upload-cleanup cycle in a single run.

Steps in order:
1. Verify the `financieramente-postgres-prod` container is running; exit non-zero and log error if not.
2. Execute `pg_dump -Fc` inside the container to produce a compressed binary dump.
3. Write the dump to a local temp path under `/tmp/` with a UTC-timestamped filename (`financieramente_YYYYMMDD_HHMMSS.dump`).
4. Upload the file to DO Spaces under the `backups/db/` prefix via `aws s3 cp` with `--endpoint-url $DO_SPACES_ENDPOINT`.
5. Delete the local temp file immediately after a successful upload.
6. On any failure, log the error to `/var/log/backup-db.log` and exit non-zero. MUST NOT crash other services.

#### Scenario: Successful run

- GIVEN the postgres container is running and DO Spaces credentials are present in `/opt/financieramente/.env`
- WHEN the backup script executes
- THEN a compressed dump file is uploaded to `backups/db/` in DO Spaces
- AND no temp file remains under `/tmp/` after the run

#### Scenario: Postgres container not running

- GIVEN the `financieramente-postgres-prod` container is stopped
- WHEN the backup script executes
- THEN the script exits non-zero
- AND an error message is appended to `/var/log/backup-db.log`
- AND no partial temp file is left behind

#### Scenario: Upload fails (network or credentials error)

- GIVEN the container is running but the DO Spaces upload fails
- WHEN the backup script executes
- THEN the script exits non-zero
- AND the error is logged to `/var/log/backup-db.log`
- AND the local temp file is deleted regardless of upload outcome

---

### Requirement: Backup Schedule

The backup script MUST run exactly 3 times per day on the production droplet.

The cron entry MUST be: `0 0,8,16 * * *` (UTC).
Cron injection MUST follow the existing `ssl-renew` pattern in `.github/workflows/deploy-prod.yml`.

#### Scenario: Cron installed during deploy

- GIVEN a production deployment runs
- WHEN the cron injection step executes
- THEN the crontab on the prod droplet contains exactly one entry for `backup-db.sh` matching `0 0,8,16 * * *`
- AND re-running the deploy does not create duplicate cron entries

#### Scenario: Cron fires at scheduled time

- GIVEN the cron entry is installed
- WHEN the system clock reaches 00:00, 08:00, or 16:00 UTC
- THEN the backup script executes automatically

---

### Requirement: Retention Policy

After each successful upload, the backup script MUST enforce a fixed retention of exactly 2 objects in `backups/db/`.

The script MUST list all objects under the `backups/db/` prefix, sort them by name (timestamp sort), and delete every object except the two most recent.

#### Scenario: More than 2 backups exist after upload

- GIVEN 2 or more backup objects already exist in `backups/db/`
- WHEN a new backup is uploaded successfully
- THEN all objects except the 2 most recently timestamped are deleted
- AND exactly 2 objects remain in `backups/db/`

#### Scenario: Fewer than 2 backups exist after upload

- GIVEN 0 or 1 backup objects exist in `backups/db/`
- WHEN a new backup is uploaded successfully
- THEN no objects are deleted
- AND all existing objects are retained

#### Scenario: Retention runs only after successful upload

- GIVEN the upload step failed
- WHEN the script handles the error
- THEN the retention/delete step is NOT executed

---

### Requirement: awscli Installation

`awscli` (v2) MUST be installed on the production droplet so the backup script can use `aws s3 cp`.

Installation MUST be added to `terraform/scripts/setup-droplet.sh` for new droplets.
A bootstrap step MUST be added to `.github/workflows/deploy-prod.yml` to install awscli on existing servers that do not yet have it.

#### Scenario: First deploy after this change on existing server

- GIVEN awscli is not yet installed on the prod droplet
- WHEN the deploy workflow runs the bootstrap step
- THEN awscli is installed before the cron injection step executes
- AND the backup script can execute `aws s3 cp` without a "command not found" error

#### Scenario: New droplet provisioned via setup-droplet.sh

- GIVEN a new droplet is provisioned using `setup-droplet.sh`
- WHEN the setup script completes
- THEN awscli is installed and available on PATH

---

### Requirement: Remove Broken Backup Service

The `backup` service MUST be removed from `docker/docker-compose.prod.yml`.

#### Scenario: Compose file updated

- GIVEN `docker/docker-compose.prod.yml` contained a `backup` service block
- WHEN this change is applied
- THEN no `backup` service block exists in `docker/docker-compose.prod.yml`
- AND `docker compose up` on the prod server starts without the broken backup container

---

### Requirement: Failure Isolation

Backup failures MUST NOT affect application availability or the deploy workflow outcome.

The cron job runs independently of the application process. A non-zero exit from the backup script MUST only produce a log entry — it MUST NOT stop the app, stop any other container, or fail the deploy pipeline.

#### Scenario: Backup fails mid-deploy

- GIVEN the deploy workflow has just run
- WHEN the backup cron fires and fails (e.g., bad credentials)
- THEN the application containers continue running normally
- AND the deploy pipeline exit code is not affected
- AND the failure is recorded in `/var/log/backup-db.log`

#### Scenario: Multiple consecutive failures

- GIVEN the backup script has failed on 3 consecutive runs
- WHEN the fourth scheduled run executes
- THEN the script still attempts the backup (no circuit-breaker or skip logic)
- AND each failure is logged independently to `/var/log/backup-db.log`
