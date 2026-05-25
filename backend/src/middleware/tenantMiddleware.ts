import { Request, Response, NextFunction } from 'express';
import Tenant from '../models/Tenant';
import mongoose from 'mongoose';
import { TenantRequest } from '../types/requests';
import { SecurityManager } from '../utils/securityManager';

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Exempt routes that don't require a tenant context (e.g., bootstrap and health checks)
  // We also exempt the license update route so a locked system can still be unlocked
  const exemptRoutes = [
    '/api/v1/bootstrap', '/api/v1/system/health', '/api/v1/system/version', '/api/v1/system/config', '/api/v1/system/license',
    '/api/bootstrap', '/api/system/health', '/api/system/version', '/api/system/config', '/api/system/license',
    '/bootstrap', '/system/health', '/system/version', '/system/config', '/system/license'
  ];
  if (exemptRoutes.some(route => req.originalUrl.startsWith(route))) {
    const subdomain = req.headers['x-tenant-id'] as string;
    try {
      let tenant = null;
      if (subdomain) {
        tenant = await Tenant.findOne({ subdomain });
      }
      if (!tenant && (!subdomain || subdomain === 'demo' || subdomain === 'localhost' || subdomain === 'default')) {
        tenant = await Tenant.findOne();
      }
      if (tenant) {
        const tenantReq = req as TenantRequest;
        tenantReq.tenant = tenant;
        tenantReq.tenantId = tenant._id as mongoose.Types.ObjectId;
      }
    } catch (error) {
      console.error('[TENANT MIDDLEWARE] Safe extract error:', error);
    }
    return next();
  }

  let subdomain = req.headers['x-tenant-id'] as string;

  if (!subdomain) {
    // Fallback: extract subdomain from Host header to handle cases where proxy strips custom headers
    const host = req.headers.host || '';
    const hostname = host.split(':')[0];
    const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':') || hostname === 'localhost' || hostname === '127.0.0.1';
    
    // Only apply the IP/localhost fallback outside of the test environment
    if (process.env.NODE_ENV !== 'test' && isIp) {
      subdomain = 'demo';
    } else if (!isIp) {
      const parts = hostname.split('.');
      if (parts.length > 2) {
        subdomain = parts[0];
      } else {
        subdomain = 'demo';
      }
    }
  }

  if (!subdomain) {
    return res.status(400).json({ error: 'Tenant identifier missing (x-tenant-id header required)' });
  }

  try {
    let tenant = await Tenant.findOne({ subdomain });
    if (!tenant && (subdomain === 'demo' || subdomain === 'localhost' || subdomain === 'default')) {
      tenant = await Tenant.findOne();
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // License Validation Check
    // We must allow auth routes to bypass the strict license lock so admins can log in to update the license.
    if (!req.originalUrl.startsWith('/api/v1/auth') && !req.originalUrl.startsWith('/api/auth') && !req.originalUrl.startsWith('/auth')) {
      if (!tenant.licenseKey) {
        return res.status(403).json({ error: 'System locked: No valid license found.' });
      }
      
      const securityManager = SecurityManager.getInstance();
      const licenseCheck = await securityManager.validateTenantLicense(tenant.licenseKey);
      
      if (!licenseCheck.valid) {
        return res.status(403).json({ error: `System locked: ${licenseCheck.reason}` });
      }

      // Ensure the license is bound to this specific tenant subdomain
      const licenseCompanyCode = licenseCheck.data?.companyCode;
      if (!licenseCompanyCode) {
        if (process.env.NODE_ENV === 'production') {
          return res.status(403).json({ error: 'System locked: License is missing company binding.' });
        }
      } else if (licenseCompanyCode.toLowerCase() !== tenant.subdomain.toLowerCase()) {
        return res.status(403).json({ error: 'System locked: License company code mismatch.' });
      }
    }

    const tenantReq = req as TenantRequest;
    tenantReq.tenant = tenant;
    tenantReq.tenantId = tenant._id as mongoose.Types.ObjectId;
    next();
  } catch (error) {
    console.error('[TENANT MIDDLEWARE] Error:', error);
    res.status(500).json({ error: 'Internal Server Error during tenant identification' });
  }
};
