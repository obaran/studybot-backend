import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';
import logger from '../utils/logger';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  /**
   * Récupère les statistiques du dashboard
   * GET /api/admin/dashboard/stats
   */
  async getDashboardStats(_req: Request, res: Response): Promise<void> {
    try {
      logger.info('📊 Récupération des statistiques dashboard');

      const stats = await this.dashboardService.getDashboardStats();

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('❌ Erreur récupération stats dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default new DashboardController();
