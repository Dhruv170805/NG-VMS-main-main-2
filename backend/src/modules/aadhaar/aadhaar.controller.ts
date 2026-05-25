import { Response, RequestHandler } from 'express';
import { TenantRequest } from '../../types/requests';
import { AadhaarService } from './aadhaar.service';

export const processAadhaar: RequestHandler = async (req, res) => {
  const { file, body, tenantId } = req as TenantRequest;
  try {
    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await AadhaarService.processAadhaar(
      file.buffer, 
      body.password, 
      tenantId!
    );
    
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
