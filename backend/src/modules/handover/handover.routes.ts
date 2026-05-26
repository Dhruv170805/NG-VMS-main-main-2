import { Router } from 'express';
import { getShiftStats, createHandover, getLatestHandover } from './handover.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

const router = Router();

router.use(protect);
router.use(authorize('ADMIN', 'GUARD'));

router.get('/stats', getShiftStats);
router.get('/latest', getLatestHandover);
router.post('/submit', createHandover);

export default router;
