import { Router } from 'express';
import { getShiftStats, createHandover } from './handover.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

const router = Router();

router.use(protect);
router.use(authorize('ADMIN', 'GUARD'));

router.get('/stats', getShiftStats);
router.post('/submit', createHandover);

export default router;
