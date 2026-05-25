# Microsoft IIS Deployment & Multi-PC Local Network Guide — NG-VMS

This guide describes how to deploy the NG-VMS (NextGen Visitor Management System) on **Microsoft IIS (Internet Information Services)** on a private network, allowing multiple client computers in the same local area network (LAN) to access the system and isolate different tenant configurations dynamically.

---

## 🏗️ 1. Architecture Overview

When deploying on an internal LAN with IIS, the setup follows a reverse-proxy architecture:

```mermaid
graph TD
    Client1[Client PC 1 <br> http://192.168.1.50/?tenant=demo] -->|HTTP Request| IIS[IIS Reverse Proxy <br> Port 80/8080]
    Client2[Client PC 2 <br> http://192.168.1.50/?tenant=clientA] -->|HTTP Request| IIS
    
    subgraph Windows Server Host (Docker)
        IIS -->|Route catch-all| FE[Next.js Frontend <br> http://localhost:3000]
        IIS -->|Route /api/*| BE[Express Backend <br> http://localhost:5000]
        IIS -->|Route /socket.io/*| BE
    end
```

Because clients on a private network typically access the server via an IP address (e.g. `http://192.168.1.50`) rather than custom subdomains (e.g. `clientA.your-server.com`), the application has been optimized to resolve and persist tenant identities dynamically.

---

## ⚙️ 2. Dynamic Tenant Resolution (Multi-PC Network Isolation)

To allow different PCs or departments on the same private network to access distinct tenant dashboards without complex local DNS configuration:

1. **First-Time Access**: A client opens the browser and navigates to the server IP using a `tenant` (or `t`) query parameter:
   * **PC 1 (Demo Tenant)**: `http://192.168.1.50/?tenant=demo`
   * **PC 2 (Client A Tenant)**: `http://192.168.1.50/?tenant=clientA`
   * **PC 3 (Client B Tenant)**: `http://192.168.1.50/?tenant=clientB`

2. **Persistence**: The frontend automatically extracts the tenant ID, stores it in the browser's `localStorage` (`vms_tenant_id`), and applies the tenant-specific branding, license configuration, and security rules.
3. **Subsequent Access**: On all subsequent visits, the client can simply type `http://192.168.1.50/` and the browser will reload the persisted tenant automatically from `localStorage`. To change or reset the tenant, simply append the query parameter again (e.g., `?tenant=demo`).

---

## 🛠️ 3. Step-by-Step IIS Configuration

### Step 3.1: Install IIS Prerequisites
Ensure the following components are installed on your Windows Server hosting IIS:
1. **Application Request Routing (ARR) 3.0**: [Download ARR 3.0](https://www.iis.net/downloads/microsoft/application-request-routing)
2. **URL Rewrite 2.1**: [Download URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)
3. **WebSockets Protocol**:
   * Open **Server Manager** → **Add Roles and Features**.
   * Under **Web Server (IIS)** → **Web Server** → **Application Development**, check **WebSocket Protocol** and install it.

### Step 3.2: Enable Proxy Mode in ARR
By default, IIS ARR will not forward requests to other ports unless proxying is explicitly enabled:
1. Open **IIS Manager**.
2. Select your root Server Node in the left-hand panel.
3. Double-click on **Application Request Routing Cache**.
4. In the right-hand action pane, click **Server Proxy Settings**.
5. Check **Enable proxy**, then click **Apply** in the actions pane.

### Step 3.3: Set Up the Website and Web.config
1. Create a directory on the server (e.g., `C:\inetpub\ngvms`).
2. Open **IIS Manager**, right-click **Sites**, select **Add Website**, and map it to `C:\inetpub\ngvms` (on your chosen port, e.g., `80` or `8080`).
3. Copy the `web.config` file from the repository root to `C:\inetpub\ngvms\web.config`.

Verify that the `<rewrite>` section in `web.config` has the correct rules matching the exposed ports:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- 1. Route Backend API requests -->
                <rule name="NG-VMS Backend API" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:5000/api/{R:1}" />
                </rule>

                <!-- 2. Route Socket.io / WebSockets -->
                <rule name="NG-VMS Sockets" stopProcessing="true">
                    <match url="^socket.io/(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:5000/socket.io/{R:1}" />
                </rule>

                <!-- 3. Route Frontend (Catch-all) -->
                <rule name="NG-VMS Frontend" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:3000/{R:1}" />
                </rule>
            </rules>
        </rewrite>
        
        <webSocket enabled="true" />
        <httpErrors errorMode="Detailed" />
    </system.webServer>
</configuration>
```

---

## 🚀 4. Deployment via Docker

Use the specialized IIS integration stack configuration file, which exposes ports `3000` (Frontend Node) and `5000` (Backend API) directly to the Windows host:

```powershell
# Run the deployment stack using the specialized IIS compose file
docker compose -f docker-compose.iis.yml up -d
```

Ensure that the environment variables in your `.env` file are set up appropriately:
* **`NEXT_PUBLIC_API_URL`**: Leave as relative `/api/v1` (or omit) during the container build to allow dynamic resolution of IP addresses and ports on client browsers.
* **`DISABLE_RATE_LIMITS`**: Set to `"true"` if you run automated performance audits or if multiple PCs generate dense LAN traffic.

---

## 🔍 5. Troubleshooting & Maintenance

### 1. `502.3 Bad Gateway` or `503 Service Unavailable`
* **Check Container Status**: Ensure the Docker containers are healthy:
  ```powershell
  docker compose -f docker-compose.iis.yml ps
  ```
* **Verify Proxy Settings**: Ensure ARR Proxy is enabled (Step 3.2).
* **Port Conflicts**: Make sure ports `3000` and `5000` are not occupied by other applications on the Windows Server.

### 2. WebSocket Connection Failures (Sockets disconnect / Fall back to polling)
* **IIS WebSocket Module**: Confirm "WebSockets Protocol" is enabled under Windows Server Roles.
* **ARR WebSockets**: Confirm the `<webSocket enabled="true" />` rule is present in the `web.config` file.

### 3. Webcam / Camera Capturing Blocked on Remote Client PCs
* **Reason**: Modern web browsers enforce strict security invariants that block camera access (`navigator.mediaDevices.getUserMedia`) on non-secure origins. Non-secure origins include any HTTP address that is not `localhost` or `127.0.0.1`.
* **Fix**: Ensure that the IIS website is bound to a valid HTTPS certificate (such as a local Active Directory Certificate Authority certificate, standard domain SSL, or a self-signed certificate) so that other computers on the LAN access the VMS securely via `https://<server-ip>`. Camera capture will immediately initialize once the origin is secure.
