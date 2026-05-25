# NG-VMS Enterprise Native Windows Installer
# Optimized for PowerShell 5.1+ and Docker Desktop

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   NG-VMS ENTERPRISE WINDOWS INSTALLER       " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# --- 1. SYSTEM VALIDATION ---
Write-Host "[1/6] Validating Windows System Requirements..." -ForegroundColor White

# Check Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
if (!(docker compose version)) {
    Write-Host "[ERROR] Docker Compose (v2) is required." -ForegroundColor Red
    exit 1
}

# Check RAM
$computerSystem = Get-CimInstance Win32_ComputerSystem
$totalRamGB = [Math]::Round($computerSystem.TotalPhysicalMemory / 1GB)
if ($totalRamGB -lt 8) {
    Write-Host "[WARN] Server has less than 8GB RAM (${totalRamGB}GB detected). Performance may degrade." -ForegroundColor Yellow
} else {
    Write-Host "[OK] RAM Check Passed (${totalRamGB}GB)." -ForegroundColor Green
}

# Check Ports
$ports = @(80, 443, 1081, 3001, 9005, 9090, 9093)
$activeConnections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
foreach ($port in $ports) {
    $conflict = $activeConnections | Where-Object { $_.LocalPort -eq $port }
    if ($conflict) {
        $owningPid = $conflict[0].OwningProcess
        $process = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
        Write-Host "[ERROR] Port $port is already in use by process: $($process.Name) (PID: $owningPid)." -ForegroundColor Red
        Write-Host "[INFO] Please stop this process or free the port before installing." -ForegroundColor Gray
        exit 1
    }
}
Write-Host "[OK] Port Check Passed." -ForegroundColor Green

# --- 2. CONFIGURATION & SECRETS ---
Write-Host "[2/6] Generating Secrets and Configuration..." -ForegroundColor White

if (!(Test-Path .env)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "[INFO] Created .env from .env.example." -ForegroundColor Gray
        
        # Generate Cryptographic Secrets
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $bytes32 = New-Object byte[] 32; $rng.GetBytes($bytes32)
        $bytes16 = New-Object byte[] 16; $rng.GetBytes($bytes16)
        $bytes8  = New-Object byte[] 8;  $rng.GetBytes($bytes8)
        $jwtSecret    = [BitConverter]::ToString($bytes32) -replace '-',''
        $minioSecret  = [BitConverter]::ToString($bytes16) -replace '-',''
        $licSecret    = [BitConverter]::ToString($bytes16) -replace '-',''
        $grafanaPass  = [BitConverter]::ToString($bytes8)  -replace '-',''

        # Update .env
        (Get-Content .env) -replace 'JWT_SECRET=.*',        "JWT_SECRET=$jwtSecret"       | Set-Content .env
        (Get-Content .env) -replace 'MINIO_SECRET_KEY=.*',  "MINIO_SECRET_KEY=$minioSecret" | Set-Content .env
        (Get-Content .env) -replace 'LICENSE_SECRET=.*',    "LICENSE_SECRET=$licSecret"    | Set-Content .env
        Add-Content .env "GRAFANA_PASSWORD=$grafanaPass"

        Write-Host "[OK] Generated cryptographic secrets." -ForegroundColor Green
        Write-Host "[i] Grafana admin password: $grafanaPass" -ForegroundColor Cyan
    } else {
        Write-Host "[ERROR] .env.example missing." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[INFO] .env already exists. Preserving secrets." -ForegroundColor Gray
}

# Create Volumes
$dirs = @("backups", "data/mongo", "data/minio", "data/redis", "data/caddy")
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}

# Ensure Keyfile for Mongo Replica Sets
if (!(Test-Path "data/mongo/mongo.key")) {
    $bytes = New-Object byte[] 756
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $key = [Convert]::ToBase64String($bytes)
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot "data/mongo/mongo.key"), $key)
    Write-Host "[OK] MongoDB replica keyfile generated." -ForegroundColor Green
}

# --- 3. LICENSE CHECK ---
Write-Host "[3/6] Verifying License..." -ForegroundColor White
$licFile = ""
if (Test-Path "PE_01&VMS_NGS.lic") {
    $licFile = "PE_01&VMS_NGS.lic"
} elseif (Test-Path "license_NGS.lic") {
    $licFile = "license_NGS.lic"
} elseif (Test-Path "license.vlic") {
    $licFile = "license.vlic"
}

if ($licFile -ne "") {
    Write-Host "[OK] License file detected: $licFile" -ForegroundColor Green
    if ($licFile -ne "license_NGS.lic") {
        Copy-Item $licFile "license_NGS.lic" -Force
        Write-Host "[INFO] Synchronized $licFile to license_NGS.lic for Docker Compose mount." -ForegroundColor Gray
    }
} else {
    Write-Host "[WARN] License file not found (tried PE_01&VMS_NGS.lic, license_NGS.lic, license.vlic)." -ForegroundColor Yellow
    Write-Host "[WARN] System will start in restricted trial mode. Please place your license file in this directory." -ForegroundColor Yellow
    # Create empty license_NGS.lic to prevent Docker compose volume mount error
    New-Item -ItemType File -Path "license_NGS.lic" -Force | Out-Null
}

# --- 4. DEPLOYMENT ---
Write-Host "[4/6] Launching Cinematic Stack..." -ForegroundColor White

if (Test-Path ngvms-images.tar) {
    Write-Host "[INFO] Found pre-built images. Loading them into Docker..." -ForegroundColor Gray
    docker load -i ngvms-images.tar
}

docker compose up -d

# --- 5. HEALTH CHECKS ---
Write-Host "[5/6] Waiting for Services to stabilize (20s)..." -ForegroundColor White
Start-Sleep -Seconds 20

$status = docker compose ps --format json
if ($status -match "running" -or $status -match "Up") {
    Write-Host "[OK] Containers are running." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Containers failed to start. Run 'docker compose logs' for details." -ForegroundColor Red
    exit 1
}

# --- 6. DONE ---
Write-Host "[6/6] Finalizing..." -ForegroundColor White

$serverIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1).IPAddress
if (-not $serverIP) { $serverIP = "localhost" }

Write-Host "" 
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   ✅ NG-VMS ENTERPRISE INSTALLATION COMPLETE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🌐 Main Application : http://$serverIP"     -ForegroundColor Green
Write-Host "  📦 MinIO Console    : http://${serverIP}:9005" -ForegroundColor White
Write-Host "  📧 Mail Inspector   : http://${serverIP}:1081" -ForegroundColor White
Write-Host "  📊 Grafana          : http://${serverIP}:3001" -ForegroundColor White
Write-Host "  🔬 Prometheus       : http://${serverIP}:9090" -ForegroundColor White
Write-Host ""
Write-Host "  Management:" -ForegroundColor Gray
Write-Host "    docker compose ps         -- check status" -ForegroundColor Gray
Write-Host "    docker compose logs -f    -- stream logs" -ForegroundColor Gray
Write-Host "    docker compose down       -- stop all" -ForegroundColor Gray
Write-Host ""
Write-Host "  First login: http://$serverIP → Run Setup Wizard" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
