// =============================================================================
// STUDYBOT BACKEND - CONTRÔLEUR ADMIN CONVERSATIONS
// =============================================================================

import { Request, Response } from 'express';
import {
  ApiResponse,
  Conversation,
  ConversationFilters,
  PaginatedResponse,
  ConversationSearchQuery,
  ErrorCodes,
  VALIDATION_RULES,
  AuthenticatedRequest
} from '@/types/admin';

// =============================================================================
// DONNÉES MOCK POUR DÉVELOPPEMENT
// =============================================================================

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_001',
    sessionId: 'sess_12345',
    user: {
      id: 'user_001',
      sessionId: 'sess_12345',
      identifier: 'Étudiant BBA2',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      createdAt: new Date('2025-01-15T14:30:00Z'),
      lastActiveAt: new Date('2025-01-15T14:35:00Z')
    },
    messages: [
      {
        id: 'msg_001',
        sessionId: 'sess_12345',
        content: 'Quels sont les horaires de la bibliothèque cette semaine ?',
        type: 'user',
        timestamp: new Date('2025-01-15T14:30:00Z')
      },
      {
        id: 'msg_002',
        sessionId: 'sess_12345',
        content: 'La bibliothèque est ouverte du lundi au vendredi de 8h à 20h, et le samedi de 9h à 17h cette semaine.',
        type: 'bot',
        timestamp: new Date('2025-01-15T14:30:15Z'),
        metadata: {
          model: 'gpt-4',
          tokensUsed: 45,
          responseTime: 1200,
          sources: ['bibliotheque-horaires.pdf']
        }
      },
      {
        id: 'msg_003',
        sessionId: 'sess_12345',
        content: 'Merci pour les informations sur les horaires',
        type: 'user',
        timestamp: new Date('2025-01-15T14:32:00Z')
      }
    ],
    feedback: [
      {
        id: 'feedback_001',
        messageId: 'msg_002',
        sessionId: 'sess_12345',
        type: 'positive',
        comment: 'Réponse claire et précise',
        timestamp: new Date('2025-01-15T14:32:30Z')
      }
    ],
    status: 'completed',
    startTime: new Date('2025-01-15T14:30:00Z'),
    endTime: new Date('2025-01-15T14:32:30Z'),
    messageCount: 3,
    lastMessage: 'Merci pour les informations sur les horaires',
    lastMessageTime: new Date('2025-01-15T14:32:00Z'),
    averageResponseTime: 1200,
    totalTokensUsed: 45
  },
  {
    id: 'conv_002',
    sessionId: 'sess_67890',
    user: {
      id: 'user_002',
      sessionId: 'sess_67890',
      identifier: 'Étudiant BBA1',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0...',
      createdAt: new Date('2025-01-15T14:28:00Z'),
      lastActiveAt: new Date('2025-01-15T14:30:00Z')
    },
    messages: [
      {
        id: 'msg_004',
        sessionId: 'sess_67890',
        content: 'Comment accéder aux cours en ligne ?',
        type: 'user',
        timestamp: new Date('2025-01-15T14:28:00Z')
      },
      {
        id: 'msg_005',
        sessionId: 'sess_67890',
        content: 'Pour accéder aux cours en ligne, connectez-vous à la plateforme MyEmlyon avec vos identifiants étudiants.',
        type: 'bot',
        timestamp: new Date('2025-01-15T14:28:18Z'),
        metadata: {
          model: 'gpt-4',
          tokensUsed: 38,
          responseTime: 1800,
          sources: ['plateforme-myemlyon.pdf']
        }
      }
    ],
    feedback: [],
    status: 'active',
    startTime: new Date('2025-01-15T14:28:00Z'),
    messageCount: 2,
    lastMessage: 'Pour accéder aux cours en ligne, connectez-vous à la plateforme MyEmlyon avec vos identifiants étudiants.',
    lastMessageTime: new Date('2025-01-15T14:28:18Z'),
    averageResponseTime: 1800,
    totalTokensUsed: 38
  },
  {
    id: 'conv_003',
    sessionId: 'sess_11111',
    user: {
      id: 'user_003',
      sessionId: 'sess_11111',
      identifier: 'Étudiant BBA3',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0...',
      createdAt: new Date('2025-01-15T14:15:00Z'),
      lastActiveAt: new Date('2025-01-15T14:20:00Z')
    },
    messages: [
      {
        id: 'msg_006',
        sessionId: 'sess_11111',
        content: 'Quelles sont les informations sur les stages ?',
        type: 'user',
        timestamp: new Date('2025-01-15T14:15:00Z')
      },
      {
        id: 'msg_007',
        sessionId: 'sess_11111',
        content: 'Les stages sont obligatoires en 3ème année. La durée minimale est de 6 mois. Contactez le bureau des stages pour plus d\'informations.',
        type: 'bot',
        timestamp: new Date('2025-01-15T14:15:25Z'),
        metadata: {
          model: 'gpt-4',
          tokensUsed: 52,
          responseTime: 2100,
          sources: ['stages-guide.pdf', 'stages-contact.pdf']
        }
      }
    ],
    feedback: [
      {
        id: 'feedback_002',
        messageId: 'msg_007',
        sessionId: 'sess_11111',
        type: 'positive',
        timestamp: new Date('2025-01-15T14:16:00Z')
      }
    ],
    status: 'completed',
    startTime: new Date('2025-01-15T14:15:00Z'),
    endTime: new Date('2025-01-15T14:16:00Z'),
    messageCount: 2,
    lastMessage: 'Les stages sont obligatoires en 3ème année. La durée minimale est de 6 mois. Contactez le bureau des stages pour plus d\'informations.',
    lastMessageTime: new Date('2025-01-15T14:15:25Z'),
    averageResponseTime: 2100,
    totalTokensUsed: 52
  },
  {
    id: 'conv_004',
    sessionId: 'sess_22222',
    user: {
      id: 'user_004',
      sessionId: 'sess_22222',
      identifier: 'Étudiant BBA4',
      ipAddress: '192.168.1.103',
      userAgent: 'Mozilla/5.0...',
      createdAt: new Date('2025-01-15T13:45:00Z'),
      lastActiveAt: new Date('2025-01-15T13:50:00Z')
    },
    messages: [
      {
        id: 'msg_008',
        sessionId: 'sess_22222',
        content: 'Quel est le contact du coordinateur à Lyon ?',
        type: 'user',
        timestamp: new Date('2025-01-15T13:45:00Z')
      },
      {
        id: 'msg_009',
        sessionId: 'sess_22222',
        content: 'Je ne trouve pas d\'informations spécifiques sur le coordinateur de Lyon dans ma base de données. Pourriez-vous contacter le secrétariat ?',
        type: 'bot',
        timestamp: new Date('2025-01-15T13:45:30Z'),
        metadata: {
          model: 'gpt-4',
          tokensUsed: 35,
          responseTime: 1500
        }
      }
    ],
    feedback: [
      {
        id: 'feedback_003',
        messageId: 'msg_009',
        sessionId: 'sess_22222',
        type: 'negative',
        comment: 'Information manquante, pas très utile',
        timestamp: new Date('2025-01-15T13:46:00Z')
      }
    ],
    status: 'completed',
    startTime: new Date('2025-01-15T13:45:00Z'),
    endTime: new Date('2025-01-15T13:46:00Z'),
    messageCount: 2,
    lastMessage: 'Je ne trouve pas d\'informations spécifiques sur le coordinateur de Lyon dans ma base de données. Pourriez-vous contacter le secrétariat ?',
    lastMessageTime: new Date('2025-01-15T13:45:30Z'),
    averageResponseTime: 1500,
    totalTokensUsed: 35
  }
];

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    message,
    timestamp: new Date().toISOString()
  };
}

function validatePagination(page?: number, limit?: number): { page: number; limit: number } {
  const validatedPage = Math.max(1, page || VALIDATION_RULES.pagination.defaultPage);
  const validatedLimit = Math.min(
    Math.max(1, limit || VALIDATION_RULES.pagination.defaultLimit),
    VALIDATION_RULES.pagination.maxLimit
  );
  
  return { page: validatedPage, limit: validatedLimit };
}

function filterConversations(conversations: Conversation[], filters: ConversationFilters): Conversation[] {
  return conversations.filter(conv => {
    // Filtre par statut
    if (filters.status && filters.status !== 'all' && conv.status !== filters.status) {
      return false;
    }

    // Filtre par feedback
    if (filters.feedback && filters.feedback !== 'all') {
      const hasFeedback = conv.feedback && conv.feedback.length > 0;
      const hasPositiveFeedback = hasFeedback && conv.feedback!.some(f => f.type === 'positive');
      const hasNegativeFeedback = hasFeedback && conv.feedback!.some(f => f.type === 'negative');

      switch (filters.feedback) {
        case 'positive':
          if (!hasPositiveFeedback) return false;
          break;
        case 'negative':
          if (!hasNegativeFeedback) return false;
          break;
        case 'none':
          if (hasFeedback) return false;
          break;
      }
    }

    // Filtre par date
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      if (conv.startTime < fromDate) return false;
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      if (conv.startTime > toDate) return false;
    }

    // Filtre par recherche textuelle
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const inMessages = conv.messages.some(msg => 
        msg.content.toLowerCase().includes(searchLower)
      );
      const inUserIdentifier = conv.user.identifier.toLowerCase().includes(searchLower);
      if (!inMessages && !inUserIdentifier) return false;
    }

    // Filtre par identifiant utilisateur
    if (filters.userIdentifier) {
      if (!conv.user.identifier.toLowerCase().includes(filters.userIdentifier.toLowerCase())) {
        return false;
      }
    }

    return true;
  });
}

function sortConversations(conversations: Conversation[], sortBy?: string, sortOrder?: 'asc' | 'desc'): Conversation[] {
  const sorted = [...conversations];
  const order = sortOrder || 'desc';

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'startTime':
        aValue = a.startTime;
        bValue = b.startTime;
        break;
      case 'messageCount':
        aValue = a.messageCount;
        bValue = b.messageCount;
        break;
      case 'lastMessageTime':
      default:
        aValue = a.lastMessageTime;
        bValue = b.lastMessageTime;
        break;
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

function paginateArray<T>(array: T[], page: number, limit: number): PaginatedResponse<T> {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const items = array.slice(startIndex, endIndex);
  const total = array.length;
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    total,
    page,
    limit,
    totalPages
  };
}

// =============================================================================
// CONTRÔLEURS
// =============================================================================

export class AdminConversationsController {
  /**
   * @route   GET /api/admin/conversations
   * @desc    Récupérer la liste des conversations avec pagination et filtres
   * @access  Admin
   */
  static async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const filters: ConversationFilters = req.query as any;
      const { page, limit } = validatePagination(filters.page, filters.limit);

      // Filtrer les conversations
      const filteredConversations = filterConversations(MOCK_CONVERSATIONS, filters);

      // Trier les conversations
      const sortedConversations = sortConversations(
        filteredConversations,
        filters.sortBy,
        filters.sortOrder
      );

      // Paginer les résultats
      const paginatedResult = paginateArray(sortedConversations, page, limit);

      const response = createApiResponse(true, paginatedResult);
      res.status(200).json(response);
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      const response = createApiResponse(
        false,
        undefined,
        ErrorCodes.INTERNAL_ERROR,
        'Erreur lors de la récupération des conversations'
      );
      res.status(500).json(response);
    }
  }

  /**
   * @route   GET /api/admin/conversations/:id
   * @desc    Récupérer une conversation spécifique
   * @access  Admin
   */
  static async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const conversation = MOCK_CONVERSATIONS.find(conv => conv.id === id);

      if (!conversation) {
        const response = createApiResponse(
          false,
          undefined,
          ErrorCodes.NOT_FOUND,
          'Conversation introuvable'
        );
        res.status(404).json(response);
        return;
      }

      const response = createApiResponse(true, conversation);
      res.status(200).json(response);
    } catch (error) {
      console.error('Erreur lors de la récupération de la conversation:', error);
      const response = createApiResponse(
        false,
        undefined,
        ErrorCodes.INTERNAL_ERROR,
        'Erreur lors de la récupération de la conversation'
      );
      res.status(500).json(response);
    }
  }

  /**
   * @route   GET /api/admin/conversations/search
   * @desc    Recherche avancée dans les conversations
   * @access  Admin
   */
  static async searchConversations(req: Request, res: Response): Promise<void> {
    try {
      const query: ConversationSearchQuery = req.query as any;

      if (!query.q || query.q.length < VALIDATION_RULES.search.minQueryLength) {
        const response = createApiResponse(
          false,
          undefined,
          ErrorCodes.VALIDATION_ERROR,
          `La requête de recherche doit contenir au moins ${VALIDATION_RULES.search.minQueryLength} caractères`
        );
        res.status(400).json(response);
        return;
      }

      const searchLimit = Math.min(
        query.limit || 50,
        VALIDATION_RULES.search.maxResultsLimit
      );

      // Construire les filtres à partir de la requête de recherche
      const filters: ConversationFilters = {
        search: query.q,
        status: query.status as any,
        feedback: query.feedback as any,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo
      };

      // Filtrer et limiter les résultats
      const filteredConversations = filterConversations(MOCK_CONVERSATIONS, filters);
      const limitedResults = filteredConversations.slice(0, searchLimit);

      const response = createApiResponse(true, limitedResults);
      res.status(200).json(response);
    } catch (error) {
      console.error('Erreur lors de la recherche de conversations:', error);
      const response = createApiResponse(
        false,
        undefined,
        ErrorCodes.INTERNAL_ERROR,
        'Erreur lors de la recherche'
      );
      res.status(500).json(response);
    }
  }

  /**
   * @route   GET /api/admin/conversations/export
   * @desc    Exporter les conversations au format CSV
   * @access  Admin
   */
  static async exportConversations(req: Request, res: Response): Promise<void> {
    try {
      const filters: ConversationFilters = req.query as any;
      const filteredConversations = filterConversations(MOCK_CONVERSATIONS, filters);

      // Construire le CSV
      const csvHeaders = [
        'ID Conversation',
        'Session ID',
        'Utilisateur',
        'Statut',
        'Date Début',
        'Date Fin',
        'Nombre Messages',
        'Dernier Message',
        'Feedback',
        'Tokens Utilisés',
        'Temps Réponse Moyen'
      ].join(',');

      const csvRows = filteredConversations.map(conv => {
        const feedback = conv.feedback && conv.feedback.length > 0
          ? conv.feedback.map(f => f.type).join(';')
          : 'aucun';

        return [
          conv.id,
          conv.sessionId,
          `"${conv.user.identifier}"`,
          conv.status,
          conv.startTime.toISOString(),
          conv.endTime?.toISOString() || '',
          conv.messageCount,
          `"${conv.lastMessage.substring(0, 100)}..."`,
          feedback,
          conv.totalTokensUsed || 0,
          conv.averageResponseTime || 0
        ].join(',');
      });

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="conversations_${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);
    } catch (error) {
      console.error('Erreur lors de l\'export des conversations:', error);
      const response = createApiResponse(
        false,
        undefined,
        ErrorCodes.INTERNAL_ERROR,
        'Erreur lors de l\'export'
      );
      res.status(500).json(response);
    }
  }
}

export default AdminConversationsController; 