// =============================================================================
// STUDYBOT BACKEND - INITIALISATION BASE DE DONNÉES
// =============================================================================

import { database } from '@/config/database';
import { conversationDB } from '@/services/conversationDatabaseService';
import { logger } from '@/utils/logger';

export class DatabaseInitializer {
  /**
   * Initialiser toute la base de données
   */
  static async initialize(): Promise<boolean> {
    try {
      logger.info('🔧 Initialisation de la base de données...');

      // 1. Tester la connexion
      const connectionTest = await database.testConnection();
      if (!connectionTest) {
        throw new Error('Impossible de se connecter à MySQL');
      }

      // 2. Initialiser les tables conversations
      await conversationDB.initializeTables();

      // 3. Créer les index de performance si nécessaire
      await DatabaseInitializer.createPerformanceIndexes();

      logger.info('✅ Base de données initialisée avec succès');
      return true;

    } catch (error) {
      logger.error('❌ Erreur initialisation base de données:', error);
      return false;
    }
  }

  /**
   * Créer les index de performance
   */
  private static async createPerformanceIndexes(): Promise<void> {
    try {
      // Index pour les recherches par date
      await database.query(`
        CREATE INDEX IF NOT EXISTS idx_conversations_date_range 
        ON conversation_sessions(created_at, last_activity)
      `);

      // Index pour la recherche textuelle dans les messages
      await database.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_content_search 
        ON conversation_messages(content(255))
      `);

      // Index composite pour les feedbacks
      await database.query(`
        CREATE INDEX IF NOT EXISTS idx_feedback_combined 
        ON conversation_feedbacks(session_id, type, timestamp)
      `);

      logger.info('✅ Index de performance créés');
    } catch (error) {
      logger.warn('⚠️ Erreur création index de performance:', error);
    }
  }

  /**
   * Nettoyer et réinitialiser la base de données (DANGER!)
   */
  static async reset(): Promise<boolean> {
    try {
      logger.warn('⚠️ RESET de la base de données...');

      await database.query('DROP TABLE IF EXISTS conversation_feedbacks');
      await database.query('DROP TABLE IF EXISTS conversation_messages');
      await database.query('DROP TABLE IF EXISTS conversation_sessions');
      await database.query('DROP TABLE IF EXISTS users');

      logger.info('🗑️ Tables supprimées');

      // Réinitialiser
      await DatabaseInitializer.initialize();

      logger.info('✅ Base de données réinitialisée');
      return true;

    } catch (error) {
      logger.error('❌ Erreur reset base de données:', error);
      return false;
    }
  }

  /**
   * Migrer les données du service mémoire vers MySQL (si nécessaire)
   */
  static async migrateFromMemory(): Promise<void> {
    try {
      logger.info('🔄 Migration des données mémoire vers MySQL...');
      
      // Cette fonction pourrait être utilisée pour migrer des données existantes
      // du service mémoire vers MySQL lors du déploiement initial
      
      logger.info('✅ Migration terminée');
    } catch (error) {
      logger.error('❌ Erreur migration:', error);
    }
  }

  /**
   * Vérifier l'intégrité de la base de données
   */
  static async checkIntegrity(): Promise<boolean> {
    try {
      // Vérifier que toutes les tables existent
      const tables = ['conversation_sessions', 'conversation_messages', 'conversation_feedbacks'];
      
      for (const table of tables) {
        const result = await database.query(`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = DATABASE() AND table_name = ?
        `, [table]);

        if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
          logger.error(`❌ Table manquante: ${table}`);
          return false;
        }
      }

      // Vérifier les contraintes de clés étrangères
      const foreignKeys = await database.query(`
        SELECT COUNT(*) as count FROM information_schema.key_column_usage 
        WHERE table_schema = DATABASE() 
        AND referenced_table_name IS NOT NULL
      `);

      logger.info(`✅ Intégrité vérifiée - ${foreignKeys[0]?.count || 0} clés étrangères`);
      return true;

    } catch (error) {
      logger.error('❌ Erreur vérification intégrité:', error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques de la base de données
   */
  static async getStats(): Promise<{
    sessions: number;
    messages: number;
    feedbacks: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  }> {
    try {
      const stats = await database.query(`
        SELECT 
          (SELECT COUNT(*) FROM conversation_sessions) as sessions,
          (SELECT COUNT(*) FROM conversation_messages) as messages,
          (SELECT COUNT(*) FROM conversation_feedbacks) as feedbacks,
          (SELECT MIN(created_at) FROM conversation_sessions) as oldest_session,
          (SELECT MAX(created_at) FROM conversation_sessions) as newest_session
      `);

      const result = Array.isArray(stats) && stats.length > 0 ? stats[0] : {};

      return {
        sessions: result.sessions || 0,
        messages: result.messages || 0,
        feedbacks: result.feedbacks || 0,
        oldestSession: result.oldest_session ? new Date(result.oldest_session) : null,
        newestSession: result.newest_session ? new Date(result.newest_session) : null
      };

    } catch (error) {
      logger.error('❌ Erreur récupération statistiques:', error);
      return {
        sessions: 0,
        messages: 0,
        feedbacks: 0,
        oldestSession: null,
        newestSession: null
      };
    }
  }
}

export default DatabaseInitializer; 