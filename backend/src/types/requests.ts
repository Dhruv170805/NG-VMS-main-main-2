import { Request } from 'express';
import mongoose from 'mongoose';
import { ITenant } from '../models/Tenant';

/**
 * Request augmented with Tenant information by TenantMiddleware
 */
export interface TenantRequest extends Request {
  tenantId?: mongoose.Types.ObjectId;
  tenant?: ITenant;
  [key: string]: any;
}

/**
 * Request augmented with User information by AuthMiddleware
 */
export interface AuthRequest extends TenantRequest {
  user?: {
    id: string;
    name: string;
    role: string;
    tenantId: string;
  };
}
