import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemData extends Document {
  tenantId: mongoose.Types.ObjectId;
  type: 'PURPOSE' | 'HOST';
  value: string;
  department?: string; // Applicable for hosts
  email?: string;      // Applicable for hosts
}

const SystemDataSchema: Schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  type: { type: String, enum: ['PURPOSE', 'HOST'], required: true },
  value: { type: String, required: true },
  department: { type: String },
  email: { type: String }
}, { timestamps: true });

export default mongoose.model<ISystemData>('SystemData', SystemDataSchema);
