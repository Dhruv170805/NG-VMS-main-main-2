#!/bin/bash
# NG-VMS Enterprise Bundler — produces a client-deliverable with NO source code
# Images are built immutably via GitHub Actions CI/CD and pushed to GHCR.
# This script packages all deployment config files for the client bundle.
# Usage: ./bundle.sh [version]

set -euo pipefail

# Ensure we run from the project root
cd "$(dirname "$0")/.."
VERSION="${1:-2.1.1}"
BUNDLE_DIR="ngvms-enterprise-v${VERSION}"
OUTPUT="${BUNDLE_DIR}.tar.gz"
IMAGES_TAR="ngvms-images.tar"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
die()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }

echo "=================================================="
echo "   📦 NG-VMS ENTERPRISE BUNDLER v${VERSION}"
echo "=================================================="

# ── Prereqs ────────────────────────────────────────────────────────────────
command -v docker  &>/dev/null || die "Docker not found"
docker compose version &>/dev/null || die "Docker Compose v2 not found"
command -v tar     &>/dev/null || die "tar not found"

log "Building Docker images locally (this may take a few minutes)..."
docker compose -f docker-compose.prod.yml build

log "Saving Docker images to ${IMAGES_TAR} (may take a few minutes)..."
REPO="${GITHUB_REPOSITORY:-dhruv170805/ng-vms-main-main-2}"
REGISTRY="ghcr.io/$(echo "${REPO}" | tr '[:upper:]' '[:lower:]')"

# Ensure third-party images are available
docker pull mongo:6
docker pull redis:7-alpine
docker pull minio/minio:latest
docker pull caddy:2-alpine
docker pull maildev/maildev:latest

docker save \
  "${REGISTRY}/ngvms-backend:latest" \
  "${REGISTRY}/ngvms-frontend:latest" \
  "mongo:6" \
  "redis:7-alpine" \
  "minio/minio:latest" \
  "caddy:2-alpine" \
  "maildev/maildev:latest" \
  -o "${IMAGES_TAR}"
log "Images exported: $(du -h "${IMAGES_TAR}" | cut -f1)"

# ── Assemble bundle directory ───────────────────────────────────────────────
log "Assembling bundle..."
rm -rf "${BUNDLE_DIR}"
mkdir -p "${BUNDLE_DIR}/monitoring"
mkdir -p "${BUNDLE_DIR}/data/mongo"

# Core deployment files — NO source code
cp docker-compose.prod.yml     "${BUNDLE_DIR}/docker-compose.yml"
cp docker-compose.iis.yml      "${BUNDLE_DIR}/docker-compose.iis.yml"
cp Caddyfile                   "${BUNDLE_DIR}/Caddyfile"
cp web.config.example          "${BUNDLE_DIR}/web.config.example"
cp .env.example                "${BUNDLE_DIR}/.env.example"
cp scripts/install.sh          "${BUNDLE_DIR}/install.sh"
cp scripts/update.sh           "${BUNDLE_DIR}/update.sh"
cp scripts/restore.sh          "${BUNDLE_DIR}/restore.sh"
cp scripts/healthcheck.sh      "${BUNDLE_DIR}/healthcheck.sh"
cp scripts/install.ps1         "${BUNDLE_DIR}/install.ps1"
cp scripts/launcher.bat        "${BUNDLE_DIR}/launcher.bat"
cp README.md                   "${BUNDLE_DIR}/README.md"
cp monitoring/prometheus.yml   "${BUNDLE_DIR}/monitoring/prometheus.yml"
cp monitoring/alert.rules.yml  "${BUNDLE_DIR}/monitoring/alert.rules.yml"
cp monitoring/alertmanager.yml "${BUNDLE_DIR}/monitoring/alertmanager.yml"

# License files (if present)
shopt -s nullglob
lic_files=( *_NGS.lic )
if [ ${#lic_files[@]} -gt 0 ]; then
  for f in "${lic_files[@]}"; do
    cp "$f" "${BUNDLE_DIR}/"
    log "License file $f included"
  done
else
  warn "License file (*_NGS.lic) NOT found — client must supply their own"
fi

# Image tarball (offline mode)
if [ -f "${IMAGES_TAR}" ]; then
  mv "${IMAGES_TAR}" "${BUNDLE_DIR}/${IMAGES_TAR}"
  log "Included offline images tarball (${IMAGES_TAR})"
else
  warn "Offline images tarball (${IMAGES_TAR}) not found. Client will pull from GHCR."
fi

# Make scripts executable
chmod +x "${BUNDLE_DIR}/install.sh"
chmod +x "${BUNDLE_DIR}/update.sh"
chmod +x "${BUNDLE_DIR}/restore.sh"
chmod +x "${BUNDLE_DIR}/healthcheck.sh"

# ── Pack ────────────────────────────────────────────────────────────────────
log "Packing → ${OUTPUT}..."
tar -czf "${OUTPUT}" "${BUNDLE_DIR}/"
rm -rf "${BUNDLE_DIR}"

echo ""
echo "=================================================="
echo "   ✅ BUNDLE READY: ${OUTPUT}"
echo "   SIZE: $(du -h "${OUTPUT}" | cut -f1)"
echo "=================================================="
echo ""
echo "  Deliver ${OUTPUT} to the client."
echo "  On the client server:"
echo "    tar -xzf ${OUTPUT}"
echo "    cd ${BUNDLE_DIR}"
echo "    chmod +x install.sh && sudo ./install.sh"
echo ""
echo "  The bundle contains all required Docker images for offline installation."
echo "=================================================="
