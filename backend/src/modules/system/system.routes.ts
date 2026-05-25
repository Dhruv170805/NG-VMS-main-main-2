import { Router } from 'express';
import multer from 'multer';
import { 
  getTenantConfig, uploadSystemData, getSystemData, 
  getSettings, updateSetting, bulkUpdateSettings,
  getHealth, getVersion, getLicense, updateLicense, inspectLicense
} from './system.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public System endpoints
router.get('/health', getHealth);
router.get('/version', getVersion);

router.get('/config', getTenantConfig);
router.get('/data', getSystemData);

// Admin System Settings
router.get('/license', protect, authorize('ADMIN'), getLicense);
router.post('/license', protect, authorize('ADMIN'), updateLicense);
router.patch('/license', protect, authorize('ADMIN'), updateLicense);
router.post('/license/inspect', protect, authorize('ADMIN'), inspectLicense);

router.post('/upload', protect, authorize('ADMIN'), upload.single('file'), uploadSystemData);
router.get('/settings', protect, authorize('ADMIN'), getSettings);
router.patch('/settings', protect, authorize('ADMIN'), updateSetting);
router.patch('/settings/bulk', protect, authorize('ADMIN'), bulkUpdateSettings);

export default router;
