// =============================================================================
// STUDYBOT BACKEND - CONTRÔLEUR ANALYTICS
// =============================================================================

import { Request, Response } from 'express';
import { analyticsService } from '@/services/analyticsService';
import { logger } from '@/utils/logger';

class AnalyticsController {
  /**
   * GET /api/admin/analytics/stats
   */
  async getAnalyticsStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await analyticsService.getAnalyticsStats();
      
      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('❌ Erreur getAnalyticsStats:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques analytics',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/admin/analytics/monthly?months=6
   */
  async getMonthlyUsage(req: Request, res: Response): Promise<void> {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const data = await analyticsService.getMonthlyUsage(months);
      
      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('❌ Erreur getMonthlyUsage:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'utilisation mensuelle',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/admin/analytics/export
   */
  async exportData(_req: Request, res: Response): Promise<void> {
    try {
      const data = await analyticsService.exportAllData();
      
      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('❌ Erreur exportData:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export des données',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const analyticsController = new AnalyticsController();
