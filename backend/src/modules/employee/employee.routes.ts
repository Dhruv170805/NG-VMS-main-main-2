import { Router } from 'express';
import { 
  getEmployees, deleteEmployee, toggleAvailability, 
  toggleHostStatus, bulkToggleHostStatus, getEmployeeStats 
} from './employee.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', authorize('ADMIN', 'GUARD', 'RECEPTIONIST'), getEmployees);
router.delete('/:id', authorize('ADMIN'), deleteEmployee);
router.patch('/:id/availability', authorize('ADMIN', 'STAFF', 'MANAGER'), toggleAvailability);
router.patch('/:id/host', authorize('ADMIN'), toggleHostStatus);
router.patch('/bulk-host', authorize('ADMIN'), bulkToggleHostStatus);
router.get('/:id/stats', authorize('ADMIN'), getEmployeeStats);

export default router;
