// =============================================================================
// STUDYBOT BACKEND - ROUTES CHAT
// =============================================================================

import { Router } from 'express';
import { chatController } from '@/controllers/chatController';

const router = Router();

/**
 * @route   POST /api/chat/message
 * @desc    Envoyer un message et recevoir une réponse du chatbot
 * @access  Public
 * @body    { message: string, sessionId?: string, chatbot?: 'studybot'|'bibliobot' }
 */
router.post('/message', chatController.sendMessage);

/**
 * @route   POST /api/chat/message-mock
 * @desc    Version mock pour tester l'intégration frontend (sans services externes)
 * @access  Public
 * @body    { message: string, sessionId?: string, chatbot?: 'studybot'|'bibliobot' }
 */
router.post('/message-mock', chatController.sendMessageMock);

/**
 * @route   GET /api/chat/test
 * @desc    Tester les connexions OpenAI et Qdrant
 * @access  Public (pour debug)
 */
router.get('/test', chatController.testServices);

/**
 * @route   GET /api/chat/qdrant-info
 * @desc    Obtenir des informations sur la collection Qdrant
 * @access  Public (pour debug/admin)
 */
router.get('/qdrant-info', chatController.getQdrantInfo);

/**
 * @route   POST /api/chat/search
 * @desc    Recherche directe dans Qdrant
 * @access  Public (pour debug/admin)
 * @body    { query: string, limit?: number, threshold?: number }
 */
router.post('/search', chatController.searchQdrant);

/**
 * @route   GET /api/chat/memory-stats
 * @desc    Obtenir les statistiques de la mémoire conversationnelle
 * @access  Public (pour debug/admin)
 */
router.get('/memory-stats', chatController.getMemoryStats);

/**
 * @route   POST /api/chat/feedback
 * @desc    Enregistrer un feedback utilisateur
 * @access  Public
 * @body    { sessionId: string, messageId: string, type: 'positive'|'negative', comment?: string }
 */
router.post('/feedback', chatController.submitFeedback);

export default router; 