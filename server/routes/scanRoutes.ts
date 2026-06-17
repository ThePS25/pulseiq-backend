import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { startScan, getScanStatus, streamScanProgress, getScanResult } from '../controllers/scanController';

const router = Router();

router.use(authenticate);

router.post('/', startScan);
router.get('/:id/status', getScanStatus);
router.get('/:id/stream', streamScanProgress);
router.get('/:id', getScanResult);

export default router;
