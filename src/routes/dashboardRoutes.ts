import { Router } from 'express';
import dashboardController from '../controllers/dashboardController';

const router = Router();

/**
 * GET /api/admin/dashboard/stats
 * Récupère les statistiques du dashboard
 */
router.get('/stats', (req, res) => dashboardController.getDashboardStats(req, res));

export default router;
