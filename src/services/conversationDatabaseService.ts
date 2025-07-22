// =============================================================================
// STUDYBOT BACKEND - SERVICE BASE DE DONNÉES CONVERSATIONS
// =============================================================================

import { database } from '@/config/database';
import { logger } from '@/utils/logger';
import { ChatMessage } from '@/types';

export interface DatabaseSession {
  session_id: string;
  user_identifier?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  last_activity: Date;
  is_active: boolean;
}

export interface DatabaseMessage {
  message_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface DatabaseFeedback {
  feedback_id: string;
  message_id: string;
  session_id: string;
  type: 'positive' | 'negative';
  comment?: string;
  timestamp: Date;
}

export interface ConversationSummary {
  session_id: string;
  user_identifier?: string;
  ip_address?: string;
  start_time: Date;
  last_activity: Date;
  message_count: number;
  positive_feedback_count: number;
  negative_feedback_count: number;
  is_active: boolean;
}

class ConversationDatabaseService {
  private readonly MAX_MESSAGES_PER_SESSION = 50;

  constructor() {
    logger.info('💾 Service base de données conversations initialisé');
  }

  /**
   * Initialiser les tables si elles n'existent pas
   */
  async initializeTables(): Promise<void> {
    try {
      // Table des sessions
      await database.query(`
        CREATE TABLE IF NOT EXISTS conversation_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          user_identifier VARCHAR(255),
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          INDEX idx_session_id (session_id),
          INDEX idx_created_at (created_at),
          INDEX idx_last_activity (last_activity)
        )
      `);

      // Table des messages
      await database.query(`
        CREATE TABLE IF NOT EXISTS conversation_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          message_id VARCHAR(255) UNIQUE NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          role ENUM('user', 'assistant') NOT NULL,
          content TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSON,
          INDEX idx_message_id (message_id),
          INDEX idx_session_id (session_id),
          INDEX idx_timestamp (timestamp),
          INDEX idx_role (role)
        )
      `);

      // Table des feedbacks
      await database.query(`
        CREATE TABLE IF NOT EXISTS conversation_feedbacks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          feedback_id VARCHAR(255) UNIQUE NOT NULL,
          message_id VARCHAR(255) NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          type ENUM('positive', 'negative') NOT NULL,
          comment TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_feedback_id (feedback_id),
          INDEX idx_message_id (message_id),
          INDEX idx_session_id (session_id),
          INDEX idx_type (type),
          INDEX idx_timestamp (timestamp)
        )
      `);

      logger.info('✅ Tables conversations initialisées');
    } catch (error) {
      logger.error('❌ Erreur initialisation tables:', error);
      throw error;
    }
  }

  /**
   * Créer ou mettre à jour une session
   */
  async createOrUpdateSession(
    sessionId: string, 
    userIdentifier?: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    try {
      await database.query(`
        INSERT INTO conversation_sessions (session_id, user_identifier, ip_address, user_agent)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          last_activity = CURRENT_TIMESTAMP,
          user_identifier = COALESCE(VALUES(user_identifier), user_identifier),
          ip_address = COALESCE(VALUES(ip_address), ip_address),
          user_agent = COALESCE(VALUES(user_agent), user_agent)
      `, [sessionId, userIdentifier, ipAddress, userAgent]);

      logger.info(`💾 Session créée/mise à jour: ${sessionId}`);
    } catch (error) {
      logger.error('❌ Erreur création session:', error);
      throw error;
    }
  }

  /**
   * Ajouter un message à la conversation - VERSION SIMPLIFIÉE
   */
  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string, metadata?: any): Promise<string> {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 1. Créer la session si elle n'existe pas
      await database.query(`
        INSERT IGNORE INTO conversation_sessions (session_id) VALUES (?)
      `, [sessionId]);

      // 2. Ajouter le message
      await database.query(`
        INSERT INTO conversation_messages (message_id, session_id, role, content, metadata)
        VALUES (?, ?, ?, ?, ?)
      `, [messageId, sessionId, role, content, metadata ? JSON.stringify(metadata) : null]);

      // 3. Mettre à jour la dernière activité
      await database.query(`
        UPDATE conversation_sessions 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE session_id = ?
      `, [sessionId]);

      logger.info(`💾 Message ajouté: ${messageId} à ${sessionId} (version simplifiée)`);
      return messageId;
    } catch (error) {
      logger.error('❌ Erreur ajout message:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique d'une conversation
   */
  async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const messages = await database.query(`
        SELECT message_id, session_id, role, content, timestamp, metadata
        FROM conversation_messages 
        WHERE session_id = ? 
        ORDER BY timestamp ASC
      `, [sessionId]);

      if (!Array.isArray(messages)) {
        return [];
      }

      // Mettre à jour la dernière activité
      await database.query(`
        UPDATE conversation_sessions 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE session_id = ?
      `, [sessionId]);

      const chatMessages: ChatMessage[] = messages.map((msg: any) => ({
        id: msg.message_id,
        sessionId: msg.session_id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined
      }));

      logger.info(`💾 Historique récupéré pour ${sessionId}: ${chatMessages.length} messages`);
      return chatMessages;
    } catch (error) {
      logger.error('❌ Erreur récupération historique:', error);
      return [];
    }
  }

  /**
   * Ajouter un feedback
   */
  async addFeedback(messageId: string, sessionId: string, type: 'positive' | 'negative', comment?: string): Promise<string> {
    try {
      const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await database.query(`
        INSERT INTO conversation_feedbacks (feedback_id, message_id, session_id, type, comment)
        VALUES (?, ?, ?, ?, ?)
      `, [feedbackId, messageId, sessionId, type, comment]);

      logger.info(`💾 Feedback ajouté: ${feedbackId} pour ${messageId}`);
      return feedbackId;
    } catch (error) {
      logger.error('❌ Erreur ajout feedback:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les conversations (pour l'admin) - AVEC FILTRES
   */
  async getAllConversations(
    limit = 20,
    offset = 0,
    search?: string,
    dateFrom?: string,
    dateTo?: string,
    feedbackType?: 'positive' | 'negative' | 'none' | 'all'
  ): Promise<{ conversations: ConversationSummary[], total: number }> {
    try {
      let whereClause = 'WHERE 1=1';
      let params: any[] = [];

      // Filtre de recherche - recherche dans les messages
      if (search && search.trim()) {
        whereClause += ` AND EXISTS (
          SELECT 1 FROM conversation_messages cm 
          WHERE cm.session_id = cs.session_id 
          AND cm.content LIKE ?
        )`;
        params.push(`%${search.trim()}%`);
      }

      // Filtre par date
      if (dateFrom) {
        whereClause += ` AND DATE(cs.created_at) >= ?`;
        params.push(dateFrom);
      }
      if (dateTo) {
        whereClause += ` AND DATE(cs.created_at) <= ?`;
        params.push(dateTo);
      }

      // Filtre par feedback
      if (feedbackType && feedbackType !== 'all') {
        if (feedbackType === 'positive') {
          whereClause += ` AND EXISTS (
            SELECT 1 FROM conversation_feedbacks cf 
            WHERE cf.session_id = cs.session_id 
            AND cf.type = 'positive'
          )`;
        } else if (feedbackType === 'negative') {
          whereClause += ` AND EXISTS (
            SELECT 1 FROM conversation_feedbacks cf 
            WHERE cf.session_id = cs.session_id 
            AND cf.type = 'negative'
          )`;
        } else if (feedbackType === 'none') {
          whereClause += ` AND NOT EXISTS (
            SELECT 1 FROM conversation_feedbacks cf 
            WHERE cf.session_id = cs.session_id
          )`;
        }
      }
      
      // Récupérer le total avec filtres
      const totalQuery = `SELECT COUNT(*) as total FROM conversation_sessions cs ${whereClause}`;
      const totalResult = await database.query(totalQuery, params);
      const total = Array.isArray(totalResult) && totalResult.length > 0 ? totalResult[0].total : 0;

      // Récupérer les conversations avec filtres et pagination
      const conversationsQuery = `
        SELECT 
          cs.session_id,
          cs.user_identifier,
          cs.ip_address,
          cs.created_at as start_time,
          cs.last_activity,
          cs.is_active,
          COUNT(cm.id) as message_count
        FROM conversation_sessions cs
        LEFT JOIN conversation_messages cm ON cs.session_id = cm.session_id
        ${whereClause}
        GROUP BY cs.session_id, cs.user_identifier, cs.ip_address, cs.created_at, cs.last_activity, cs.is_active
        ORDER BY cs.last_activity DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      const conversations = await database.query(conversationsQuery, params);

      const conversationSummaries: ConversationSummary[] = Array.isArray(conversations) 
        ? conversations.map((conv: any) => ({
            session_id: conv.session_id,
            user_identifier: conv.user_identifier,
            ip_address: conv.ip_address,
            start_time: new Date(conv.start_time),
            last_activity: new Date(conv.last_activity),
            message_count: parseInt(conv.message_count) || 0,
            positive_feedback_count: 0, // TODO: Implémenter quand feedbacks disponibles
            negative_feedback_count: 0,
            is_active: Boolean(conv.is_active)
          }))
        : [];

      logger.info(`💾 Conversations récupérées: ${conversationSummaries.length}/${total} (avec filtres: search="${search}", dateFrom="${dateFrom}", dateTo="${dateTo}", feedback="${feedbackType}")`);
      logger.info(`🔍 Requête SQL exécutée: ${conversationsQuery.replace(/\s+/g, ' ').trim()}`);
      return { conversations: conversationSummaries, total };
    } catch (error) {
      logger.error('❌ Erreur récupération conversations:', error);
      throw error;
    }
  }

  /**
   * Récupérer une conversation complète avec messages et feedbacks
   */
  async getFullConversation(sessionId: string): Promise<{
    session: DatabaseSession | null;
    messages: (DatabaseMessage & { feedbacks: DatabaseFeedback[] })[];
  }> {
    try {
      // Récupérer la session
      const sessionResult = await database.query(`
        SELECT session_id, user_identifier, ip_address, user_agent, created_at, last_activity, is_active
        FROM conversation_sessions 
        WHERE session_id = ?
      `, [sessionId]);

      const session: DatabaseSession | null = Array.isArray(sessionResult) && sessionResult.length > 0 
        ? {
            session_id: sessionResult[0].session_id,
            user_identifier: sessionResult[0].user_identifier,
            ip_address: sessionResult[0].ip_address,
            user_agent: sessionResult[0].user_agent,
            created_at: new Date(sessionResult[0].created_at),
            last_activity: new Date(sessionResult[0].last_activity),
            is_active: Boolean(sessionResult[0].is_active)
          }
        : null;

      if (!session) {
        return { session: null, messages: [] };
      }

      // Récupérer les messages avec leurs feedbacks
      const messagesResult = await database.query(`
        SELECT 
          cm.message_id,
          cm.session_id,
          cm.role,
          cm.content,
          cm.timestamp,
          cm.metadata,
          cf.feedback_id,
          cf.type as feedback_type,
          cf.comment as feedback_comment,
          cf.timestamp as feedback_timestamp
        FROM conversation_messages cm
        LEFT JOIN conversation_feedbacks cf ON cm.message_id = cf.message_id
        WHERE cm.session_id = ?
        ORDER BY cm.timestamp ASC, cf.timestamp ASC
      `, [sessionId]);

      const messagesMap = new Map<string, DatabaseMessage & { feedbacks: DatabaseFeedback[] }>();

      if (Array.isArray(messagesResult)) {
        messagesResult.forEach((row: any) => {
          if (!messagesMap.has(row.message_id)) {
            messagesMap.set(row.message_id, {
              message_id: row.message_id,
              session_id: row.session_id,
              role: row.role,
              content: row.content,
              timestamp: new Date(row.timestamp),
              metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
              feedbacks: []
            });
          }

          if (row.feedback_id) {
            messagesMap.get(row.message_id)!.feedbacks.push({
              feedback_id: row.feedback_id,
              message_id: row.message_id,
              session_id: row.session_id,
              type: row.feedback_type,
              comment: row.feedback_comment,
              timestamp: new Date(row.feedback_timestamp)
            });
          }
        });
      }

      const messages = Array.from(messagesMap.values());

      logger.info(`💾 Conversation complète récupérée: ${sessionId} (${messages.length} messages)`);
      return { session, messages };
    } catch (error) {
      logger.error('❌ Erreur récupération conversation complète:', error);
      throw error;
    }
  }

  /**
   * Supprimer une conversation
   */
  async deleteConversation(sessionId: string): Promise<boolean> {
    try {
      await database.transaction(async (connection) => {
        // Supprimer les feedbacks
        await connection.execute(`
          DELETE FROM conversation_feedbacks WHERE session_id = ?
        `, [sessionId]);

        // Supprimer les messages
        await connection.execute(`
          DELETE FROM conversation_messages WHERE session_id = ?
        `, [sessionId]);

        // Supprimer la session
        await connection.execute(`
          DELETE FROM conversation_sessions WHERE session_id = ?
        `, [sessionId]);
      });

      logger.info(`💾 Conversation supprimée: ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('❌ Erreur suppression conversation:', error);
      return false;
    }
  }

  /**
   * Nettoyer les anciennes conversations
   */
  async cleanupOldConversations(daysOld = 30): Promise<number> {
    try {
      const result = await database.query(`
        DELETE FROM conversation_sessions 
        WHERE last_activity < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [daysOld]);

      const deletedCount = result.affectedRows || 0;
      logger.info(`💾 Conversations anciennes supprimées: ${deletedCount}`);
      return deletedCount;
    } catch (error) {
      logger.error('❌ Erreur nettoyage conversations:', error);
      return 0;
    }
  }

  /**
   * Obtenir les statistiques de la base de données
   */
  async getStats(): Promise<{
    sessions: number;
    messages: number;
    feedbacks: number;
    activeConversations: number;
    oldestConversation: Date | null;
    newestConversation: Date | null;
  }> {
    try {
      const stats = await database.query(`
        SELECT 
          (SELECT COUNT(*) FROM conversation_sessions) as sessions,
          (SELECT COUNT(*) FROM conversation_messages) as messages,
          (SELECT COUNT(*) FROM conversation_feedbacks) as feedbacks,
          (SELECT COUNT(*) FROM conversation_sessions WHERE last_activity > DATE_SUB(NOW(), INTERVAL 1 HOUR)) as activeConversations,
          (SELECT MIN(created_at) FROM conversation_sessions) as oldestConversation,
          (SELECT MAX(created_at) FROM conversation_sessions) as newestConversation
      `);

      const result = Array.isArray(stats) && stats.length > 0 ? stats[0] : {};

      return {
        sessions: result.sessions || 0,
        messages: result.messages || 0,
        feedbacks: result.feedbacks || 0,
        activeConversations: result.activeConversations || 0,
        oldestConversation: result.oldestConversation ? new Date(result.oldestConversation) : null,
        newestConversation: result.newestConversation ? new Date(result.newestConversation) : null
      };

    } catch (error) {
      logger.error('❌ Erreur récupération statistiques:', error);
      return {
        sessions: 0,
        messages: 0,
        feedbacks: 0,
        activeConversations: 0,
        oldestConversation: null,
        newestConversation: null
      };
    }
  }
}

// Instance singleton
export const conversationDB = new ConversationDatabaseService();
export default conversationDB; 