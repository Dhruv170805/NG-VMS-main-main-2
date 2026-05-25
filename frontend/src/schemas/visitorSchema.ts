import { z } from 'zod';

/**
 * AETHER Sovereign Enums (Blueprint Section 10)
 * Strict alignment between Backend Mongoose and Frontend Zod
 */
/**
 * AETHER Sovereign Status Reconciliation (Blueprint Section 10)
 * Maps legacy/rogue statuses to the modern state machine.
 */
const STATUS_MAP: Record<string, string> = {
  'PENDING': 'PENDING_GUARD',
  'CHECKED_IN': 'GATE_IN',
  'IN_MEETING': 'MEET_IN',
  'MEETING_DONE': 'MEET_OUT',
  'CHECKED_OUT': 'GATE_OUT',
  'REJECT': 'REJECTED'
};

export const VisitorStatusEnum = z.preprocess((val) => {
  if (!val) return 'PENDING_GUARD';
  const status = String(val).toUpperCase();
  return STATUS_MAP[status] || status;
}, z.enum([
  'PENDING_GUARD', 
  'SENT_FOR_APPROVAL', 
  'APPROVED', 
  'REJECTED', 
  'GATE_IN', 
  'MEET_IN', 
  'MEET_OUT', 
  'GATE_OUT', 
  'CANCEL_MEET', 
  'DENIED_BLACKLIST'
]).catch('PENDING_GUARD'));

export const VisitorSchema = z.object({
  _id: z.string(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  email: z.string().email().optional().or(z.literal('')).or(z.null()),
  company: z.string().optional().or(z.literal('')).or(z.null()),
  purpose: z.string(),
  hostName: z.string(),
  hostId: z.any().optional().or(z.null()), // Can be string or populated object
  status: VisitorStatusEnum,
  photoUrl: z.string().optional().or(z.null()),
  idProofType: z.string().optional().or(z.null()),
  idProofNumber: z.string().optional().or(z.null()),
  idProofPhotoUrl: z.string().optional().or(z.null()),
  aadhaarImageUrl: z.string().optional().or(z.null()),
  aadhaarVerified: z.boolean().optional().or(z.null()),
  maskedAadhaar: z.string().optional().or(z.null()),
  idNumberHash: z.string().optional().or(z.null()),
  encryptedIdProofPreview: z.string().optional().or(z.null()),
  checkInTime: z.string().optional().or(z.null()),
  meetInTime: z.string().optional().or(z.null()),
  meetOutTime: z.string().optional().or(z.null()),
  checkOutTime: z.string().optional().or(z.null()),
  consentGiven: z.boolean().optional().or(z.null()),
  consentTimestamp: z.string().optional().or(z.null()),
  createdAt: z.string().optional().or(z.null()),
  updatedAt: z.string().optional().or(z.null())
});

export const VisitorListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(VisitorSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    pages: z.number()
  }).optional()
});

export type IVisitor = z.infer<typeof VisitorSchema>;
export type IVisitorListResponse = z.infer<typeof VisitorListResponseSchema>;
