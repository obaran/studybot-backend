// =============================================================================
// STUDYBOT BACKEND - ROUTES ANALYTICS
// =============================================================================

import { Router } from 'express';
import { analyticsController } from '@/controllers/analyticsController';

const router = Router();

// GET /api/admin/analytics/stats
router.get('/stats', (req, res) => analyticsController.getAnalyticsStats(req, res));

// GET /api/admin/analytics/monthly
router.get('/monthly', (req, res) => analyticsController.getMonthlyUsage(req, res));

// GET /api/admin/analytics/export
router.get('/export', (req, res) => analyticsController.exportData(req, res));

export default router;
