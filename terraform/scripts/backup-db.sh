#!/bin/bash

# Database Backup Script for Financieramente
# Runs pg_dump inside the postgres container and uploads to Digital Ocean Spaces.
# Schedule (via cron): 0 0,8,16 * * * (3x/day at 00:00, 08:00, 16:00 UTC)
# Logs: /var/log/financieramente/backup.log

set -euo pipefail

LOG_FILE="/var/log/financieramente/backup.log"
TMPFILE=""

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Log helper with timestamp
log() {
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $1" | tee -a "$LOG_FILE"
}

# Cleanup trap: remove temp file on any exit (success or failure)
cleanup() {
    if [ -n "$TMPFILE" ] && [ -f "$TMPFILE" ]; then
        rm -f "$TMPFILE"
        log "Temp file removed: $TMPFILE"
    fi
}
trap cleanup EXIT

log "=========================================="
log "Database Backup Started"
log "=========================================="

# --- Load environment variables ---
ENV_FILE="/opt/financieramente/.env"
if [ ! -f "$ENV_FILE" ]; then
    log "ERROR: Environment file not found at $ENV_FILE"
    exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# Export DO Spaces credentials as AWS env vars (S3-compatible)
export AWS_ACCESS_KEY_ID="${DO_SPACES_KEY}"
export AWS_SECRET_ACCESS_KEY="${DO_SPACES_SECRET}"
# DO Spaces region — hardcoded to nyc3 (no region variable in .env)
export AWS_DEFAULT_REGION="nyc3"

# Validate required variables
for var in DATABASE_URL DO_SPACES_ENDPOINT DO_SPACES_BUCKET; do
    if [ -z "${!var:-}" ]; then
        log "ERROR: Required variable $var is not set in $ENV_FILE"
        exit 1
    fi
done

# --- Guard: verify postgres container is running ---
CONTAINER_NAME="financieramente-postgres-prod"
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "ERROR: Container '$CONTAINER_NAME' is not running. Aborting backup."
    exit 1
fi
log "Container '$CONTAINER_NAME' is running."

# --- Dump step ---
TIMESTAMP="$(date -u '+%Y%m%d_%H%M%S')"
TMPFILE="/tmp/financieramente_${TIMESTAMP}.dump"
log "Creating dump: $TMPFILE"

# pg_dump -Fc using DATABASE_URL directly (as per production .env convention)
if ! docker exec "$CONTAINER_NAME" pg_dump -Fc -d "$DATABASE_URL" > "$TMPFILE"; then
    log "ERROR: pg_dump failed."
    exit 1
fi

DUMP_SIZE="$(du -sh "$TMPFILE" | cut -f1)"
log "Dump created successfully (size: $DUMP_SIZE)."

# --- Upload step ---
DEST_KEY="backups/db/$(basename "$TMPFILE")"
DEST_URI="s3://${DO_SPACES_BUCKET}/${DEST_KEY}"
log "Uploading $TMPFILE to $DEST_URI ..."

if ! aws s3 cp "$TMPFILE" "$DEST_URI" \
        --endpoint-url "$DO_SPACES_ENDPOINT" \
        --region "$AWS_DEFAULT_REGION"; then
    log "ERROR: Upload to DO Spaces failed."
    exit 1
fi
log "Upload successful: $DEST_URI"

# --- Retention step: keep only the 2 most recent backups ---
log "Enforcing retention policy (keep latest 2 backups)..."

# List all objects under backups/db/, extract filenames, sort lexically (timestamps sort naturally)
mapfile -t ALL_OBJECTS < <(
    aws s3 ls "s3://${DO_SPACES_BUCKET}/backups/db/" \
        --endpoint-url "$DO_SPACES_ENDPOINT" \
        --region "$AWS_DEFAULT_REGION" \
    | awk '{print $4}' \
    | sort
)

OBJECT_COUNT="${#ALL_OBJECTS[@]}"
log "Found $OBJECT_COUNT objects in backups/db/."

if [ "$OBJECT_COUNT" -gt 2 ]; then
    # Determine how many to delete (all but the last 2)
    DELETE_COUNT=$(( OBJECT_COUNT - 2 ))
    log "Deleting $DELETE_COUNT old backup(s)..."

    for (( i=0; i<DELETE_COUNT; i++ )); do
        OLD_OBJ="${ALL_OBJECTS[$i]}"
        log "Deleting: $OLD_OBJ"
        aws s3 rm "s3://${DO_SPACES_BUCKET}/backups/db/${OLD_OBJ}" \
            --endpoint-url "$DO_SPACES_ENDPOINT" \
            --region "$AWS_DEFAULT_REGION"
    done
    log "Retention cleanup complete. Kept 2 most recent backups."
else
    log "No cleanup needed ($OBJECT_COUNT backup(s) present, threshold is 2)."
fi

log "=========================================="
log "Database Backup Completed Successfully"
log "=========================================="
