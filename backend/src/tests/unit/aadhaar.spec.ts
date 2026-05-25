import { describe, it, expect, vi } from 'vitest';
import { AadhaarService } from '../../modules/aadhaar/aadhaar.service';
import { SecurityManager } from '../../utils/securityManager';
import { PolicyEngine } from '../../utils/policyEngine';
import mongoose from 'mongoose';

// Mock pdfjs-dist ESM module
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => {
  return {
    getDocument: vi.fn().mockImplementation((params) => {
      if (params.password === 'wrong-password') {
        return {
          promise: Promise.reject({ name: 'PasswordException', message: 'Incorrect password' })
        };
      }
      return {
        promise: Promise.resolve({
          getPage: async () => ({
            getTextContent: async () => ({
              items: [{ str: 'My Aadhaar number is 999999999998' }] // Will be overridden or matched
            }),
            getViewport: () => ({ width: 100, height: 100 }),
            render: () => ({
              promise: Promise.resolve()
            })
          })
        })
      };
    })
  };
});

describe('AadhaarService - Unit Tests', () => {
  const dummyTenantId = new mongoose.Types.ObjectId();

  it('should throw an error if license features do not include Aadhaar', async () => {
    vi.spyOn(SecurityManager.getInstance(), 'getTenantFeatures').mockResolvedValue({
      email: true,
      sms: true,
      aadhaar: false,
      storage: 'local'
    });

    await expect(AadhaarService.validateAadhaarLicense(dummyTenantId))
      .rejects.toThrow('Aadhaar verification is not enabled in your license.');
  });

  it('should pass validation if license features include Aadhaar', async () => {
    vi.spyOn(SecurityManager.getInstance(), 'getTenantFeatures').mockResolvedValue({
      email: true,
      sms: true,
      aadhaar: true,
      storage: 'local'
    });

    await expect(AadhaarService.validateAadhaarLicense(dummyTenantId))
      .resolves.not.toThrow();
  });

  it('should throw password error if PDF parsing fails due to password mismatch', async () => {
    const emptyPdfBuffer = Buffer.from('%PDF-1.4 ...');
    await expect(AadhaarService.extractAadhaarText(emptyPdfBuffer, 'wrong-password'))
      .rejects.toThrow(/password/i);
  });

  it('should render PDF page and process Aadhaar payload correctly if text contains Aadhaar', async () => {
    vi.spyOn(SecurityManager.getInstance(), 'getTenantFeatures').mockResolvedValue({
      email: true,
      sms: true,
      aadhaar: true,
      storage: 'local'
    });

    // Dynamically find a valid Verhoeff-compliant Aadhaar number using PolicyEngine
    let validAadhaar = '';
    for (let i = 0; i <= 9; i++) {
      const candidate = `99999999999${i}`;
      if (PolicyEngine.validateIdentity(candidate).allowed) {
        validAadhaar = candidate;
        break;
      }
    }
    expect(validAadhaar).not.toBe('');

    // Spy on extractAadhaarText to return a string containing the valid Aadhaar
    vi.spyOn(AadhaarService, 'extractAadhaarText').mockResolvedValue(`My Aadhaar number is ${validAadhaar}`);

    const pdfBuffer = Buffer.from('%PDF-1.4 ... mock contents');
    const result = await AadhaarService.processAadhaar(pdfBuffer, undefined, dummyTenantId);

    expect(result.verified).toBe(true);
    expect(result.maskedAadhaar).toBe('XXXX XXXX ' + validAadhaar.slice(-4));
    expect(result.imageUrl).toContain('data:image/png;base64,');
    expect(result.pdfData).toBe(pdfBuffer.toString('base64'));
  });
});
