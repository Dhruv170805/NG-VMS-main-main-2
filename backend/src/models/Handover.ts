import mongoose, { Schema, Document } from 'mongoose';

export interface IHandover extends Document {
  tenantId: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId;
  actorName: string;
  gateId: string;
  shiftStart: Date;
  shiftEnd: Date;
  checkInCount: number;
  checkOutCount: number;
  deniedCount: number;
  notes?: string;
  createdAt: Date;
}

const HandoverSchema: Schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  actor: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  actorName: { type: String, required: true },
  gateId: { type: String, required: true },
  shiftStart: { type: Date, required: true },
  shiftEnd: { type: Date, default: Date.now },
  checkInCount: { type: Number, default: 0 },
  checkOutCount: { type: Number, default: 0 },
  deniedCount: { type: Number, default: 0 },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.model<IHandover>('Handover', HandoverSchema);
