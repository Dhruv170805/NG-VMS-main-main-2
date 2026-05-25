# God-Level Backend Architecture (NG-VMS)

## Stack
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js 5 with TypeScript
- **Database**: MongoDB (Mongoose) with Redis for Socket.io scaling.
- **Image Processing**: `sharp` & `canvas` (Biometric optimization).
- **Document Handling**: `pdf-parse` & `xlsx` (OCR and export logic).
- **Real-time**: Socket.io with Redis Adapter.
- **Auth**: JWT + Bcryptjs.
- **Telemetry**: OpenTelemetry (OTEL) with Prometheus Exporter (port 9464).

## Structure
- `/src/models`: Type-safe Mongoose models with lifecycle enums.
- `/src/controllers`: High-signal business logic with Socket.io orchestration.
- `/src/utils/policyEngine`: The kernel for state transition safety and identity validation.
- `/src/utils/securityManager`: The **Advanced License Perimeter** (RSA-SHA256 Sig -> AES-256-CBC Decryption -> Hardware Fingerprint).
- `/src/utils/notificationService`: The **Granular Notification Orchestrator** (Stage × Recipient × Channel routing).
- `/src/utils/otel`: AETHER Eyes observability integration.
- `/src/routes`: Atomic API endpoints for Visitors, Auth, System, Analytics, Employees, Gate, Handover, Blacklist, and Aadhaar.

## Real-time Pulse (Events)
- `visitor:new`: Broadcast when a new registration occurs. Guard room listens for identity verification.
- `visitor:forwarded`: Emitted to `host_{id}` when a guard forwards a request for approval.
- `visitor:approved`: Broadcast when a host approves a visitor. Guard terminals sync locally.
- `status:update`: Emitted to `visitor_{id}` to trigger instant Digital Pass UI mutations.
- `visitor:update`: Global sync event for all gate terminals and dashboards to reflect state changes.
- `stats:update`: Incremental analytics updates for the Admin Dashboard.

## System Hardening (Blueprint Standards)
1. **Express 5 Compatibility**: All wildcard routes (e.g., `/api/*`) must be handled via `app.use('/api', ...)` or named parameters to comply with `path-to-regexp` v7+.
2. **Memory Integrity**: Increased `EventEmitter` limits to 25 to prevent leaks under heavy load.
3. **Sovereign Shutdown**: Graceful termination of Sockets, Redis, and DB connections on `SIGINT`/`SIGTERM`.
4. **Optimistic Concurrency**: Atomic status updates using `findOneAndUpdate` with status-based filtering.
5. **Identity Invariant**: Aadhaar validation using the **Verhoeff Algorithm** (Base-10 checksum) to ensure sovereign data integrity.

## God-Level Backend Prompt
"Build a hardened, production-grade Express.js backend using TypeScript. Implement a real-time state machine for visitor management using Socket.io and Redis. Ensure total resource cleanup via graceful shutdown logic and protect against memory leaks by tuning listener limits. Use a centralized Policy Engine for state transition safety and OpenTelemetry for runtime observability."
