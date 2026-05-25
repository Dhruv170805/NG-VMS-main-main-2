# NG-VMS Enterprise Client Deployment Package

This package contains everything needed to deploy the NG-VMS platform onto a client's own infrastructure or a private VPS. It is engineered for **Production Readiness**, supporting high-availability requirements, automatic SSL, and persistent backups.

## 📦 Package Contents

- **`docker-compose.yml`**: Production orchestration for all services (Mongo Auth, MinIO, Caddy, Healthchecks).
- **`.env.example`**: Template for your production environment configuration.
- **`install.sh`**: Automated installation and container startup script.
- **`restore.sh`**: Script to restore MongoDB and MinIO from backups.
- **`update.sh`**: Script to pull the latest registry images and restart gracefully.
- **`scripts/backup.sh`**: Automated backup script suitable for CRON scheduling.
- **`.github/workflows/deploy.yml`**: Pre-configured CI/CD pipeline.
- **`README.md`**: This guide.

## 🚀 Client Server Preparation (VPS / Dedicated)

Recommended Specs: **Ubuntu 22.04 LTS | 8 Core CPU | 16GB RAM | 200GB+ NVMe SSD**

### 1. Install Docker & Docker Compose
SSH into the client's fresh server and run:
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
# Install Compose Plugin
sudo apt install docker-compose-plugin -y
```

### 2. Upload Project Package
Securely copy this deployment bundle to the client server:
```bash
scp -r NG-VMS-Enterprise user@server_ip:/opt/ngvms
```

## 🛠️ Installation & Deployment

### 1. Configure Environment
SSH into the server, navigate to the folder, and set up your variables:
```bash
cd /opt/ngvms
cp .env.example .env
nano .env
```
> **CRITICAL**: Change `MONGO_ROOT_PASSWORD` and `MINIO_SECRET_KEY` to secure values. Define your `DOMAIN_NAME` (e.g., `vms.client.com`) and `TLS_EMAIL` to enable Caddy's Automatic HTTPS.

### 2. Configure Client DNS
Point the client's domain to your server's IP:
```text
vms.client.com  A  <SERVER_IP_ADDRESS>
```

### 3. Run Installer
Execute the installation script. It will generate your Mongo KeyFile and boot the stack:
```bash
chmod +x install.sh restore.sh update.sh scripts/backup.sh
./install.sh
```

### 4. Verify Production
Check running containers and follow logs to ensure healthy starts:
```bash
docker ps
docker compose logs -f
```

## 🔐 Maintenance & Operations

### Automated Backups (Important)
Setup a cronjob to automatically back up the database and storage every day at 2 AM:
```bash
crontab -e
# Add the following line:
0 2 * * * /opt/ngvms/scripts/backup.sh
```

### Updating the Platform
To deploy a new version from your private container registry:
```bash
./update.sh
```

### Disaster Recovery
To restore a `.tar.gz` backup created by the backup script:
```bash
./restore.sh path/to/backup.tar.gz
```

## 🏗️ DevOps Architecture

Your deployment utilizes a professional DevOps architecture:
1. **Reverse Proxy (Caddy)**: Handles HTTPS termination and routes traffic.
2. **MongoDB Replica Set**: Ensures database consistency and supports transactions.
3. **MinIO**: Sovereign, S3-compatible Object Storage for sensitive ID documents.
4. **Grafana + Prometheus**: End-to-end monitoring and alerting observability.

---
© 2026 NextGen VMS Enterprise - Built for Sovereignty.
