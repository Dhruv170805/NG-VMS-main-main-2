param(
  [string]$Version = "2.1.1"
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Write-Info($Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn($Message) {
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-ErrorAndExit($Message) {
  Write-Host "[ERROR] $Message" -ForegroundColor Red
  exit 1
}

function Test-CommandExists($Name, $Label) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-ErrorAndExit "$Label not found. Ensure it is installed and available in PATH."
  }
}

function Format-Bytes($Bytes) {
  switch ($Bytes) {
    { $_ -ge 1TB } { return "{0:N2} TB" -f ($Bytes / 1TB) }
    { $_ -ge 1GB } { return "{0:N2} GB" -f ($Bytes / 1GB) }
    { $_ -ge 1MB } { return "{0:N2} MB" -f ($Bytes / 1MB) }
    { $_ -ge 1KB } { return "{0:N2} KB" -f ($Bytes / 1KB) }
    default { return "$Bytes bytes" }
  }
}

$BundleDir = "ngvms-enterprise-v$Version"
$Output = "$BundleDir.tar.gz"
$ImagesTar = "ngvms-images.tar"

Write-Host "=================================================="
Write-Host "   NG-VMS ENTERPRISE BUNDLER v$Version"
Write-Host "=================================================="

Test-CommandExists docker 'Docker'
Test-CommandExists tar 'tar'

try {
  docker compose version > $null 2>&1
}
catch {
  Write-ErrorAndExit "Docker Compose v2 not found. Install Docker Desktop or Docker Compose v2."
}

Write-Info "Building Docker images (prod compose)..."
$env:REDIS_PASSWORD = 'dummy_redis_pass'
$env:MONGO_ROOT_PASSWORD = 'dummy_mongo_pass'
$env:MINIO_SECRET_KEY = 'dummy_minio_secret'
$env:JWT_SECRET = 'dummy_jwt_secret'
$env:LICENSE_SECRET = 'dummy_license_secret'
$env:ENCRYPTION_KEY = 'dummy_enc_key'
$env:GRAFANA_PASSWORD = 'dummy_grafana_pass'

try {
  docker compose -f docker-compose.prod.yml build --no-cache `
    --build-arg NEXT_PUBLIC_API_URL=/api `
    --build-arg NEXT_PUBLIC_SOCKET_URL=/
}
finally {
  Remove-Item Env:REDIS_PASSWORD, Env:MONGO_ROOT_PASSWORD, Env:MINIO_SECRET_KEY, Env:JWT_SECRET, Env:LICENSE_SECRET, Env:ENCRYPTION_KEY, Env:GRAFANA_PASSWORD -ErrorAction SilentlyContinue
}

Write-Info "Tagging images..."
docker tag ngvms-backend:latest "ngvms-backend:$Version"
docker tag ngvms-frontend:latest "ngvms-frontend:$Version"

Write-Info "Exporting Docker images -> $ImagesTar (may take a few minutes)..."
docker save `
  "ngvms-backend:latest" `
  "ngvms-frontend:latest" `
  "mongo:6" `
  "redis:7-alpine" `
  "minio/minio:latest" `
  "caddy:2-alpine" `
  "maildev/maildev:latest" `
  -o $ImagesTar

$ImageSize = (Get-Item $ImagesTar).Length
Write-Info "Images exported: $(Format-Bytes $ImageSize)"

Write-Info "Assembling bundle..."
if (Test-Path $BundleDir) {
  Remove-Item $BundleDir -Recurse -Force
}

New-Item -ItemType Directory -Path "$BundleDir/monitoring" -Force | Out-Null
New-Item -ItemType Directory -Path "$BundleDir/caddy" -Force | Out-Null

$filesToCopy = @{
  'docker-compose.prod.yml'     = "$BundleDir/docker-compose.yml"
  'docker-compose.iis.yml'      = "$BundleDir/docker-compose.iis.yml"
  'Caddyfile'                   = "$BundleDir/Caddyfile"
  'web.config.example'          = "$BundleDir/web.config.example"
  '.env.example'                = "$BundleDir/.env.example"
  'install.sh'                  = "$BundleDir/install.sh"
  'update.sh'                   = "$BundleDir/update.sh"
  'restore.sh'                  = "$BundleDir/restore.sh"
  'healthcheck.sh'              = "$BundleDir/healthcheck.sh"
  'install.ps1'                 = "$BundleDir/install.ps1"
  'launcher.bat'                = "$BundleDir/launcher.bat"
  'README.md'                   = "$BundleDir/README.md"
  'monitoring/prometheus.yml'   = "$BundleDir/monitoring/prometheus.yml"
  'monitoring/alert.rules.yml'  = "$BundleDir/monitoring/alert.rules.yml"
  'monitoring/alertmanager.yml' = "$BundleDir/monitoring/alertmanager.yml"
}

foreach ($src in $filesToCopy.Keys) {
  if (-not (Test-Path $src)) {
    Write-ErrorAndExit "Required source file '$src' not found."
  }
  Copy-Item -Path $src -Destination $filesToCopy[$src] -Force
}

$licenseFiles = Get-ChildItem -Path '*_NGS.lic' -File -ErrorAction SilentlyContinue
if ($licenseFiles) {
  foreach ($license in $licenseFiles) {
    Copy-Item -Path $license.FullName -Destination "$BundleDir/$($license.Name)" -Force
    Write-Info "License file $($license.Name) included"
  }
}
else {
  Write-Warn "License file (*_NGS.lic) NOT found - client must supply their own"
}

Move-Item -Path $ImagesTar -Destination "$BundleDir/$ImagesTar" -Force

Write-Info "Packing -> $Output..."
if (Test-Path $Output) {
  Remove-Item $Output -Force
}

tar -czf $Output -C . $BundleDir

$BundleSize = (Get-Item $Output).Length

Write-Host ""
Write-Host "=================================================="
Write-Host "   BUNDLE READY: $Output"
Write-Host "   SIZE: $(Format-Bytes $BundleSize)"
Write-Host "=================================================="
Write-Host ""
Write-Host "  Deliver $Output to the client."
Write-Host "  On the client server:"
Write-Host "    tar -xzf $Output"
Write-Host "    cd $BundleDir"
Write-Host "    chmod +x install.sh && sudo ./install.sh"
Write-Host "=================================================="
