# NG-VMS: Sovereign Architecture & Tech Specs

## 1. Theoretical Framework
The NG-VMS operates on the **"Sovereign Concierge"** principle. Unlike traditional CRUD apps, this system is an **Event-Driven State Machine** that enforces security invariants at the kernel level.

### The Sovereign State Machine
A Visitor's lifecycle is managed via the **Policy Engine** (`backend/src/utils/policyEngine.ts`):
- `PENDING_GUARD` → `SENT_FOR_APPROVAL` → `APPROVED` → `GATE_IN` → `MEET_IN` → `MEET_OUT` → `GATE_OUT`.
- **Atomic Operations**: Backend uses MongoDB's `findOneAndUpdate` with **Optimistic Concurrency Control**, ensuring no "double-state" anomalies in high-traffic lobbies.

### Sovereign Invariants (AETHER)
The Policy Engine proves three classes of invariants before any state mutation:
1.  **RBAC Invariant**: Verifies that the actor (Guard, Staff, Admin) has the authority to perform the requested `ActionType`.
2.  **Status Transition Invariant**: Ensures the visitor is in the correct preceding state (e.g., cannot `GATE_IN` unless state is `APPROVED`).
3.  **Security Invariant**: Hard-blocks any action (except `DENY`) on blacklisted entities identified via SHA-256 ID hashing.

## 2. Real-Time Logic & Multi-Tenancy
We use a **Reactive Room Topology** with a Redis Adapter for horizontal scalability:
- **`host_{hostId}`**: Private channel for employee "Knock" notifications and approval requests.
- **`visitor_{visitorId}`**: Private channel for Digital Pass updates and security alerts.
- **`gate_global`**: Global broadcast for security guards and real-time dashboard analytics.

### Sovereign Multi-Tenancy
The system implements strict logical isolation via the `TenantMiddleware`:
- **Identification**: The `x-tenant-id` header (carrying the tenant's subdomain) is mandatory for all `/api` requests.
- **Isolation**: Every database query is scoped by `tenantId`. Data leakage between tenants is prevented at the middleware level.
- **Dynamic Configuration**: System settings, branding (logo, name), and license-locked features (Aadhaar, SMS) are resolved per-tenant.

## 3. Observability: AETHER Eyes
Integrated OpenTelemetry (OTEL) provides kernel-level tracing.
- **Auto-Instrumentation**: Captures HTTP requests, database queries, and Socket.io events.
- **Prometheus Export**: System vitals and performance metrics are exposed on port `9464`.
- **Sovereign Shutdown**: On `SIGTERM`, the system gracefully drains all spans, closes socket rooms, and terminates database connections to ensure zero data loss.

## 4. Component Design (The "God Level" UI)
The UI follows **Apple's Glassmorphism Studio** standards:
- **Optical Balance**: `backdrop-filter: blur(48px)` combined with layered mesh gradients creates a high-fidelity depth effect.
- **Haptic Visuals**: Transitions use `framer-motion` spring physics for physical-feeling interactions.
- **SSR Isolation**: Biometric components use dynamic client-side hydration to ensure server stability.

## 5. Security & Data Integrity
- **Advanced License Perimeter**: Multi-layered security using RSA-SHA256 signatures, AES-256-CBC decryption, and SHA-256 hardware fingerprinting (Locked to `serial + osUUID + hwUUID`).
- **Granular Notification Orchestrator**: A 3-dimensional matrix (Stage × Recipient × Channel) that routes alerts to Guards, Hosts, Admins, and Visitors via Web, Email, and SMS.
- **Identity Proofing**: OCR scanning via `tesseract.js` paired with `@vladmandic/face-api`.
- **Verhoeff Validation**: The `PolicyEngine` enforces a 12-digit numeric invariant using the Verhoeff algorithm for sovereign identity proofing.
- **SAP-Grade Reporting**: High-fidelity Excel and PDF engine with professional corporate styling, granular time-period targeting, and automatic data scaling.

## 6. Technical Stack Details
| Layer | Tech | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript | Sovereign UI Layer |
| **Biometrics** | Face-API + GPU Acceleration | Identity Verification |
| **Backend** | Node.js + Express 5 | Real-time Orchestrator |
| **Licensing** | CryptoJS + SystemInformation | Machine-Locked Security |
| **Reporting** | XLSX-JS-Style + jsPDF | Enterprise Auditing |
| **Observability** | OpenTelemetry | Kernel Tracing & Metrics |
| **Database** | MongoDB + Redis | Persistent & Live State |

---

## 7. SRE & Infrastructure Setup
- **Process Hardening**: `setMaxListeners` tuning prevents memory leaks during socket-heavy sessions.
- **Graceful Shutdown**: The system explicitly drains all sockets and DB connections on exit signals.
- **Canary Readiness**: Both tiers support environment-based isolation for seamless rollout.
