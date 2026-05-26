import { Router } from 'express';
import multer from 'multer';
import { processAadhaar, getLatestAadhaar } from './aadhaar.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

import os from 'os';

const router = Router();
const upload = multer({ dest: os.tmpdir() });

router.use(protect);
router.use(authorize('ADMIN', 'GUARD'));

router.post('/upload', upload.single('file'), processAadhaar);
router.post('/process', upload.single('file'), processAadhaar);
router.get('/latest', getLatestAadhaar);

export default router;
