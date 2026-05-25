import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, TenantRequest } from '../types/requests';

function isAllowedCsrfOrigin(originOrReferer: string | undefined): boolean {
  if (!originOrReferer) return false;
  try {
    const url = new URL(originOrReferer);
    const hostname = url.hostname;
    const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':') || hostname === 'localhost' || hostname === '127.0.0.1';
    if (isIp) return true;

    const baseFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const baseDomain = baseFrontendUrl.replace(/^https?:\/\//, '').split(':')[0];

    const allowedOrigins = new Set(
      [
        baseFrontendUrl,
        'http://localhost:3000',
        'http://localhost:8080',
        process.env.CORS_EXTRA_ORIGIN,
      ].filter(Boolean)
    );

    const originUrl = `${url.protocol}//${url.host}`;
    if (allowedOrigins.has(originUrl)) return true;

    if (hostname === baseDomain || hostname.endsWith('.' + baseDomain)) {
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

export const protect = (req: Request, res: Response, next: NextFunction): void => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    // Stateless CSRF Protection: Validate Origin/Referer for state-changing requests using cookie auth
    const method = req.method;
    const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    if (isStateChanging) {
      const origin = (req.headers.origin as string) || (req.headers.referer as string);
      if (!isAllowedCsrfOrigin(origin)) {
        res.status(403).json({ message: 'CSRF validation failed: invalid or missing origin' });
        return;
      }
    }
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('FATAL ERROR: JWT_SECRET must be defined');
      }
      const decoded = jwt.verify(token, secret) as { id: string, name: string, role: string, tenantId: string };
      
      const tenantReq = req as TenantRequest;
      // Verify user belongs to this tenant
      if (tenantReq.tenantId && decoded.tenantId !== tenantReq.tenantId.toString()) {
        res.status(401).json({ message: 'Not authorized for this tenant' });
        return;
      }

      (req as AuthRequest).user = decoded;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user || !roles.includes(authReq.user.role)) {
       res.status(403).json({ message: `User role ${authReq.user?.role} is not authorized to access this route` });
       return;
    }
    next();
  };
};
