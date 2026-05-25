# Real-World License Validation Implementation (v2.0.0)

Integrating NGS License Management licensing into your application ensures that your software is protected by enterprise-grade cryptographic locks. This guide provides a "perfect" implementation pattern using the Node.js validator.

## 📦 Installation

Ensure you have the core packages available in your project.

```bash
npm install @lg/validator @lg/crypto @lg/hardware
```

## 🚀 The "Perfect" Security Manager

The following `SecurityManager` class encapsulates the validation logic, including anti-debugging checks and RSA signature verification.

```typescript
import { LicenseValidator, LicenseData } from "@lg/validator";
import * as fs from 'node:fs';
import * as path from 'node:path';

export class SecurityManager {
  private validator: LicenseValidator;
  private readonly secretKey: string;
  private readonly publicKey?: string;
  private readonly licensePath: string;
  private licenseData?: LicenseData;

  constructor() {
    // 1. Load secrets from environment (Zero-Hardcode Policy)
    this.secretKey = process.env.LICENSE_SECRET!;
    
    // 2. Load RSA Public Key if signing is enabled
    const publicKeyPath = path.join(process.cwd(), 'keys', 'public.pem');
    if (fs.existsSync(publicKeyPath)) {
      this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    }

    this.licensePath = path.join(process.cwd(), 'license.lic');
    
    // 3. Initialize the validator
    this.validator = new LicenseValidator(this.secretKey, this.publicKey);
  }

  /**
   * Initializes the security perimeter. 
   * This should be the first thing called in your application's entry point.
   */
  async initialize(): Promise<void> {
    if (!fs.existsSync(this.licensePath)) {
      console.error("🛡️ Security Violation: License file missing.");
      process.exit(1);
    }

    const encryptedLicense = fs.readFileSync(this.licensePath, 'utf-8');
    
    // This call performs: Anti-Debugging, Signature Verification, 
    // Decryption, Hardware Matching, and Expiry Check.
    const result = await this.validator.validateLicense(encryptedLicense);

    if (!result.valid) {
      console.error(`🛡️ Security Violation: ${result.reason}`);
      process.exit(1);
    }

    this.licenseData = result.data;
    console.log("🛡️ License validated successfully.");
  }

  /**
   * Returns the decrypted license data (features, db config, etc.)
   */
  getLicenseData(): LicenseData {
    if (!this.licenseData) {
      throw new Error("SecurityManager not initialized");
    }
    return this.licenseData;
  }
}
```

## 🛠️ Usage in Main Entry Point

```typescript
// src/main.ts
import { SecurityManager } from "./security/SecurityManager";

async function bootstrap() {
  const security = new SecurityManager();
  
  // 1. Verify Security Perimeter
  // If validation fails, this will terminate the process.
  await security.initialize();

  // 2. Retrieve Licensed Config
  const license = security.getLicenseData();
  
  // 3. Start Application with licensed features
  console.log(`🚀 Starting ${license.project} for ${license.company}...`);
  
  // Example: Configure Database from License
  // const db = connect(license.dbConfig);
}

bootstrap().catch(err => {
  console.error("Critical failure during bootstrap:", err);
  process.exit(1);
});
```

## 🛡️ Hardening Best Practices

1.  **Binary Compilation**: For distributed Node.js apps, use [PKG](https://github.com/vercel/pkg) or [SEA](https://nodejs.org/api/single-executable-applications.html) to package your app into a single binary. This makes it harder for users to modify the source code or bypass the `initialize()` call.
2.  **Regular Heartbeats**: Don't just check at boot. For long-running processes, run `validateLicense` every 24 hours to detect revoked or expired licenses without requiring a restart.
3.  **Hardware First**: Always collect the hardware fingerprint from the customer's machine *before* generating the license in the Admin Dashboard.
4.  **Obfuscation**: Apply a JavaScript obfuscator (e.g., `javascript-obfuscator`) to your build artifacts to hide the logic and the strings related to your security perimeter.

---
© 2026 NGS License Management Core Team.
