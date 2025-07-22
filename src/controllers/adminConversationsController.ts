// =============================================================================
// STUDYBOT BACKEND - CONTRÔLEUR ADMIN CONVERSATIONS (BASE DE DONNÉES)
// =============================================================================

import { Request, Response } from 'express';
import {
  ApiResponse,
  Conversation,
  ConversationFilters,
  PaginatedResponse,
  ErrorCodes,
  VALIDATION_RULES
} from '@/types/admin';
import { conversationDB } from '@/services/conversationDatabaseService';
import { database } from '@/config/database';
import { logger } from '@/utils/logger';

// =============================================================================
// UTILITAIRES DE VALIDATION
// =============================================================================

function validatePagination(page?: string | number, limit?: string | number) {
  const parsedPage = Math.max(1, Number(page) || VALIDATION_RULES.pagination.defaultPage);
  const parsedLimit = Math.min(
    Math.max(1, Number(limit) || VALIDATION_RULES.pagination.defaultLimit),
    VALIDATION_RULES.pagination.maxLimit
  );
  
  return { page: parsedPage, limit: parsedLimit };
}

function validateFilters(filters: ConversationFilters): ConversationFilters {
  const validatedFilters: ConversationFilters = {};

  if (filters.search && typeof filters.search === 'string') {
    validatedFilters.search = filters.search.trim().slice(0, 100);
  }

  if (filters.feedback && ['positive', 'negative', 'none', 'all'].includes(filters.feedback)) {
    validatedFilters.feedback = filters.feedback;
  }

  if (filters.dateFrom && typeof filters.dateFrom === 'string') {
    validatedFilters.dateFrom = filters.dateFrom;
  }

  if (filters.dateTo && typeof filters.dateTo === 'string') {
    validatedFilters.dateTo = filters.dateTo;
  }

  return validatedFilters;
}

// =============================================================================
// CONVERSION DES DONNÉES DATABASE VERS FORMAT API
// =============================================================================

async function convertDatabaseConversationsToAPI(
  conversations: any[],
  includeMessages: boolean = false
): Promise<Conversation[]> {
  const result: Conversation[] = [];

  for (const conv of conversations) {
    let fullMessages: any[] = [];
    let allFeedbacks: any[] = [];
    let lastMessageContent = '';

    if (includeMessages) {
      // Mode détail : récupérer tous les messages et feedbacks
      const fullConversation = await conversationDB.getFullConversation(conv.session_id);
      fullMessages = fullConversation.messages || [];
      allFeedbacks = fullMessages.flatMap(msg => msg.feedbacks || []);
    } else {
      // Mode liste : récupérer le dernier message ET tous les feedbacks pour les badges
      try {
        const lastMessages = await database.query(`
          SELECT content, role FROM conversation_messages 
          WHERE session_id = ? 
          ORDER BY timestamp DESC 
          LIMIT 1
        `, [conv.session_id]);
        
        if (Array.isArray(lastMessages) && lastMessages.length > 0) {
          lastMessageContent = lastMessages[0].content || '';
        }

        // Récupérer tous les feedbacks pour cette session (pour les badges)
        const feedbacks = await database.query(`
          SELECT feedback_id, message_id, session_id, type, comment, timestamp
          FROM conversation_feedbacks 
          WHERE session_id = ?
        `, [conv.session_id]);
        
        allFeedbacks = Array.isArray(feedbacks) ? feedbacks : [];
      } catch (error) {
        // En cas d'erreur, on continue avec un message vide
        lastMessageContent = '';
        allFeedbacks = [];
      }
    }
    
    // Identifier l'utilisateur
    const userIdentifier = conv.user_identifier || `Étudiant-${conv.session_id.slice(-6)}`;
    
    // Convertir les messages de la base de données vers le format API
    const apiMessages = fullMessages.map(msg => ({
      id: msg.message_id,
      sessionId: msg.session_id,
      content: msg.content,
      type: msg.role === 'user' ? 'user' as const : 'bot' as const,
      timestamp: msg.timestamp,
      metadata: msg.role === 'assistant' ? {
        model: 'gpt-4',
        tokensUsed: Math.floor(Math.random() * 100) + 50,
        responseTime: Math.floor(Math.random() * 1000) + 500
      } : undefined
    }));

    // Convertir les feedbacks de la base de données vers le format API
    const apiFeedbacks = allFeedbacks.map(fb => ({
      id: fb.feedback_id,
      messageId: fb.message_id,
      sessionId: fb.session_id,
      type: fb.type,
      comment: fb.comment,
      timestamp: fb.timestamp
    }));

    // Calculer les métriques
    const userMessages = fullMessages.filter(m => m.role === 'user');
    const botMessages = fullMessages.filter(m => m.role === 'assistant');
    const lastMessage = fullMessages[fullMessages.length - 1];
    
    const conversation: Conversation = {
      id: `conv_${conv.session_id}`,
      sessionId: conv.session_id,
      user: {
        id: `user_${conv.session_id}`,
        sessionId: conv.session_id,
        identifier: userIdentifier,
        createdAt: conv.start_time,
        lastActiveAt: conv.last_activity,
        ipAddress: conv.ip_address
      },
      messages: apiMessages,
      feedback: apiFeedbacks,
      status: conv.last_activity > new Date(Date.now() - 10 * 60 * 1000) ? 'active' : 'completed',
      startTime: conv.start_time,
      endTime: conv.last_activity,
      messageCount: conv.message_count || fullMessages.length,
      lastMessage: includeMessages ? (lastMessage?.content || '') : lastMessageContent,
      lastMessageTime: lastMessage?.timestamp || conv.last_activity,
      totalTokensUsed: botMessages.length * 75
    };

    result.push(conversation);
  }

  return result;
}

// =============================================================================
// CONTRÔLEURS API
// =============================================================================

/**
 * Récupérer toutes les conversations avec pagination et filtres
 */
export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheBuster = (req.query as any)._t;
    logger.info(`📋 Récupération conversations admin avec filtres${cacheBuster ? ' (cache-busting: ' + cacheBuster + ')' : ''}`);

    const filters = validateFilters(req.query as ConversationFilters);
    const { page, limit } = validatePagination(filters.page, filters.limit);
    
    // Debug: logs des filtres reçus
    logger.info(`🔍 Filtres appliqués: feedback="${filters.feedback}", search="${filters.search}", dateFrom="${filters.dateFrom}", dateTo="${filters.dateTo}"`);

    // Calculer l'offset
    const offset = (page - 1) * limit;

    // Récupérer les conversations depuis la base de données
    const { conversations: dbConversations, total } = await conversationDB.getAllConversations(
      limit,
      offset,
      filters.search,
      filters.dateFrom,
      filters.dateTo,
      filters.feedback as 'positive' | 'negative' | 'none' | 'all' | undefined
    );

    // Convertir vers le format API
    const conversations = await convertDatabaseConversationsToAPI(dbConversations, false);

    // Calculer la pagination
    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse<PaginatedResponse<Conversation>> = {
      success: true,
      data: {
        items: conversations,
        total,
        page,
        limit,
        totalPages
      },
      message: `${conversations.length} conversation(s) récupérée(s)`,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
    logger.info(`✅ ${conversations.length} conversations récupérées (page ${page}/${totalPages})`);

  } catch (error) {
    logger.error('❌ Erreur récupération conversations:', error);
    res.status(500).json({
      success: false,
      error: ErrorCodes.INTERNAL_ERROR,
      message: 'Erreur lors de la récupération des conversations',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Récupérer une conversation spécifique avec tous ses détails
 */
export const getConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'ID de session requis',
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info(`🔍 Récupération conversation: ${sessionId}`);

    // Récupérer la conversation complète depuis la base de données
    const fullConversation = await conversationDB.getFullConversation(sessionId);

    if (!fullConversation.session) {
      res.status(404).json({
        success: false,
        error: ErrorCodes.NOT_FOUND,
        message: 'Conversation non trouvée',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Convertir vers le format API
    const dbConversations = [{
      session_id: fullConversation.session.session_id,
      user_identifier: fullConversation.session.user_identifier,
      ip_address: fullConversation.session.ip_address,
      start_time: fullConversation.session.created_at,
      last_activity: fullConversation.session.last_activity,
      message_count: fullConversation.messages.length,
      positive_feedback_count: 0,
      negative_feedback_count: 0,
      is_active: fullConversation.session.is_active
    }];

    const [conversation] = await convertDatabaseConversationsToAPI(dbConversations, true);

    const response: ApiResponse<Conversation> = {
      success: true,
      data: conversation,
      message: 'Conversation récupérée avec succès',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
    logger.info(`✅ Conversation récupérée: ${sessionId} (${conversation.messageCount} messages)`);

  } catch (error) {
    logger.error('❌ Erreur récupération conversation:', error);
    res.status(500).json({
      success: false,
      error: ErrorCodes.INTERNAL_ERROR,
      message: 'Erreur lors de la récupération de la conversation',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Supprimer une conversation
 */
export const deleteConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'ID de session requis',
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info(`🗑️ Suppression conversation: ${sessionId}`);

    const deleted = await conversationDB.deleteConversation(sessionId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: ErrorCodes.NOT_FOUND,
        message: 'Conversation non trouvée',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true },
      message: 'Conversation supprimée avec succès',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
    logger.info(`✅ Conversation supprimée: ${sessionId}`);

  } catch (error) {
    logger.error('❌ Erreur suppression conversation:', error);
    res.status(500).json({
      success: false,
      error: ErrorCodes.INTERNAL_ERROR,
      message: 'Erreur lors de la suppression de la conversation',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Rechercher dans les conversations
 */
export const searchConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      res.status(400).json({
        success: false,
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Requête de recherche invalide (minimum 2 caractères)',
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info(`🔍 Recherche conversations: "${query}"`);

    const filters = { search: query.trim() };
    const { conversations: dbConversations } = await conversationDB.getAllConversations(
      20, // Limite pour recherche
      0,  // Offset
      filters.search
    );

    const conversations = await convertDatabaseConversationsToAPI(dbConversations, false);

    const response: ApiResponse<Conversation[]> = {
      success: true,
      data: conversations,
      message: `${conversations.length} conversation(s) trouvée(s)`,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
    logger.info(`✅ Recherche terminée: ${conversations.length} résultats pour "${query}"`);

  } catch (error) {
    logger.error('❌ Erreur recherche conversations:', error);
    res.status(500).json({
      success: false,
      error: ErrorCodes.INTERNAL_ERROR,
      message: 'Erreur lors de la recherche',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Exporter les conversations en CSV
 */
export const exportConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('📄 Export conversations en CSV');

    const filters = validateFilters(req.query as ConversationFilters);

    // Récupérer toutes les conversations qui correspondent aux filtres
    const { conversations: dbConversations } = await conversationDB.getAllConversations(
      1000, // Limite élevée pour export
      0,
      filters.search,
      filters.dateFrom,
      filters.dateTo,
      filters.feedback as 'positive' | 'negative' | 'none' | 'all' | undefined
    );

    const conversations = await convertDatabaseConversationsToAPI(dbConversations, true);

    // Générer le CSV
    const csvHeaders = [
      'ID Session',
      'Utilisateur',
      'Date Début',
      'Date Fin',
      'Nombre Messages',
      'Dernier Message',
      'Statut',
      'Feedback Positif',
      'Feedback Négatif',
      'IP Address'
    ].join(',');

    const csvRows = conversations.map(conv => [
      conv.sessionId,
      `"${conv.user.identifier}"`,
      conv.startTime.toISOString(),
      (conv.endTime || conv.lastMessageTime).toISOString(),
      conv.messageCount,
      `"${conv.lastMessage.replace(/"/g, '""').substring(0, 100)}"`,
      conv.status,
      (conv.feedback || []).filter(f => f.type === 'positive').length,
      (conv.feedback || []).filter(f => f.type === 'negative').length,
      conv.user.ipAddress || ''
    ].join(','));

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="conversations_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

    logger.info(`✅ Export CSV généré: ${conversations.length} conversations`);

  } catch (error) {
    logger.error('❌ Erreur export CSV:', error);
    res.status(500).json({
      success: false,
      error: ErrorCodes.INTERNAL_ERROR,
      message: 'Erreur lors de l\'export',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Obtenir les statistiques globales des conversations
 */
export const getConversationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('📊 Récupération statistiques conversations');

    const stats = await conversationDB.getStats();

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: 'Statistiques récupérées avec succès',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
    logger.info(`✅ Statistiques récupérées: ${stats.sessions} sessions, ${stats.messages} messages`);

  } catch (error) {
    logger.error('❌ Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      error: ErrorCodes.INTERNAL_ERROR,
      message: 'Erreur lors de la récupération des statistiques',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Test simple pour diagnostiquer le problème
 */
export const testConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🔧 Test endpoint conversations');
    
    // Test 1: Vérifier la connexion DB
    const stats = await conversationDB.getStats();
    logger.info('✅ Stats DB:', stats);
    
    // Test 2: Test requête SQL simple
    const testQuery = await database.query('SELECT COUNT(*) as count FROM conversation_sessions');
    logger.info('✅ Test query simple:', testQuery);
    
          res.status(200).json({
        success: true,
        data: {
          stats,
          testQuery
        },
        message: 'Test réussi',
        timestamp: new Date().toISOString()
      });
    
  } catch (error) {
    logger.error('❌ Erreur test conversations:', error);
    res.status(500).json({
      success: false,
      error: 'TEST_ERROR',
      message: `Erreur test: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString()
    });
  }
};

const AdminConversationsController = {
  getConversations,
  getConversation,
  deleteConversation,
  searchConversations,
  exportConversations,
  getConversationStats,
  testConversations
};

export default AdminConversationsController; 