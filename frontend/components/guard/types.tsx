import React from 'react';
import { 
  ShieldCheck, ShieldAlert, LogIn, LogOut, ArrowRight,
  Clock, Ban, CheckCircle2, XCircle, UserCheck
} from 'lucide-react';

export interface Visitor {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  purpose: string;
  hostName: string;
  hostId?: any;
  status: string;
  photoUrl?: string;
  updatedAt: string;
  createdAt: string;
  approvedAt?: string;
  checkInTime?: string;
  checkOutTime?: string;
  meetInTime?: string;
  meetOutTime?: string;
  expectedCheckout?: string;
  requestedDuration?: string;
  idProofType?: string;
  idProofNumber?: string;
  idProofPhotoUrl?: string;
  aadhaarVerified?: boolean;
  maskedAadhaar?: string;
  aadhaarImageUrl?: string;
  hostRemark?: string;
  processedBy?: string;
}

export interface ShiftStats {
  GATE_IN: number;
  GATE_OUT: number;
  DENIED: number;
}

export const STATUS_CONFIG: Record<string, { class: string; label: string; icon: any; color: string }> = {
  PENDING_GUARD:    { class: 'chip_pending', label: 'PENDING', icon: <Clock size={12} />, color: 'var(--status-pending)' },
  SENT_FOR_APPROVAL: { class: 'chip_forwarded', label: 'FORWARDED', icon: <ArrowRight size={12} />, color: 'var(--status-forwarded)' },
  APPROVED:         { class: 'chip_approved', label: 'APPROVED', icon: <CheckCircle2 size={12} />, color: 'var(--status-approved)' },
  REJECTED:         { class: 'chip_rejected', label: 'REJECTED', icon: <XCircle size={12} />, color: 'var(--status-rejected)' },
  GATE_IN:          { class: 'chip_gate_in', label: 'GATE IN', icon: <LogIn size={12} />, color: 'var(--status-gate-in)' },
  MEET_IN:          { class: 'chip_meet_in', label: 'MEET IN', icon: <UserCheck size={12} />, color: 'var(--status-meet-in)' },
  MEET_OUT:         { class: 'chip_meet_out', label: 'MEET OUT', icon: <LogOut size={12} />, color: 'var(--status-meet-out)' },
  GATE_OUT:         { class: 'chip_gate_out', label: 'GATE OUT', icon: <ShieldCheck size={12} />, color: 'var(--status-gate-out)' },
  CANCEL_MEET:      { class: 'chip_no_show', label: 'CANCEL MEET', icon: <Ban size={12} />, color: 'var(--text-tertiary)' },
  DENIED_BLACKLIST: { class: 'chip_denied_blacklist', label: 'BLACKLISTED', icon: <ShieldAlert size={12} />, color: 'var(--apple-red)' },
};
