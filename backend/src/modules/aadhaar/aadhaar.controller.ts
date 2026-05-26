import { Response, RequestHandler } from 'express';
import { TenantRequest } from '../../types/requests';
import { AadhaarService } from './aadhaar.service';
import fs from 'fs';

export const processAadhaar: RequestHandler = async (req, res) => {
  const { file, body, tenantId } = req as TenantRequest;
  try {
    if (!file || !file.path) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = fs.readFileSync(file.path);

    const result = await AadhaarService.processAadhaar(
      fileBuffer, 
      body.password, 
      tenantId!
    );

    // Delete the temporary file from disk to prevent storage leaks
    fs.unlinkSync(file.path);
    
    res.json(result);
  } catch (error: any) {
    console.error('[AADHAAR] Error:', error);
    const isLicenseError = error.message.includes('license');
    res.status(isLicenseError ? 403 : 400).json({ error: error.message });
  }
};

export const getLatestAadhaar: RequestHandler = async (req, res) => {
  const { query, tenantId } = req as TenantRequest;
  try {
    const result = await AadhaarService.getLatestPdf(
      query.folder as string, 
      tenantId!
    );
    res.json(result);
  } catch (error: any) {
    console.error('[AADHAAR] Fetch Latest Error:', error);
    const isLicenseError = error.message.includes('license');
    res.status(isLicenseError ? 403 : 400).json({ error: error.message });
  }
};
