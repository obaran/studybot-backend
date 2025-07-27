// =============================================================================
// STUDYBOT BACKEND - ROUTES WIDGET (PUBLIC)
// =============================================================================

import { Router } from 'express';
import { configurationController } from '@/controllers/configurationController';

const router = Router();

/**
 * @route   GET /api/widget/config/:token
 * @desc    Récupérer la configuration widget par token (public)
 * @access  Public
 */
router.get('/config/:token', configurationController.getWidgetConfig);

export default router; 