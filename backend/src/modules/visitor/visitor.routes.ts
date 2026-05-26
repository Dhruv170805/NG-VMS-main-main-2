import express, { Router } from 'express';
import { 
  registerVisitor, updateVisitorStatus, getVisitors, getVisitorById, getVisitorPass,
  lookupVisitor, exportVisitors, getVisitorTimeline, sendSecurityAlert,
  updateIdProofPreview, getIdProofPreview, verifyVisitorSignatures
} from './visitor.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

import { validateRegisterVisitor, validateUpdateStatus } from './visitor.validation';

const router = Router();

router.post('/register', express.json({ limit: '5mb' }), validateRegisterVisitor, registerVisitor);
router.get('/export', protect, authorize('ADMIN'), exportVisitors);
// Public endpoints for visitor tracking
router.get('/lookup/:phone', lookupVisitor);
router.get('/:id/pass', getVisitorPass);

router.get('/:id/timeline', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), getVisitorTimeline);
router.get('/:id/id-preview', protect, authorize('ADMIN'), getIdProofPreview);
router.get('/:id/verify-signatures', protect, authorize('ADMIN', 'GUARD'), verifyVisitorSignatures);
router.patch('/:id/status', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), validateUpdateStatus, updateVisitorStatus);
router.post('/:id/id-preview', express.json({ limit: '5mb' }), protect, authorize('ADMIN', 'GUARD'), updateIdProofPreview);
router.post('/:id/notify-alert', protect, authorize('ADMIN', 'GUARD'), sendSecurityAlert);

// Protected full record — requires authentication
router.get('/:id', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), getVisitorById);
router.get('/', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), getVisitors);

export default router;
