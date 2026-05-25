import { Router } from 'express';
import { gateCheckIn, gateCheckOut } from './gate.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

const router = Router();

router.use(protect);
router.use(authorize('ADMIN', 'GUARD'));

router.post('/checkin', gateCheckIn);
router.post('/checkout', gateCheckOut);

export default router;
