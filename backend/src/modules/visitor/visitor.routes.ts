import { Router } from 'express';
import { 
  registerVisitor, updateVisitorStatus, getVisitors, getVisitorById, getVisitorPass,
  lookupVisitor, exportVisitors, getVisitorTimeline, sendSecurityAlert,
  updateIdProofPreview, getIdProofPreview, verifyVisitorSignatures
} from './visitor.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

import { validateRegisterVisitor, validateUpdateStatus } from './visitor.validation';

const router = Router();

router.post('/register', validateRegisterVisitor, registerVisitor);
router.get('/export', protect, authorize('ADMIN'), exportVisitors);
router.get('/lookup/:phone', lookupVisitor);
router.get('/:id/timeline', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), getVisitorTimeline);
router.get('/:id/id-preview', protect, authorize('ADMIN'), getIdProofPreview);
router.get('/:id/verify-signatures', verifyVisitorSignatures);
router.patch('/:id/status', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), validateUpdateStatus, updateVisitorStatus);
router.post('/:id/id-preview', protect, authorize('ADMIN', 'GUARD'), updateIdProofPreview);
router.post('/:id/notify-alert', protect, authorize('ADMIN', 'GUARD'), sendSecurityAlert);
// Public minimal pass view (QR scan) — returns only non-sensitive fields
router.get('/:id/pass', getVisitorPass);
// Protected full record — requires authentication
router.get('/:id', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), getVisitorById);
router.get('/', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), getVisitors);

export default router;
