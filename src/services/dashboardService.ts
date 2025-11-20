import database from '../config/database';
import logger from '../utils/logger';

export interface DashboardStats {
  totalConversations: number;
  todayMessages: number;
  todayFeedbacks: number;
  peakHourYesterday: {
    hour: string;
    count: number;
  } | null;
}

export class DashboardService {
  /**
   * Récupère toutes les statistiques du dashboard
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [
        totalConversations,
        todayMessages,
        todayFeedbacks,
        peakHourYesterday
      ] = await Promise.all([
        this.getTotalConversations(),
        this.getTodayMessages(),
        this.getTodayFeedbacks(),
        this.getPeakHourYesterday()
      ]);

      return {
        totalConversations,
        todayMessages,
        todayFeedbacks,
        peakHourYesterday
      };
    } catch (error: any) {
      logger.error('❌ Erreur getDashboardStats:', error);
      throw error;
    }
  }

  /**
   * Nombre total de conversations
   */
  private async getTotalConversations(): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM conversation_sessions
      `;
      
      const rows = await database.query(query);
      const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
      return result.total || 0;
    } catch (error: any) {
      logger.error('❌ Erreur getTotalConversations:', error);
      return 0;
    }
  }

  /**
   * Nombre de messages aujourd'hui (dernières 24h)
   */
  private async getTodayMessages(): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM conversation_messages
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `;
      
      const rows = await database.query(query);
      const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
      return result.total || 0;
    } catch (error: any) {
      logger.error('❌ Erreur getTodayMessages:', error);
      return 0;
    }
  }

  /**
   * Nombre de feedbacks aujourd'hui (dernières 24h)
   */
  private async getTodayFeedbacks(): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM conversation_feedbacks
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `;
      
      const rows = await database.query(query);
      const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
      return result.total || 0;
    } catch (error: any) {
      logger.error('❌ Erreur getTodayFeedbacks:', error);
      return 0;
    }
  }

  /**
   * Heure de pointe d'hier (tranche horaire avec le plus d'utilisateurs)
   */
  private async getPeakHourYesterday(): Promise<{ hour: string; count: number } | null> {
    try {
      const query = `
        SELECT 
          HOUR(timestamp) as hour,
          COUNT(DISTINCT session_id) as count
        FROM conversation_messages
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
          AND timestamp < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY HOUR(timestamp)
        ORDER BY count DESC
        LIMIT 1
      `;
      
      const rows = await database.query(query);
      const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
      
      if (!result.hour) {
        return null;
      }

      const hour = result.hour;
      const count = result.count;
      
      // Format: "15h-16h"
      return {
        hour: `${hour}h-${hour + 1}h`,
        count
      };
    } catch (error: any) {
      logger.error('❌ Erreur getPeakHourYesterday:', error);
      return null;
    }
  }
}

export default new DashboardService();
