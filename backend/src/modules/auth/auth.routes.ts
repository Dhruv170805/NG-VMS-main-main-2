import { Router } from 'express';
import { 
    registerEmployee, 
    loginEmployee, 
    logoutEmployee,
    getMe,
    updatePassword, 
    forgotPassword, 
    resetPassword,
    refreshAccessToken
} from './auth.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

const router = Router();

router.post('/register', protect, authorize('ADMIN'), registerEmployee);
router.post('/login', loginEmployee);
router.post('/logout', logoutEmployee);
router.post('/refresh', refreshAccessToken);
router.get('/me', protect, getMe);
router.patch('/update-password', protect, updatePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:resetToken', resetPassword);

export default router;
