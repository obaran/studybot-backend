// =============================================================================
// STUDYBOT BACKEND - ROUTES PROMPTS SYSTÈME
// =============================================================================

import { Router } from 'express';
import SystemPromptController from '@/controllers/systemPromptController';

const router = Router();

/**
 * @route GET /api/admin/system-prompts
 * @description Récupérer tous les prompts système (historique)
 * @access Admin
 */
router.get('/', SystemPromptController.getSystemPrompts);

/**
 * @route GET /api/admin/system-prompts/active
 * @description Récupérer le prompt système actif
 * @access Admin
 */
router.get('/active', SystemPromptController.getActiveSystemPrompt);

/**
 * @route GET /api/admin/system-prompts/stats
 * @description Obtenir les statistiques des prompts système
 * @access Admin
 */
router.get('/stats', SystemPromptController.getSystemPromptStats);

/**
 * @route GET /api/admin/system-prompts/:id
 * @description Récupérer un prompt spécifique par ID
 * @access Admin
 */
router.get('/:id', SystemPromptController.getSystemPromptById);

/**
 * @route POST /api/admin/system-prompts
 * @description Créer un nouveau prompt système
 * @access Admin
 */
router.post('/', SystemPromptController.createSystemPrompt);

/**
 * @route PUT /api/admin/system-prompts/:id
 * @description Mettre à jour un prompt système (créer nouvelle version)
 * @access Admin
 */
router.put('/:id', SystemPromptController.updateSystemPrompt);

/**
 * @route POST /api/admin/system-prompts/:id/restore
 * @description Restaurer une version précédente d'un prompt
 * @access Admin
 */
router.post('/:id/restore', SystemPromptController.restoreSystemPromptVersion);

/**
 * @route DELETE /api/admin/system-prompts/:id
 * @description Supprimer un prompt système (seulement si pas actif)
 * @access Admin
 */
router.delete('/:id', SystemPromptController.deleteSystemPrompt);

export default router; 