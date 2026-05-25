import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  subdomain: string;
  licenseKey: string; // The encrypted license string
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema = new Schema({
  name: { type: String, required: true },
  subdomain: { type: String, required: true, unique: true, index: true },
  licenseKey: { type: String, required: true },
  logoUrl: { type: String }
}, { timestamps: true });

export default mongoose.model<ITenant>('Tenant', TenantSchema);
