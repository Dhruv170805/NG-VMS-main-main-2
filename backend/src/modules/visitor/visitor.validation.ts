import { validateBody } from '../../middleware/validate';

export const registerVisitorSchema = {
  name: { type: 'string' as const, required: true, min: 2, max: 100 },
  email: { 
    type: 'string' as const, 
    required: true, 
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
  },
  phone: { 
    type: 'string' as const, 
    required: true, 
    pattern: /^\d{10}$/ 
  },
  purpose: { type: 'string' as const, required: true },
  hostName: { type: 'string' as const, required: true },
  requestedDuration: { 
    type: 'string' as const, 
    enum: ['1H', '2H', '3H', '5H', 'FULL_DAY'] 
  }
};

export const updateStatusSchema = {
  status: { 
    type: 'string' as const, 
    required: true,
    enum: ['PENDING_GUARD', 'SENT_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'GATE_IN', 'MEET_IN', 'MEET_OUT', 'GATE_OUT', 'CANCEL_MEET', 'DENIED_BLACKLIST']
  }
};

export const validateRegisterVisitor = validateBody(registerVisitorSchema);
export const validateUpdateStatus = validateBody(updateStatusSchema);
