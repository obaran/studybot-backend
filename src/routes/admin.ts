// =============================================================================
// STUDYBOT BACKEND - ROUTES ADMIN
// =============================================================================

import { Router } from 'express';
import AdminConversationsController from '@/controllers/adminConversationsController';

const router = Router();

// =============================================================================
// MIDDLEWARE D'AUTHENTIFICATION (temporaire - sera implémenté plus tard)
// =============================================================================

// Middleware temporaire pour simuler l'authentification
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  // En attendant l'implémentation de l'auth JWT
  req.user = {
    id: 'admin_001',
    email: 'admin@emlyon.com',
    role: 'admin',
    permissions: ['conversations', 'analytics', 'configuration', 'users', 'system-prompt']
  };
  next();
};

// =============================================================================
// ROUTES CONVERSATIONS
// =============================================================================

/**
 * @route   GET /api/admin/conversations
 * @desc    Récupérer la liste des conversations avec pagination et filtres
 * @access  Admin
 * @query   page, limit, sortBy, sortOrder, status, feedback, dateFrom, dateTo, search, userIdentifier
 */
router.get('/conversations', mockAuthMiddleware, AdminConversationsController.getConversations);

/**
 * @route   GET /api/admin/conversations/search
 * @desc    Recherche avancée dans les conversations
 * @access  Admin
 * @query   q, status, feedback, dateFrom, dateTo, limit
 */
router.get('/conversations/search', mockAuthMiddleware, AdminConversationsController.searchConversations);

/**
 * @route   GET /api/admin/conversations/export
 * @desc    Exporter les conversations au format CSV
 * @access  Admin
 * @query   (mêmes filtres que GET /conversations)
 */
router.get('/conversations/export', mockAuthMiddleware, AdminConversationsController.exportConversations);

/**
 * @route   GET /api/admin/conversations/:id
 * @desc    Récupérer une conversation spécifique avec tous ses messages
 * @access  Admin
 * @param   id - ID de la conversation
 */
router.get('/conversations/:id', mockAuthMiddleware, AdminConversationsController.getConversation);

// =============================================================================
// ROUTES SYSTÈME PROMPT (à implémenter)
// =============================================================================

// TODO: Implémenter les routes system-prompt
// router.get('/system-prompt', mockAuthMiddleware, AdminSystemPromptController.getSystemPrompts);
// router.get('/system-prompt/active', mockAuthMiddleware, AdminSystemPromptController.getActiveSystemPrompt);
// router.post('/system-prompt', mockAuthMiddleware, AdminSystemPromptController.createSystemPrompt);
// router.put('/system-prompt/:id', mockAuthMiddleware, AdminSystemPromptController.updateSystemPrompt);
// router.post('/system-prompt/:id/activate', mockAuthMiddleware, AdminSystemPromptController.activateSystemPrompt);
// router.delete('/system-prompt/:id', mockAuthMiddleware, AdminSystemPromptController.deleteSystemPrompt);
// router.get('/system-prompt/:id/history', mockAuthMiddleware, AdminSystemPromptController.getSystemPromptHistory);

// =============================================================================
// ROUTES CONFIGURATION (à implémenter)
// =============================================================================

// TODO: Implémenter les routes configuration
// router.get('/configuration', mockAuthMiddleware, AdminConfigurationController.getConfiguration);
// router.put('/configuration', mockAuthMiddleware, AdminConfigurationController.updateConfiguration);
// router.post('/configuration/upload', mockAuthMiddleware, upload.single('file'), AdminConfigurationController.uploadFile);
// router.post('/configuration/integration-links', mockAuthMiddleware, AdminConfigurationController.generateIntegrationLinks);
// router.post('/configuration/regenerate-token', mockAuthMiddleware, AdminConfigurationController.regenerateToken);

// =============================================================================
// ROUTES UTILISATEURS ADMIN (à implémenter)
// =============================================================================

// TODO: Implémenter les routes users
// router.get('/users', mockAuthMiddleware, AdminUsersController.getAdminUsers);
// router.post('/users', mockAuthMiddleware, AdminUsersController.createAdminUser);
// router.put('/users/:id', mockAuthMiddleware, AdminUsersController.updateAdminUser);
// router.delete('/users/:id', mockAuthMiddleware, AdminUsersController.deleteAdminUser);
// router.post('/users/:id/resend-invitation', mockAuthMiddleware, AdminUsersController.resendInvitation);

// =============================================================================
// ROUTES ANALYTICS (à implémenter)
// =============================================================================

// TODO: Implémenter les routes analytics
// router.get('/analytics/metrics', mockAuthMiddleware, AdminAnalyticsController.getDashboardMetrics);
// router.get('/analytics/usage', mockAuthMiddleware, AdminAnalyticsController.getUsageStatistics);
// router.get('/analytics/export', mockAuthMiddleware, AdminAnalyticsController.exportAnalytics);

// =============================================================================
// ROUTES AUTHENTIFICATION (à implémenter)
// =============================================================================

// TODO: Implémenter les routes auth
// router.post('/auth/login', AdminAuthController.login);
// router.post('/auth/logout', mockAuthMiddleware, AdminAuthController.logout);
// router.post('/auth/refresh', AdminAuthController.refreshToken);
// router.get('/auth/me', mockAuthMiddleware, AdminAuthController.getCurrentUser);

// =============================================================================
// ROUTE DE TEST
// =============================================================================

/**
 * @route   GET /api/admin/test
 * @desc    Test de l'API admin
 * @access  Public (pour debug)
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'API Admin StudyBot fonctionnelle',
    timestamp: new Date().toISOString(),
    endpoints: {
      conversations: {
        list: 'GET /conversations',
        search: 'GET /conversations/search',
        export: 'GET /conversations/export',
        detail: 'GET /conversations/:id'
      },
      planned: {
        systemPrompt: 'À implémenter',
        configuration: 'À implémenter',
        users: 'À implémenter',
        analytics: 'À implémenter',
        auth: 'À implémenter'
      }
    }
  });
});

export default router; 