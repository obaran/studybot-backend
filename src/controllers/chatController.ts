// =============================================================================
// STUDYBOT BACKEND - CONTRÔLEUR CHAT
// =============================================================================

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '@/middleware/errorHandler';
import { openaiService } from '@/services/openaiService';
import { qdrantService } from '@/services/qdrantService';
import { logger } from '@/utils/logger';
import { ChatRequest, ChatResponse, APIResponse } from '@/types';

class ChatController {
  /**
   * Traiter un message de chat et générer une réponse
   */
  public sendMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { message, sessionId, chatbot }: ChatRequest = req.body;

    // Validation des données
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MESSAGE',
          message: 'Le message est requis et ne peut pas être vide',
          statusCode: 400
        }
      });
      return;
    }

    // Générer un sessionId si non fourni
    const currentSessionId = sessionId || `session_${Date.now()}_${uuidv4()}`;
    
    try {
      // 1. Rechercher du contenu pertinent dans Qdrant
      logger.info(`🔍 Recherche vectorielle pour: "${message.substring(0, 50)}..."`);
      
      const vectorResults = await qdrantService.searchForChatbot(
        message,
        chatbot || 'studybot',
        3
      );

      // Extraire le contenu des sources
      const contextSources = vectorResults.map(result => result.content);
      
      logger.info(`📚 ${vectorResults.length} sources trouvées avec scores: ${vectorResults.map(r => r.score.toFixed(2)).join(', ')}`);

      // 2. Générer la réponse avec OpenAI
      logger.info(`🤖 Génération de réponse OpenAI...`);
      
      const chatResponse = await openaiService.generateChatResponse(
        message,
        [], // TODO: Charger l'historique depuis la DB quand elle sera créée
        contextSources,
        currentSessionId
      );

      // 3. Construire la réponse complète
      const response: APIResponse<ChatResponse> = {
        success: true,
        data: {
          ...chatResponse,
          sessionId: currentSessionId
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      logger.info(`✅ Réponse générée (${chatResponse.tokensUsed} tokens, ${chatResponse.responseTime}ms)`);

      res.status(200).json(response);

    } catch (error) {
      logger.error('❌ Erreur lors du traitement du message:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: 'Erreur lors du traitement de votre message',
          statusCode: 500
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    }
  });

  /**
   * Simuler une réponse de chat pour tester l'intégration frontend (mode debug)
   */
  public sendMessageMock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { message, sessionId, chatbot }: ChatRequest = req.body;

    // Validation des données
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MESSAGE',
          message: 'Le message est requis et ne peut pas être vide',
          statusCode: 400
        }
      });
      return;
    }

    // Générer un sessionId si non fourni
    const currentSessionId = sessionId || `session_${Date.now()}_${uuidv4()}`;
    
    try {
      // Simuler une réponse réaliste selon le type de chatbot
      let mockResponse = '';
      
      if (chatbot === 'bibliobot') {
        mockResponse = `֍ Bonjour ! Je suis Bibliobot, votre assistant pour la bibliothèque d'emlyon.

📚 Accès à la bibliothèque :
• Horaires Lyon : 9h-22h du lundi au vendredi, 10h-16h le samedi
• Horaires Paris : 7h00-22h00 du lundi au samedi
• Accès avec votre carte étudiante emlyon
• Espaces de travail individuels et collectifs disponibles

🔍 Ressources disponibles :
• Base de données académiques (JSTOR, EBSCO, etc.)
• Collections physiques et numériques
• Salles de travail réservables

Pour plus d'informations, contactez l'équipe bibliothèque : bibliotheque@emlyon.com`;
      } else {
        mockResponse = `֍ Bonjour ! Je suis StudyBot, votre assistant emlyon business school.

🎓 Informations générales :
• emlyon business school propose des programmes Bachelor, Masters et MBA
• Campus à Lyon et Paris (le campus de Saint-Étienne a fermé)
• Vie étudiante riche avec de nombreuses associations

📞 Contacts coordinateurs :
• BBA1 French Track : Béa Barrière (barriere@em-lyon.com)
• BBA1 English Track : Eléa Baucheron (baucheron@em-lyon.com)
• BBA2 : Coralie Coriasco (coriacso@em-lyon.com)
• BBA3 : Benjamin Catel (catel@em-lyon.com)
• BBA4 Lyon : Léa Desplanches (desplanches@em-lyon.com)
• BBA4 Paris : Lucas Pastori (pastori@em-lyon.com)

📅 Dates importantes : https://makersboard.me/mon-agenda

N'hésitez pas si vous avez d'autres questions !`;
      }

      // Simuler les métriques
      const mockChatResponse: ChatResponse = {
        response: mockResponse,
        sessionId: currentSessionId,
        messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tokensUsed: Math.floor(Math.random() * 200) + 100, // 100-300 tokens
        model: 'gpt-4-mock',
        responseTime: Math.floor(Math.random() * 1000) + 500, // 500-1500ms
        sources: ['Mock source 1', 'Mock source 2']
      };

      logger.info(`🤖 Réponse mock générée (${mockChatResponse.tokensUsed} tokens, ${mockChatResponse.responseTime}ms)`);

      const response: APIResponse<ChatResponse> = {
        success: true,
        data: mockChatResponse,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('❌ Erreur lors du mock:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'MOCK_ERROR',
          message: 'Erreur lors de la simulation',
          statusCode: 500
        }
      });
    }
  });

  /**
   * Tester les connexions aux services
   */
  public testServices = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('🔧 Test des connexions aux services...');

      // Tester OpenAI
      const openaiTest = await openaiService.testConnection();
      
      // Tester Qdrant  
      const qdrantTest = await qdrantService.testConnection();

      const response: APIResponse = {
        success: true,
        data: {
          openai: openaiTest,
          qdrant: qdrantTest,
          status: openaiTest.success && qdrantTest.success ? 'all_services_ok' : 'some_services_down'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      const statusCode = (openaiTest.success && qdrantTest.success) ? 200 : 503;
      res.status(statusCode).json(response);

    } catch (error) {
      logger.error('❌ Erreur lors du test des services:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_TEST_ERROR',
          message: 'Erreur lors du test des services',
          statusCode: 500
        }
      });
    }
  });

  /**
   * Obtenir des informations sur la collection Qdrant
   */
  public getQdrantInfo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const collectionInfo = await qdrantService.getCollectionInfo();
      
      res.status(200).json({
        success: true,
        data: collectionInfo,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });

    } catch (error) {
      logger.error('❌ Erreur lors de la récupération des infos Qdrant:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'QDRANT_INFO_ERROR',
          message: 'Erreur lors de la récupération des informations Qdrant',
          statusCode: 500
        }
      });
    }
  });

  /**
   * Recherche directe dans Qdrant (pour debug/admin)
   */
  public searchQdrant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { query, limit = 5, threshold = 0.7 } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query parameter is required',
          statusCode: 400
        }
      });
      return;
    }

    try {
      const results = await qdrantService.searchSimilarContent(
        query,
        parseInt(limit),
        parseFloat(threshold)
      );

      res.status(200).json({
        success: true,
        data: {
          query,
          results,
          count: results.length
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });

    } catch (error) {
      logger.error('❌ Erreur lors de la recherche Qdrant:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Erreur lors de la recherche',
          statusCode: 500
        }
      });
    }
  });
}

export const chatController = new ChatController();
export default chatController; 