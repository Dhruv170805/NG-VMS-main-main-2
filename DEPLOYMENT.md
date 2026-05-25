# NG-VMS: Complete On-Premise / Cloud Deployment Guide

This guide provides step-by-step instructions to deploy the NG-VMS (NextGen Visitor Management System) on your own server (On-Premise) or a Cloud VM (AWS EC2, DigitalOcean, Linode, etc.) using **Docker**.

## 🏗️ 1. Server Prerequisites

Before you begin, ensure your server meets the following requirements:

* **Operating System**: Ubuntu 20.04 LTS / 22.04 LTS (or any modern Linux distribution).
* **Hardware Minimum**: 2 vCPUs, 4GB RAM, 20GB SSD.
* **Hardware Recommended (Production)**: 4 vCPUs, 8GB RAM, 50GB SSD.
* **Network**: Ports `80` (HTTP) and `443` (HTTPS) open in your public firewall. All backend APIs, sockets, frontends, and monitoring services are securely proxy-routed internally and shielded from public access.
* **Software Installed**:
  * `git`
  * `docker`
  * `docker-compose` (or `docker compose` plugin)

---

## 🛠️ 2. Install Required Software (Ubuntu/Debian)

If Docker is not already installed on your server, connect to your server via SSH and run the following commands:

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Git
sudo apt install git -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your current user to the Docker group (to run docker without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y
```

*Note: Log out and log back in (or close the SSH session and reconnect) for the Docker group changes to take effect.*

### 🛡️ Step 2.1: Lock Down the Firewall (UFW)

Production hardening dictates blocking all direct external access to your underlying services (MongoDB, Redis, MinIO console, SMTP, Prometheus, and Grafana), permitting only secure web traffic (ports 80 and 443) and SSH:

```bash
# Allow standard SSH management port
sudo ufw allow 22/tcp

# Allow public web traffic (Caddy Reverse Proxy)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Default deny incoming, allow outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable the firewall
sudo ufw enable
```

---

## 📥 3. Extract the Enterprise Bundle

Upload the NG-VMS Enterprise `.tar.gz` bundle onto your server:

```bash
# Extract the bundle
tar -xzf ngvms-enterprise-v*.tar.gz

# Enter the extracted directory
cd ngvms-enterprise
```

---

## ⚙️ 4. Configure Environment Variables

The system relies on environment variables for database connections, security keys, and API routing.

### Step 4.1: Create the Global `.env` File

Create a `.env` file in the root of the project directory (`NG-VMS/.env`). This file will be read by Docker Compose.

```bash
nano .env
```

Add the following configuration (modify values for production):

```env
# ==========================================
# NG-VMS GLOBAL CONFIGURATION
# ==========================================

# 1. Frontend Configuration (Used during build)
# Replace 'your-domain.com' or 'your-server-ip' with your actual server address
NEXT_PUBLIC_API_URL=http://your-server-ip:8080/api/v1
NEXT_PUBLIC_SOCKET_URL=http://your-server-ip:8080

# 2. Backend Configuration (Used at runtime)
PORT=5000
NODE_ENV=production

# Database Connections (Docker networking uses service names)
MONGODB_URI=mongodb://mongo:27017/ngvms
REDIS_URL=redis://redis:6379

# Security
# Generate a strong random string (e.g., using `openssl rand -hex 32`)
JWT_SECRET=super_secret_production_key_change_me_immediately
ENCRYPTION_KEY=production_encryption_key_must_be_32_chars_long
LICENSE_SECRET=production_license_secret_key_from_vendor
```

*Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).*

### Step 4.2: Enforce Strict Secret Management

To prevent unauthorized users on the host system from reading your database passwords and private keys, restrict file permissions on the `.env` file to the owner only:

```bash
# Allow only the owner to read/write the secret configuration file
chmod 600 .env
```

Always use standard cryptographic tools to generate all production passwords (e.g., `MONGO_ROOT_PASSWORD`, `REDIS_PASSWORD`, `MINIO_SECRET_KEY`, `JWT_SECRET`):

```bash
# Example to generate a strong random 32-character key
openssl rand -hex 32
```

### Step 4.3: Add your License File

Ensure you place your `license_NGS.lic` file into the root of the extracted project directory (`ngvms-enterprise/license_NGS.lic`) before running the installation.

---

## 🚀 5. Build and Deploy with Docker Compose

The project includes a `docker-compose.yml` file that orchestrates the Frontend, Backend, MongoDB, and Redis databases.

Run the following command to load the Docker images and start the services in detached mode:

```bash
# Load images and start containers
./install.sh
```

**What this does:**

1. Loads the pre-built production **Backend** image (Node.js).
2. Loads the pre-built production **Frontend** image (Next.js).
3. Pulls and starts a local **MongoDB** database.
4. Pulls and starts a local **Redis** server.
5. Connects them all securely via an internal Docker network.

---

## 🔍 6. Verify the Deployment

Check if all containers are running successfully:

```bash
docker compose ps
```

You should see 4 containers (`ngvms_frontend`, `ngvms_backend`, `ngvms_mongo`, `ngvms_redis`) with the state `Up`.

To view the live logs (useful for debugging):

```bash
# View all logs
docker compose logs -f

# View backend logs specifically
docker compose logs -f backend
```

---

## 🌐 7. Accessing the Application

If everything started successfully, your application is now live!

* **Frontend (UI) & API Gateway**: Open your browser and navigate to: `http://your-server-ip:8080`
* **Backend (API)**: Available internally at: `http://your-server-ip:5000` (shielded from public traffic by Caddy)

### Setting up Nginx & SSL (Highly Recommended)

For a production environment, you should not expose your service ports directly to the public. Caddy handles public traffic on port 80/443 and routes internally to your Docker containers.

*Example Nginx configuration (if using Nginx instead of Caddy):*

* Route `your-domain.com` -> `localhost:3000` (Frontend)
* Route `api.your-domain.com` -> `localhost:5000` (Backend)

*Note: The frontend is pre-built to use relative paths (`/api`). The reverse proxy handles all routing, so you do not need to rebuild the frontend for different domains.*

---

## 🌐 9. Microsoft IIS Integration (Windows Server)

If you need to host NG-VMS behind **Microsoft IIS** (e.g., to use your existing Windows Server infrastructure or SSL certificates), follow this "Gold-Standard" integration strategy.

### Prerequisites

1. **Application Request Routing (ARR) 3.0** installed in IIS.
2. **URL Rewrite 2.1** installed in IIS.
3. **WebSockets** enabled in Windows Features.

### Step 1: Configure IIS as a Reverse Proxy

1. Open **IIS Manager**.
2. Create a new **Website** (or use an existing one).
3. Copy the provided `web.config.example` to the website's root directory and rename it to `web.config`.
4. In IIS Manager, select your Server node, open **Application Request Routing Cache**, click **Server Proxy Settings**, and ensure **Enable proxy** is checked.

### Step 2: Deploy using the IIS Stack

Instead of the standard `docker-compose.yml`, use the specialized IIS integration stack which exposes the necessary ports to the host:

```powershell
# Run using the IIS-specific configuration
docker compose -f docker-compose.iis.yml up -d
```

### Step 3: Verify Traffic Flow

* **Frontend**: Handled by the catch-all rule → `localhost:3000`
* **API**: Handled by the `/api` rule → `localhost:5000`
* **Sockets**: Handled by the `/socket.io` rule → `localhost:5000` (WebSocket support must be enabled in ARR).

---

**To restart the system:**

```bash
docker compose restart
```

**To update to a new version:**

```bash
# 1. Extract the new release bundle
tar -xzf ngvms-enterprise-v*.tar.gz

# 2. Run the update script
./scripts/update.sh
```

**Data Persistence:**

The `docker-compose.yml` file configures Docker Volumes (`mongo_data` and `redis_data`). This means that even if you destroy the containers (`docker compose down`), your databases, visitor logs, and configuration will remain safe on the host machine.
