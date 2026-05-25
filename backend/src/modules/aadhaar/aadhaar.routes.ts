import { Router } from 'express';
import multer from 'multer';
import { processAadhaar, getLatestAadhaar } from './aadhaar.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);
router.use(authorize('ADMIN', 'GUARD'));

router.post('/upload', upload.single('file'), processAadhaar);
router.post('/process', upload.single('file'), processAadhaar);
router.get('/latest', getLatestAadhaar);

export default router;
