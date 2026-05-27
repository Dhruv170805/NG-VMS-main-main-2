import mongoose, { Schema, Document } from 'mongoose';

export interface IVisitorLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  visitorId: mongoose.Types.ObjectId;
  event: string;
  actor?: mongoose.Types.ObjectId;
  actorName?: string;
  details?: string;
  gateId?: string;
  meta?: any;
  createdAt: Date;
}

const VisitorLogSchema: Schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  visitorId: { type: Schema.Types.ObjectId, ref: 'Visitor', required: true },
  event: { type: String, required: true },
  actor: { type: Schema.Types.ObjectId, ref: 'Employee' },
  actorName: { type: String },
  details: { type: String },
  gateId: { type: String },
  meta: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

VisitorLogSchema.index({ visitorId: 1, tenantId: 1, createdAt: 1 });

export default mongoose.model<IVisitorLog>('VisitorLog', VisitorLogSchema);
