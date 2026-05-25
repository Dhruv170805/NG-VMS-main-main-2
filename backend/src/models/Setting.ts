import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  tenantId: mongoose.Types.ObjectId;
  key: string;
  value: any;
}

const SettingSchema: Schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  key: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true });

// Key should be unique per tenant
SettingSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export default mongoose.model<ISetting>('Setting', SettingSchema);
