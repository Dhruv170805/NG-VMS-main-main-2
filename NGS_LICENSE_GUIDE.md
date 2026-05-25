# NG-VMS NGS License Guide

This guide explains how the machine-locked NGS license system works, dynamic loading, and how to manage it.

## 1. The Perimeter Logic
The system uses a multi-layered security approach:
- **AES-256-CBC Encryption**: The license payload is encrypted using a 32-character secret key.
- **Hardware Lock**: The license can be locked to specific hardware (Serial + OS UUID + Hardware UUID).
- **RSA Signature**: Optional signature verification to ensure the license was issued by the root authority.

## 2. Default Secrets & Conventions
- **Secret Key**: `ngs-enterprise-system-validation`
- **License Naming Convention**: `[Companycode]&[Projectcode]_NGS.lic` (e.g., `PE02&VMS_NGS.lic`). The `Companycode` matches the target tenant's subdomain.

## 3. License Placement (Where to Put License Files)
- **Local/Docker Compose**: Place the license file directly in the repository root directory. It is mounted into the container's `/app/shared` directory, scanned, and dynamically applied on start.
- **Client Production Bundle**: Place the license file directly in the unpacked bundle directory on the target server. The `install.sh` script automatically detects it and provisions it to the docker containers.

## 4. Management UI
You can manage licenses directly from the **System Config** (Settings) tab in the Admin Dashboard:
- **Activation**: Paste the encrypted license string or upload an `_NGS.lic` file.
- **Inspection**: Use the built-in "Inspector" to decrypt and view the license payload. This is for transparency and debugging.
- **Real-time Updates**: Activating a license immediately unlocks system features (Aadhaar, SMS, etc.) across the platform.

## 5. Implementation Details
The core logic resides in:
- `backend/src/utils/securityManager.ts`: Handles decryption and validation.
- `backend/src/modules/system/system.service.ts`: Backend service for license management.
- `frontend/src/hooks/useAdminDashboard.ts`: Frontend state and API calls.
- `frontend/components/admin/SettingsTab.tsx`: The UI implementation.

---
© 2026 NG-VMS Engineering Team.
