#!/bin/bash
# ==============================================================================
#                 NG-VMS ENTERPRISE DISASTER RECOVERY RESTORE UTILITY
# ==============================================================================
# Goal: Reconstruct database and asset storage from any directory or tar.gz archive.
# Target: Production systems. WARNING: Destructive overwrite sequence.
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

# Load environmental variables
if [ -f .env ]; then
    source .env
else
    err "Configuration .env file missing in current folder."
fi

if [ -z "${1:-}" ]; then
    echo -e "${RED}Usage:${NC} ./restore.sh <backup_path>"
    echo "Examples:"
    echo "  ./restore.sh ./backups/ngvms_backup_2026-05-18_12-00-00.tar.gz"
    echo "  ./restore.sh ./backups/ngvms_backup_2026-05-18_12-00-00"
    exit 1
fi

TARGET_PATH=$1
TEMP_DIR=""

# Check if target is a tar.gz file and exists
if [[ "$TARGET_PATH" == *.tar.gz ]]; then
    if [ ! -f "$TARGET_PATH" ]; then
        err "Backup archive file $TARGET_PATH not found."
    fi
    log "Backup archive detected. Provisioning safe extraction space..."
    TEMP_DIR=$(mktemp -d -p "$(pwd)/backups" -t "restore_tmp_XXXXXXXX")
    tar -xzf "$TARGET_PATH" -C "$TEMP_DIR"
    
    # Find extracted folder nesting
    BACKUP_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
    if [ -z "$BACKUP_DIR" ]; then
        BACKUP_DIR="$TEMP_DIR"
    fi
else
    BACKUP_DIR=$TARGET_PATH
    if [ ! -d "$BACKUP_DIR" ]; then
        err "Backup directory $BACKUP_DIR not found."
    fi
fi

# Cleanup trigger on script cancellation or exit
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        log "Cleaning up extraction workspaces..."
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT

echo -e "${RED}"
echo "======================================================================"
echo "          ⚠️  NG-VMS ENTERPRISE PRODUCTION RESTORE UTILITY ⚠️          "
echo "======================================================================"
echo -e "${NC}"
echo "  Target Source: $TARGET_PATH"
echo "  WARNING: This sequence will permanently drop and overwrite all"
echo "           active database collections and storage buckets."
echo ""
echo -n "  To proceed, type 'CONFIRM': "
read -r CONFIRMATION

if [ "$CONFIRMATION" != "CONFIRM" ]; then
    log "Operation aborted. Exiting safely."
    exit 0
fi

# ── 1. DB RECONSTRUCTION ──────────────────────────────────────────────────────
if [ -f "$BACKUP_DIR/mongodb_ngvms.gz" ]; then
    log "Initiating database reconstruction (mongorestore)..."
    docker exec -i ngvms_mongo mongorestore \
        --username "${MONGO_ROOT_USER:-ngvms_root}" \
        --password "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD required}" \
        --authenticationDatabase admin \
        --drop --gzip --archive < "$BACKUP_DIR/mongodb_ngvms.gz"
    log "Database reconstruction finished."
else
    warn "No database archive 'mongodb_ngvms.gz' found inside backup folder. Bypassing MongoDB restore."
fi

# ── 2. OBJECTS STORAGE RECONSTRUCTION ─────────────────────────────────────────
if [ -f "$BACKUP_DIR/minio_data.tar.gz" ]; then
    log "Initiating asset storage reconstruction..."
    docker run --rm --volumes-from ngvms_minio -v "$(pwd)/$BACKUP_DIR":/backup alpine sh -c "cd /data && rm -rf * && tar xzf /backup/minio_data.tar.gz -C /"
    log "Asset storage reconstruction finished."
else
    warn "No asset storage archive 'minio_data.tar.gz' found inside backup folder. Bypassing MinIO restore."
fi

# ── 3. HEALTH DIAGNOSTIC POST-CHECK ───────────────────────────────────────────
log "Validating active system health..."
if docker exec ngvms_mongo mongosh -u "${MONGO_ROOT_USER:-ngvms_root}" -p "${MONGO_ROOT_PASSWORD}" --authenticationDatabase admin --quiet --eval "db.getMongo().getDBs()" &>/dev/null; then
    echo "======================================================================"
    echo -e "${GREEN}  ✅ PLATFORM SUCCESSFULLY RESTORED${NC}"
    echo "======================================================================"
else
    err "Platform restored, but connectivity checks to MongoDB failed!"
fi
