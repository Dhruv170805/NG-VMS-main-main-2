import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  department: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'GUARD';
  isAvailable: boolean;
  isHost: boolean;
  avatar?: string;
  requiresPasswordChange: boolean;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
}

const EmployeeSchema: Schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  password: { type: String, required: true },
  department: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['ADMIN', 'MANAGER', 'STAFF', 'GUARD'], 
    default: 'STAFF' 
  },
  isAvailable: { type: Boolean, default: true },
  isHost: { type: Boolean, default: false },
  avatar: { type: String },
  requiresPasswordChange: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
}, { timestamps: true });

// Email should be unique per tenant
EmployeeSchema.index({ tenantId: 1, email: 1 }, { unique: true });
EmployeeSchema.index({ tenantId: 1, isHost: 1, name: 1 });

export default mongoose.model<IEmployee>('Employee', EmployeeSchema);
