import mongoose, { Schema, Document } from 'mongoose';

export interface IBlacklist extends Document {
  tenantId: mongoose.Types.ObjectId;
  idNumberHash: string; // SHA-256 hash of the ID number (Aadhar/PAN etc)
  name: string;
  company?: string;
  visitorId?: mongoose.Types.ObjectId;
  reason: string;
  active: boolean;
  createdAt: Date;
}

const BlacklistSchema: Schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  idNumberHash: { type: String, required: true },
  name: { type: String, required: true },
  company: { type: String },
  visitorId: { type: Schema.Types.ObjectId, ref: 'Visitor' },
  reason: { type: String, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: { createdAt: true, updatedAt: true } });

// ID Hash should be unique per tenant
BlacklistSchema.index({ tenantId: 1, idNumberHash: 1 }, { unique: true });

export default mongoose.model<IBlacklist>('Blacklist', BlacklistSchema);
