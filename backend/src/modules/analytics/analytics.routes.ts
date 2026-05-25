import { Router } from 'express';
import { 
  getVisitorTraffic, getPurposeDistribution, getHostDistribution, 
  getShiftSummary, getHourlyDensity, getDailyDistribution, 
  getStatusDistribution, exportPurposeReport 
} from './analytics.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/traffic', authorize('ADMIN'), getVisitorTraffic);
router.get('/purposes', authorize('ADMIN'), getPurposeDistribution);
router.get('/hosts', authorize('ADMIN'), getHostDistribution);
router.get('/shift-summary', authorize('ADMIN', 'GUARD'), getShiftSummary);
router.get('/hourly-density', authorize('ADMIN'), getHourlyDensity);
router.get('/daily-distribution', authorize('ADMIN'), getDailyDistribution);
router.get('/status-distribution', authorize('ADMIN'), getStatusDistribution);
router.get('/export-purposes', authorize('ADMIN'), exportPurposeReport);

export default router;
