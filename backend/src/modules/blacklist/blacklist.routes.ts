import { Router } from 'express';
import { 
  getBlacklist, toggleBlacklistStatus, addToBlacklist, removeFromBlacklist 
} from './blacklist.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

const router = Router();

router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', getBlacklist);
router.post('/', addToBlacklist);
router.patch('/:id/toggle', toggleBlacklistStatus);
router.delete('/:id', removeFromBlacklist);

export default router;
