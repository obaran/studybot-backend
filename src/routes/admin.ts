// =============================================================================
// STUDYBOT BACKEND - ROUTES ADMIN
// =============================================================================

import { Router } from 'express';
import AdminConversationsController from '@/controllers/adminConversationsController';
import systemPromptRoutes from './systemPrompt';

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
// ROUTES PROMPTS SYSTÈME
// =============================================================================

/**
 * Routes pour la gestion des prompts système (versioning, activation, etc.)
 * @access Admin
 */
router.use('/system-prompts', mockAuthMiddleware, systemPromptRoutes);

// =============================================================================
// ROUTES CONFIGURATION
// =============================================================================

import { configurationController } from '@/controllers/configurationController';
import multer from 'multer';

// Configuration Multer pour l'upload en mémoire
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

/**
 * @route   GET /api/admin/configuration
 * @desc    Récupérer la configuration par défaut
 * @access  Admin
 */
router.get('/configuration', mockAuthMiddleware, configurationController.getConfiguration);

/**
 * @route   PUT /api/admin/configuration
 * @desc    Mettre à jour la configuration
 * @access  Admin
 */
router.put('/configuration', mockAuthMiddleware, configurationController.updateConfiguration);

/**
 * @route   POST /api/admin/configuration/upload
 * @desc    Upload d'avatar (bot ou user)
 * @access  Admin
 */
router.post('/configuration/upload', mockAuthMiddleware, upload.single('file'), configurationController.uploadFile);

/**
 * @route   POST /api/admin/configuration/integration-links
 * @desc    Générer les liens d'intégration
 * @access  Admin
 */
router.post('/configuration/integration-links', mockAuthMiddleware, configurationController.generateIntegrationLinks);

/**
 * @route   POST /api/admin/configuration/regenerate-token
 * @desc    Régénérer le token d'intégration
 * @access  Admin
 */
router.post('/configuration/regenerate-token', mockAuthMiddleware, configurationController.regenerateToken);

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
      systemPrompts: {
        list: 'GET /system-prompts',
        active: 'GET /system-prompts/active',
        stats: 'GET /system-prompts/stats',
        detail: 'GET /system-prompts/:id',
        create: 'POST /system-prompts',
        update: 'PUT /system-prompts/:id',
        restore: 'POST /system-prompts/:id/restore',
        delete: 'DELETE /system-prompts/:id'
      },
      planned: {
        configuration: 'À implémenter',
        users: 'À implémenter',
        analytics: 'À implémenter',
        auth: 'À implémenter'
      }
    }
  });
});

export default router; 