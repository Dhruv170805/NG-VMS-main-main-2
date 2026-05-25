import { describe, it, expect } from 'vitest';
import { SecurityManager } from '../../utils/securityManager';
import CryptoJS from 'crypto-js';

describe('SecurityManager - Licensing & Encryption', () => {
  it('should get a valid hardware fingerprint', async () => {
    const sm = SecurityManager.getInstance();
    const fingerprint = await sm.getHardwareFingerprint();
    
    expect(fingerprint).toBeDefined();
    expect(fingerprint.length).toBe(64); // SHA-256 hex length
  });

  it('should parse an unsigned active license key successfully in test mode', async () => {
    const sm = SecurityManager.getInstance();
    
    // Create base64 of valid unsigned license payload
    const payload = {
      companyName: 'Print Electronics',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Tomorrow
      features: {
        email: true,
        sms: false,
        aadhaar: true,
        storage: 'local'
      }
    };
    
    const licenseKey = Buffer.from(JSON.stringify(payload)).toString('base64');
    const result = await sm.validateTenantLicense(licenseKey);
    
    expect(result.valid).toBe(true);
    expect(result.data?.company).toBe('Print Electronics');
    expect(result.data?.features.email).toBe(true);
    expect(result.data?.features.sms).toBe(false);
  });

  it('should reject an expired license payload', async () => {
    const sm = SecurityManager.getInstance();
    
    const payload = {
      companyName: 'Print Electronics',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
      features: { email: true, sms: false, aadhaar: true, storage: 'local' }
    };
    
    const licenseKey = Buffer.from(JSON.stringify(payload)).toString('base64');
    const result = await sm.validateTenantLicense(licenseKey);
    
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('should reject a license with INACTIVE status', async () => {
    const sm = SecurityManager.getInstance();
    
    const payload = {
      companyName: 'Print Electronics',
      status: 'INACTIVE',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      features: { email: true, sms: false, aadhaar: true, storage: 'local' }
    };
    
    const licenseKey = Buffer.from(JSON.stringify(payload)).toString('base64');
    const result = await sm.validateTenantLicense(licenseKey);
    
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not active');
  });
});
