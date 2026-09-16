#!/bin/bash
set -e

BACKUP_DIR="/var/backups/svil-crm/daily"
DB_SOURCE="/var/www/svil-crm/prisma/dev.db"
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')

mkdir -p "$BACKUP_DIR"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting automated daily database backup..."

if [ ! -f "$DB_SOURCE" ]; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: Database file $DB_SOURCE does not exist!" >&2
    exit 1
fi

DEST_FILE="$BACKUP_DIR/dev_${TIMESTAMP}.db"

# Copy database
cp "$DB_SOURCE" "$DEST_FILE"

# Compress backup with gzip
gzip -f "$DEST_FILE"

FILE_SIZE=$(du -h "${DEST_FILE}.gz" | cut -f1)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup created: ${DEST_FILE}.gz ($FILE_SIZE)"

# Retention: Delete backups older than 30 days
find "$BACKUP_DIR" -name "dev_*.db.gz" -type f -mtime +30 -exec rm -f {} +

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Retention check complete (retained 30 days). Backup finished successfully."
