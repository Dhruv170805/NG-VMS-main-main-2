import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] || 'none';
    const user = (req as any).user;
    
    logger.info({
      type: 'request',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      tenantId: tenantId.toString(),
      userId: user?.id || 'anonymous',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }, `${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
};

export default requestLogger;
