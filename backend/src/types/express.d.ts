import mongoose from 'mongoose';
import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      name: string;
      role: string;
      tenantId: string;
    };
    tenantId?: mongoose.Types.ObjectId;
    tenant?: any;
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  }
}
