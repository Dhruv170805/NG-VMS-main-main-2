# NG-VMS Enterprise Containerized Deployment Guide

This guide details the steps to deploy the NG-VMS stack on-premise using pre-built Docker images, completely avoiding source code exposure.

---

## 📦 Package Contents

The deployment bundle consists of:

* `docker-compose.yml` — Container orchestration definition
* `Caddyfile` — High-performance SSL-enabled reverse proxy configuration
* `.env.example` — Environment variable template
* `license_NGS.lic` — Cryptographically signed software license
* `install.sh` / `install.ps1` — Automated stack installers (Linux/Windows)
* `healthcheck.sh` — Local status and diagnostics runner
* `ngvms-images.tar` — Exported pre-compiled Docker container images

---

## 🖥️ System Requirements

* **Operating System**: Ubuntu 20.04/22.04 LTS (recommended) or Windows Server with WS2022 / Docker Desktop
* **Docker Engine**: v24.0.0 or higher
* **Docker Compose**: v2.20.0 or higher
* **Min Memory**: 4 GB RAM (8 GB recommended)
* **Open Ports**: `80` (HTTP redirect) and `443` (HTTPS API/Web panel access)

---

## 🚀 Installation & Seeding

### 1. Extract the Bundle

Copy the `.tar.gz` bundle to your target machine and extract:

```bash
tar -xzf ngvms-enterprise-v2.1.1.tar.gz
cd ngvms-enterprise-v2.1.1
```

### 2. Configure Environment

Copy the example environment template:

```bash
cp .env.example .env
```

Open `.env` and adjust the variables:

* `LICENSE_SECRET`: The 32-character secret key used to verify the license signature (supplied by root authority).
* `ENCRYPTION_KEY`: A 32-character secret key used for encrypting ID documents and database records (generated automatically by installer if not set).
* `DOMAIN_NAME`: Set to your local domain (e.g., `vms.yourcompany.com`) or `localhost`.
* `MONGO_ROOT_PASSWORD` / `REDIS_PASSWORD` / `JWT_SECRET`: High-entropy production passwords.

### 3. Place License File

Ensure your signed license file is named **`license_NGS.lic`** and resides directly in the root deployment directory.

### 4. Run the Automated Installer

Execute the installer with root privileges:

```bash
sudo chmod +x install.sh
sudo ./install.sh
```

The installer automatically:

1. Provisions Docker / Docker Compose dependencies if missing.
2. Hardens the firewall rules allowing ports `80` and `443`.
3. Loads the pre-compiled images from `ngvms-images.tar`.
4. Launches the stack in background daemon mode.

---

## 🛡️ License Seeding Mechanics

The application is built on a **Zero-Hardcoding Core Architecture**.

On initial startup, if the database is clean:

1. The backend automatically imports and decrypts `license_NGS.lic` using your `LICENSE_SECRET`.
2. It validates the cryptographic signature and checks the expiration timestamp.
3. It dynamically extracts:
   * **Company Name** (e.g., `PE_01`)
   * **Tenant Subdomain** (normalized from the license company code)
   * **Root Admin Email / Password** (e.g., `admin@gmail.com` / `123456`)
4. It bootstraps the tenant and provisions the initial administrative credentials on the fly.

Once seeded, you can log in immediately using the email and password defined in the license.

---

## 🛠️ Operations & Troubleshooting

### Check Health & Performance

Run the diagnostics script:

```bash
./healthcheck.sh
```

### Stop the Stack

```bash
docker compose down
```

### Check Logs

```bash
docker compose logs -f backend
```

---

© 2026 NG-VMS Sovereign Engineering. All Rights Reserved.
