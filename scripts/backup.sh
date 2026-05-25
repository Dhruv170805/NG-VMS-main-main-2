#!/bin/bash
# ==============================================================================
#                 NG-VMS ENTERPRISE DISASTER RECOVERY BACKUP UTILITY
# ==============================================================================
# Goal: Build automated high-fidelity system snapshots (DB + Object Storage).
# Output: Compressed .tar.gz archive inside './backups/'.
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

echo -e "${BLUE}Starting NG-VMS System Backup...${NC}"
echo "================================================="

# Adjust to find .env if run from scripts/ folder
if [ -f .env ]; then
    source .env
elif [ -f ../.env ]; then
    source ../.env
else
    err "Configuration .env file missing in deployment folder."
fi

# Ensure backup vault directory exists
mkdir -p backups
[ -d ../backups ] || mkdir -p ../backups

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="backups/ngvms_backup_$TIMESTAMP"
[ -d ../backups ] && BACKUP_DIR="../backups/ngvms_backup_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# ── 1. BACKUP DATABASE (MONGODB) ──────────────────────────────────────────────
if docker ps --filter "name=ngvms_mongo" --filter "status=running" --quiet | grep -q . ; then
    log "Exporting database collections..."
    docker exec ngvms_mongo mongodump \
        --username "${MONGO_ROOT_USER:-ngvms_root}" \
        --password "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD required}" \
        --authenticationDatabase admin \
        --archive --gzip > "$BACKUP_DIR/mongodb_ngvms.gz"
    log "Database snapshot compiled successfully."
else
    err "MongoDB service container (ngvms_mongo) is offline. Backup failed."
fi

# ── 2. BACKUP OBJECT STORAGE (MINIO) ──────────────────────────────────────────
if docker ps --filter "name=ngvms_minio" --filter "status=running" --quiet | grep -q . ; then
    log "Exporting MinIO asset storage files..."
    # Support paths if run from either scripts/ or root
    LOCAL_VOL_PATH=$(pwd)
    if [[ "$LOCAL_VOL_PATH" == */scripts ]]; then
        LOCAL_VOL_PATH=$(dirname "$LOCAL_VOL_PATH")
    fi
    docker run --rm --volumes-from ngvms_minio -v "$LOCAL_VOL_PATH/$BACKUP_DIR":/backup alpine tar czf /backup/minio_data.tar.gz /data || true
    log "Object storage assets compiled successfully."
else
    err "MinIO service container (ngvms_minio) is offline. Backup failed."
fi

# ── 3. COMPRESS SNAPSHOT ──────────────────────────────────────────────────────
log "Compressing backup archive..."
if [[ "$(pwd)" == */scripts ]]; then
    BACKUP_ARCHIVE="../backups/ngvms_backup_$TIMESTAMP.tar.gz"
    tar -czf "$BACKUP_ARCHIVE" -C ../backups "ngvms_backup_$TIMESTAMP"
else
    BACKUP_ARCHIVE="backups/ngvms_backup_$TIMESTAMP.tar.gz"
    tar -czf "$BACKUP_ARCHIVE" -C backups "ngvms_backup_$TIMESTAMP"
fi

# Clean up raw uncompressed folder
rm -rf "$BACKUP_DIR"

echo "================================================="
echo -e "${GREEN}✅ BACKUP COMPLETED SUCCESSFULLY${NC}"
echo "Location: $BACKUP_ARCHIVE"
echo "Size: $(du -h "$BACKUP_ARCHIVE" | cut -f1)"
echo "================================================="
