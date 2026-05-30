import { Request, Response, NextFunction } from 'express';
import Tenant from '../modules/system/tenant.model';
import mongoose from 'mongoose';
import { TenantRequest } from '../types/requests';
import { SecurityManager } from '../utils/securityManager';

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Exempt routes that do not require strict license locks
  // We use regex to match regardless of API prefix (v1, v2, none)
  const isExempt = /^\/(api\/(v\d+\/)?)?(bootstrap|system\/health|system\/version|system\/config|system\/license|auth)/i.test(req.originalUrl);

  let subdomain = req.headers['x-tenant-id'] as string;

  if (!subdomain) {
    // Robust Host Extraction (IIS, Proxy, Localhost)
    const forwardedHost = req.headers['x-forwarded-host'] || req.headers['x-original-host'] || req.headers.host || '';
    const hostStr = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    
    try {
      // Use URL parsing to safely extract hostname without ports
      const hostname = new URL(`http://${hostStr}`).hostname;
      
      const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === 'localhost';
      const isDynamicLocal = hostname.endsWith('.local') || hostname.endsWith('.lan') || hostname.endsWith('.internal');
      
      if (!isIp && !isDynamicLocal) {
        const parts = hostname.split('.');
        if (parts.length >= 2) {
          subdomain = parts[0].toLowerCase() === 'www' && parts.length > 1 ? parts[1] : parts[0];
        }
      }
    } catch (e) {
      console.warn('[TENANT MIDDLEWARE] Hostname parsing error', e);
    }
  }

  try {
    let tenant = null;
    if (subdomain) {
      tenant = await Tenant.findOne({ subdomain });
    }

    const isRelaxedMode = subdomain === 'demo' || subdomain === 'localhost' || subdomain === 'default' || process.env.ALLOW_UNSIGNED_LICENSE === 'true';
    const isTest = process.env.NODE_ENV === 'test';

    // Auto-bind for single tenant environments
    if (!tenant && (!subdomain || isRelaxedMode || isExempt)) {
      if (!isTest || isRelaxedMode || isExempt) {
        const tenantCount = await Tenant.countDocuments();
        if (tenantCount === 1 || isRelaxedMode) {
          // Prefer a real tenant over default/demo ghost tenants
          tenant = await Tenant.findOne({ subdomain: { $nin: ['demo', 'localhost', 'default'] } }).sort({ createdAt: -1 });
          if (!tenant) {
            tenant = await Tenant.findOne().sort({ createdAt: -1 });
          }
        }
      }
    }

    // Identify Tenant
    if (tenant) {
      const tenantReq = req as TenantRequest;
      tenantReq.tenant = tenant;
      tenantReq.tenantId = tenant._id as mongoose.Types.ObjectId;
    } else if (!isExempt) {
      if (!subdomain) {
        return res.status(400).json({ error: 'Tenant identifier missing (x-tenant-id header required) and auto-bind failed' });
      }
      return res.status(404).json({ error: `Tenant '${subdomain}' not found.` });
    }

    // License Lock Enforcement
    if (!isExempt) {
      if (!tenant?.licenseKey) {
        return res.status(403).json({ error: 'System locked: No valid license found.' });
      }
      
      const securityManager = SecurityManager.getInstance();
      const licenseCheck = await securityManager.validateTenantLicense(tenant.licenseKey);
      
      if (!licenseCheck.valid) {
        return res.status(403).json({ error: `System locked: ${licenseCheck.reason}` });
      }

      const licenseCompanyCode = licenseCheck.data?.companyCode;
      if (!licenseCompanyCode) {
        if (process.env.NODE_ENV === 'production') {
          return res.status(403).json({ error: 'System locked: License is missing company binding.' });
        }
      } else if (licenseCompanyCode.toLowerCase() !== tenant.subdomain.toLowerCase()) {
        return res.status(403).json({ error: 'System locked: License company code mismatch.' });
      }
    }

    next();
  } catch (error) {
    console.error('[TENANT MIDDLEWARE] Error:', error);
    res.status(500).json({ error: 'Internal Server Error during tenant identification' });
  }
};
