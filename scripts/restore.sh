#!/bin/bash

# NG-VMS Enterprise Restore Utility
# Safely restores MongoDB and MinIO from a specified backup timestamp folder or tar.gz archive.

set -e

# Load environment variables
if [ -f .env ]; then
    source .env
fi

if [ -z "$1" ]; then
    echo "Usage: ./scripts/restore.sh <backup_path>"
    echo "Examples:"
    echo "  ./scripts/restore.sh ./backups/2026-05-18_12-00-00"
    echo "  ./scripts/restore.sh ./backups/2026-05-18_12-00-00.tar.gz"
    exit 1
fi

TARGET_PATH=$1
TEMP_DIR=""

# Check if target is a tar.gz file
if [[ "$TARGET_PATH" == *.tar.gz ]]; then
    if [ ! -f "$TARGET_PATH" ]; then
        echo "[ERROR] Backup archive file $TARGET_PATH not found."
        exit 1
    fi
    echo "[INFO] Detected backup archive. Extracting to temporary directory..."
    TEMP_DIR=$(mktemp -d -p "$(pwd)/backups" -t "restore_tmp_XXXXXXXX")
    tar -xzf "$TARGET_PATH" -C "$TEMP_DIR"
    # Find the actual extracted folder inside the temp dir (basename match)
    BACKUP_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
    if [ -z "$BACKUP_DIR" ]; then
        # Archive was created without parent folder nesting
        BACKUP_DIR="$TEMP_DIR"
    fi
else
    BACKUP_DIR=$TARGET_PATH
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "[ERROR] Backup directory $BACKUP_DIR not found."
        exit 1
    fi
fi

# Setup cleanup on exit
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        echo "[INFO] Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT

echo "================================================="
echo "   ⚠️ NG-VMS ENTERPRISE RESTORE UTILITY ⚠️      "
echo "================================================="
echo "Target Backup Source: $TARGET_PATH"
echo "WARNING: This will overwrite current production data."
echo -n "Type 'CONFIRM' to proceed: "
read -r CONFIRMATION

if [ "$CONFIRMATION" != "CONFIRM" ]; then
    echo "Restore cancelled."
    exit 0
fi

# 1. Mongo Restore
if [ -f "$BACKUP_DIR/mongodb_ngvms.gz" ]; then
    echo "[INFO] Restoring MongoDB data..."
    # Drop existing db before restore to avoid merge conflicts
    docker exec -i ngvms_mongo mongorestore \
      --username "${MONGO_ROOT_USER:-ngvms_root}" \
      --password "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD required}" \
      --authenticationDatabase admin \
      --drop --gzip --archive < "$BACKUP_DIR/mongodb_ngvms.gz"
    echo "[OK] MongoDB restored."
else
    echo "[WARN] No MongoDB backup found in $BACKUP_DIR."
fi

# 2. MinIO Restore
if [ -f "$BACKUP_DIR/minio_data.tar.gz" ]; then
    echo "[INFO] Restoring MinIO Object Storage..."
    docker run --rm --volumes-from ngvms_minio -v "$(pwd)/$BACKUP_DIR":/backup alpine sh -c "cd /data && rm -rf * && tar xzf /backup/minio_data.tar.gz -C /"
    echo "[OK] MinIO restored."
else
    echo "[WARN] No MinIO backup found in $BACKUP_DIR."
fi

# 3. Post-Restore Validation
echo "[INFO] Running post-restore health check..."
if docker exec ngvms_mongo mongosh -u "${MONGO_ROOT_USER:-ngvms_root}" -p "${MONGO_ROOT_PASSWORD}" --authenticationDatabase admin --quiet --eval "db.getMongo().getDBs()"; then
    echo "[OK] Database is responding."
else
    echo "[ERROR] Database validation failed!"
    exit 1
fi

echo "================================================="
echo "   ✅ RESTORE COMPLETED SUCCESSFULLY            "
echo "================================================="
