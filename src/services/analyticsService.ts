// =============================================================================
// STUDYBOT BACKEND - SERVICE ANALYTICS
// =============================================================================

import { database } from '@/config/database';
import { logger } from '@/utils/logger';

// Prix GPT-4 (par token)
const GPT4_PRICING = {
  input: 0.000006,   // $6 par million
  output: 0.000018   // $18 par million
};

export interface AnalyticsStats {
  totalTokens: number;
  todayTokens: number;
  monthTokens: number;
  lastMonthTokens: number;
  avgTokensPerConversation: number;
  estimatedMonthlyCost: number;
  lastMonthCost: number;
}

export interface MonthlyUsage {
  month: string;
  conversations: number;
  messages: number;
  tokensUsed: number;
  positiveFeedbacks: number;
  negativeFeedbacks: number;
  cost: number;
}

class AnalyticsService {
  /**
   * Récupérer les statistiques analytics
   */
  async getAnalyticsStats(): Promise<AnalyticsStats> {
    try {
      const [totalTokens, todayTokens, monthTokens, lastMonthTokens, avgTokens] = await Promise.all([
        this.getTotalTokens(),
        this.getTodayTokens(),
        this.getMonthTokens(),
        this.getLastMonthTokens(),
        this.getAvgTokensPerConversation()
      ]);

      // Calculer coûts (estimation simple: 50/50 input/output)
      const estimatedMonthlyCost = this.calculateCost(monthTokens);
      const lastMonthCost = this.calculateCost(lastMonthTokens);

      return {
        totalTokens,
        todayTokens,
        monthTokens,
        lastMonthTokens,
        avgTokensPerConversation: avgTokens,
        estimatedMonthlyCost,
        lastMonthCost
      };
    } catch (error: any) {
      logger.error('❌ Erreur getAnalyticsStats:', error);
      throw error;
    }
  }

  /**
   * Total tokens utilisés
   */
  private async getTotalTokens(): Promise<number> {
    try {
      const query = `
        SELECT COALESCE(SUM(tokens_used), 0) as total
        FROM conversation_messages
        WHERE tokens_used IS NOT NULL
      `;
      
      const rows = await database.query(query);
      const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
      return result.total || 0;
    } catch (error: any) {
      logger.error('❌ Erreur getTotalTokens:', error);
      return 0;
    }
  }

  /**
   * Tokens utilisés aujourd'hui (dernières 24h)
   */
  private async getTodayTokens(): Promise<number> {
    try {
      const query = `
        SELECT COALESCE(SUM(tokens_used), 0) as total
        FROM conversation_messages
        WHERE tokens_used IS NOT NULL
          AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `;
      
      const rows = await database.query(query);
      const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
      return result.total || 0;
    } catch (error: any) {
      logger.error('❌ Erreur getTodayTokens:', error);
      return 0;
    }
  }

  /**
   * Tokens utilisés ce mois
   */
  private async getMonthTokens(): Promise<number> {
    try {
      const query = `
        SELECT COALESCE(SUM(tokens_used), 0) as total
        FROM conversation_messages
        WHERE tokens_used IS NOT NULL
          AND YEAR(timestamp) = YEAR(CURDATE())
          AND MONTH(timestamp) = MONTH(CURDATE())
      `;
      
      const rows = await database.query(query);
      const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
      return result.total || 0;
    } catch (error: any) {
      logger.error('❌ Erreur getMonthTokens:', error);
      return 0;
    }
  }

  /**
   * Tokens utilisés mois dernier
   */
  private async getLastMonthTokens(): Promise<number> {
    try {
      const query = `
        SELECT COALESCE(SUM(tokens_used), 0) as total
        FROM conversation_messages
        WHERE tokens_used IS NOT NULL
          AND timestamp >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
          AND timestamp < DATE_FORMAT(CURDATE(), '%Y-%m-01')
      `;
      
      const rows = await database.query(query);
      const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
      return result.total || 0;
    } catch (error: any) {
      logger.error('❌ Erreur getLastMonthTokens:', error);
      return 0;
    }
  }

  /**
   * Tokens moyens par conversation
   */
  private async getAvgTokensPerConversation(): Promise<number> {
    try {
      const query = `
        SELECT COALESCE(AVG(session_tokens), 0) as avg_tokens
        FROM (
          SELECT session_id, SUM(tokens_used) as session_tokens
          FROM conversation_messages
          WHERE tokens_used IS NOT NULL
          GROUP BY session_id
        ) as session_stats
      `;
      
      const rows = await database.query(query);
      const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
      return Math.round(result.avg_tokens || 0);
    } catch (error: any) {
      logger.error('❌ Erreur getAvgTokensPerConversation:', error);
      return 0;
    }
  }

  /**
   * Utilisation mensuelle (graphique)
   */
  async getMonthlyUsage(months: number = 6): Promise<MonthlyUsage[]> {
    try {
      const query = `
        SELECT 
          DATE_FORMAT(cm.timestamp, '%Y-%m') as month,
          COUNT(DISTINCT cm.session_id) as conversations,
          COUNT(cm.id) as messages,
          COALESCE(SUM(cm.tokens_used), 0) as tokens_used,
          COUNT(DISTINCT CASE WHEN cf.type = 'positive' THEN cf.id END) as positive_feedbacks,
          COUNT(DISTINCT CASE WHEN cf.type = 'negative' THEN cf.id END) as negative_feedbacks
        FROM conversation_messages cm
        LEFT JOIN conversation_feedbacks cf ON cm.session_id = cf.session_id
        WHERE cm.timestamp >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        GROUP BY DATE_FORMAT(cm.timestamp, '%Y-%m')
        ORDER BY month DESC
      `;
      
      const rows = await database.query(query, [months]);
      
      if (!Array.isArray(rows)) {
        return [];
      }

      return rows.map((row: any) => ({
        month: row.month,
        conversations: row.conversations || 0,
        messages: row.messages || 0,
        tokensUsed: row.tokens_used || 0,
        positiveFeedbacks: row.positive_feedbacks || 0,
        negativeFeedbacks: row.negative_feedbacks || 0,
        cost: this.calculateCost(row.tokens_used || 0)
      }));
    } catch (error: any) {
      logger.error('❌ Erreur getMonthlyUsage:', error);
      return [];
    }
  }

  /**
   * Calculer le coût estimé (50% input, 50% output)
   */
  private calculateCost(tokens: number): number {
    const inputCost = (tokens * 0.5) * GPT4_PRICING.input;
    const outputCost = (tokens * 0.5) * GPT4_PRICING.output;
    return Math.round((inputCost + outputCost) * 100) / 100; // Arrondir à 2 décimales
  }

  /**
   * Exporter toutes les données analytics (CSV)
   */
  async exportAllData(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          cs.session_id,
          cs.created_at,
          cs.last_activity,
          COUNT(DISTINCT cm.id) as message_count,
          COALESCE(SUM(cm.tokens_used), 0) as total_tokens,
          COUNT(DISTINCT CASE WHEN cf.type = 'positive' THEN cf.id END) as positive_feedbacks,
          COUNT(DISTINCT CASE WHEN cf.type = 'negative' THEN cf.id END) as negative_feedbacks
        FROM conversation_sessions cs
        LEFT JOIN conversation_messages cm ON cs.session_id = cm.session_id
        LEFT JOIN conversation_feedbacks cf ON cs.session_id = cf.session_id
        GROUP BY cs.session_id, cs.created_at, cs.last_activity
        ORDER BY cs.created_at DESC
      `;
      
      const rows = await database.query(query);
      return Array.isArray(rows) ? rows : [];
    } catch (error: any) {
      logger.error('❌ Erreur exportAllData:', error);
      return [];
    }
  }
}

export const analyticsService = new AnalyticsService();
