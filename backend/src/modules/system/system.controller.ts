import { Response, RequestHandler, Request } from 'express';
import { TenantRequest, AuthRequest } from '../../types/requests';
import { SystemService } from './system.service';

export const getHealth: RequestHandler = async (req: Request, res: Response) => {
  try {
    const io = req.app.get('socketio');
    const { tenantId } = req as TenantRequest;
    const health = await SystemService.getSystemHealth(io, tenantId);
    res.json(health);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVersion: RequestHandler = async (req: Request, res: Response) => {
  try {
    const version = await SystemService.getSystemVersion();
    res.json(version);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLicense: RequestHandler = async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const license = await SystemService.getLicense(tenantId!);
    res.json(license);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLicense: RequestHandler = async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const { licenseKey } = req.body;
  try {
    if (!licenseKey) return res.status(400).json({ success: false, message: 'License key is required' });
    const result = await SystemService.updateLicense(licenseKey, tenantId!);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const inspectLicense: RequestHandler = async (req: Request, res: Response) => {
  const { licenseKey } = req.body;
  try {
    if (!licenseKey) return res.status(400).json({ success: false, message: 'License key is required' });
    const result = await SystemService.inspectLicense(licenseKey);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTenantConfig: RequestHandler = async (req, res) => {
  const { tenant, tenantId } = req as TenantRequest;
  try {
    if (!tenant) {
      console.error('[SYSTEM CONTROLLER] getTenantConfig: tenant is undefined');
      return res.status(400).json({ success: false, message: 'Tenant not found. Please provide valid x-tenant-id header or ensure the database has been bootstrapped with a valid license.' });
    }
    if (!tenantId) {
      console.error('[SYSTEM CONTROLLER] getTenantConfig: tenantId is undefined');
      return res.status(400).json({ success: false, message: 'Tenant ID is missing. Check database seeding status.' });
    }
    const config = await SystemService.getTenantConfig(tenant, tenantId);
    res.json(config);
  } catch (error: any) {
    console.error('[SYSTEM CONTROLLER] getTenantConfig error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to load tenant configuration' });
  }
};

export const uploadSystemData: RequestHandler = async (req, res) => {
  const { file, body, tenantId } = req as AuthRequest;
  try {
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { type } = body;
    if (type !== 'HOST') {
      return res.status(400).json({ success: false, message: 'Only HOST type is supported for upload' });
    }

    const count = await SystemService.uploadHosts(file.buffer, tenantId!);
    return res.json({ success: true, message: `Successfully processed ${count} hosts into Employee registry.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSystemData: RequestHandler = async (req, res) => {
  const { tenantId } = req as TenantRequest;
  try {
    const data = await SystemService.getSystemData(tenantId!);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSettings: RequestHandler = async (req, res) => {
  const { tenantId } = req as AuthRequest;
  try {
    const settings = await SystemService.getSettings(tenantId!);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSetting: RequestHandler = async (req, res) => {
  const { body, tenantId } = req as AuthRequest;
  const { key, value } = body;
  try {
    const setting = await SystemService.updateSetting(key, value, tenantId!);
    res.json({ success: true, setting });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkUpdateSettings: RequestHandler = async (req, res) => {
  const { body, tenantId } = req as AuthRequest;
  try {
    await SystemService.bulkUpdateSettings(body.settings, tenantId!);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
