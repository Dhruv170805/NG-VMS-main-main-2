import mongoose, { Schema, Document } from 'mongoose';

export interface ISignature {
  signed: boolean;
  signedBy?: string;
  signedAt?: Date;
  signatureHash?: string;
}

export interface IVisitor extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  company?: string;
  purpose: string;
  hostId?: mongoose.Types.ObjectId;
  hostName: string; // Store name directly if host not in Employee table
  status: 'PENDING_GUARD' | 'SENT_FOR_APPROVAL' | 'APPROVED' | 'REJECTED' | 'GATE_IN' | 'MEET_IN' | 'MEET_OUT' | 'GATE_OUT' | 'CANCEL_MEET' | 'DENIED_BLACKLIST';
  approvalLevel: 'STAFF' | 'MANAGER' | 'ADMIN';
  approvedBy: mongoose.Types.ObjectId[];
  visitTime?: Date;
  requestedDuration?: '1H' | '2H' | '3H' | '5H' | 'FULL_DAY';
  approvedAt?: Date;
  expectedCheckout?: Date;
  photoUrl?: string;
  qrCode?: string;
  startDate?: Date;
  endDate?: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  meetInTime?: Date;
  meetOutTime?: Date;
  idProofType?: string; // Aadhar, PAN, etc.
  idProofNumber?: string;
  idProofPhotoUrl?: string;
  idNumberHash?: string;
  aadhaarVerified?: boolean;
  maskedAadhaar?: string;
  aadhaarImageUrl?: string;
  encryptedIdProofPreview?: string; // Encrypted base64 image of the full ID
  hostRemark?: string;
  processedBy?: string;
  consentGiven: boolean;
  consentTimestamp: Date;
  visitorSignature?: ISignature;
  guardSignature?: ISignature;
  hostSignature?: ISignature;
  createdAt: Date;
}

const VisitorSchema: Schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  company: { type: String },
  purpose: { type: String, required: true },
  hostId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  hostName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['PENDING_GUARD', 'SENT_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'GATE_IN', 'MEET_IN', 'MEET_OUT', 'GATE_OUT', 'CANCEL_MEET', 'DENIED_BLACKLIST'], 
    default: 'PENDING_GUARD' 
  },
  approvalLevel: {
    type: String,
    enum: ['STAFF', 'MANAGER', 'ADMIN'],
    default: 'STAFF'
  },
  approvedBy: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
  visitTime: { type: Date },
  requestedDuration: { 
    type: String, 
    enum: ['1H', '2H', '3H', '5H', 'FULL_DAY'],
    default: '1H'
  },
  approvedAt: { type: Date },
  expectedCheckout: { type: Date },
  photoUrl: { type: String },
  qrCode: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  meetInTime: { type: Date },
  meetOutTime: { type: Date },
  idProofType: { type: String },
  idProofNumber: { type: String },
  idProofPhotoUrl: { type: String },
  idNumberHash: { type: String },
  aadhaarVerified: { type: Boolean, default: false },
  maskedAadhaar: { type: String },
  aadhaarImageUrl: { type: String },
  encryptedIdProofPreview: { type: String },
  hostRemark: { type: String },
  processedBy: { type: String },
  consentGiven: { type: Boolean, default: false },
  consentTimestamp: { type: Date },
  visitorSignature: {
    signed: { type: Boolean, default: false },
    signedBy: { type: String },
    signedAt: { type: Date },
    signatureHash: { type: String }
  },
  guardSignature: {
    signed: { type: Boolean, default: false },
    signedBy: { type: String },
    signedAt: { type: Date },
    signatureHash: { type: String }
  },
  hostSignature: {
    signed: { type: Boolean, default: false },
    signedBy: { type: String },
    signedAt: { type: Date },
    signatureHash: { type: String }
  },
}, { timestamps: true });

// Compound & Performance Optimization Indexes
VisitorSchema.index({ tenantId: 1, hostId: 1, updatedAt: -1 });
VisitorSchema.index({ tenantId: 1, phone: 1 });
VisitorSchema.index({ tenantId: 1, status: 1 });
VisitorSchema.index({ tenantId: 1, idNumberHash: 1 });
VisitorSchema.index({ tenantId: 1, name: 1 });
VisitorSchema.index({ tenantId: 1, company: 1 });

export default mongoose.model<IVisitor>('Visitor', VisitorSchema);
