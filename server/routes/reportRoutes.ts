import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listReports,
  getReport,
  deleteReport,
  exportPdf,
  getMetrics,
  getReportStats,
} from '../controllers/reportController';

const router = Router();

router.use(authenticate);

router.get('/stats', getReportStats);
router.get('/', listReports);
router.get('/metrics/:websiteId', getMetrics);
router.get('/:id/pdf', exportPdf);
router.get('/:id', getReport);
router.delete('/:id', deleteReport);

export default router;
