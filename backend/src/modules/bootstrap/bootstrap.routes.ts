import { Router } from 'express';
import { BootstrapController } from './bootstrap.controller';

const router = Router();

// Endpoint to check if bootstrap is required
router.get('/status', BootstrapController.checkStatus);

// Endpoint to execute the first-run setup wizard
// This endpoint internally enforces that it can only be run once.
router.post('/run', BootstrapController.runBootstrap);

export default router;
