// =============================================================================
// STUDYBOT BACKEND - CONTRÔLEUR PROMPTS SYSTÈME
// =============================================================================

import { Request, Response } from 'express';
import { systemPromptService, CreatePromptRequest, UpdatePromptRequest } from '@/services/systemPromptService';
import { logger } from '@/utils/logger';

/**
 * Récupérer tous les prompts système (historique)
 */
export const getSystemPrompts = async (_req: Request, res: Response): Promise<void> => {
  try {
    logger.info('📋 Récupération de tous les prompts système');

    const prompts = await systemPromptService.getAllPrompts();

    res.status(200).json({
      success: true,
      data: prompts,
      message: `${prompts.length} prompt(s) récupéré(s)`,
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ ${prompts.length} prompts récupérés`);

  } catch (error) {
    logger.error('❌ Erreur récupération prompts:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erreur lors de la récupération des prompts',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Récupérer le prompt système actif
 */
export const getActiveSystemPrompt = async (_req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🎯 Récupération du prompt système actif');

    const activePrompt = await systemPromptService.getActivePrompt();

    if (!activePrompt) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Aucun prompt système actif trouvé',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: activePrompt,
      message: 'Prompt actif récupéré avec succès',
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Prompt actif récupéré: v${activePrompt.version}`);

  } catch (error) {
    logger.error('❌ Erreur récupération prompt actif:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erreur lors de la récupération du prompt actif',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Récupérer un prompt spécifique par ID
 */
export const getSystemPromptById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: promptId } = req.params;

    if (!promptId) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'ID du prompt requis',
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info(`🔍 Récupération du prompt: ${promptId}`);

    const prompt = await systemPromptService.getPromptById(promptId);

    if (!prompt) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Prompt non trouvé',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: prompt,
      message: 'Prompt récupéré avec succès',
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Prompt récupéré: ${promptId} v${prompt.version}`);

  } catch (error) {
    logger.error('❌ Erreur récupération prompt par ID:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erreur lors de la récupération du prompt',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Créer un nouveau prompt système
 */
export const createSystemPrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, title, description, metadata } = req.body;

    // Validation basique
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Le contenu du prompt est requis',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (content.length > 50000) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Le contenu du prompt est trop long (max 50000 caractères)',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const createData: CreatePromptRequest = {
      content: content.trim(),
      title: title?.trim(),
      description: description?.trim(),
      createdBy: (req as any).user?.email || 'admin', // Récupéré du middleware d'auth
      metadata
    };

    logger.info(`📝 Création d'un nouveau prompt par ${createData.createdBy}`);

    const newPrompt = await systemPromptService.createPrompt(createData);

    res.status(201).json({
      success: true,
      data: newPrompt,
      message: 'Prompt créé avec succès',
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Nouveau prompt créé: ${newPrompt.promptId} v${newPrompt.version}`);

  } catch (error) {
    logger.error('❌ Erreur création prompt:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erreur lors de la création du prompt',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Mettre à jour un prompt système (créer une nouvelle version)
 */
export const updateSystemPrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: promptId } = req.params;
    const { content, title, description, changeSummary, metadata } = req.body;

    if (!promptId) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'ID du prompt requis',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validation basique
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Le contenu du prompt est requis',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (content.length > 50000) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Le contenu du prompt est trop long (max 50000 caractères)',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const updateData: UpdatePromptRequest = {
      content: content.trim(),
      title: title?.trim(),
      description: description?.trim(),
      changeSummary: changeSummary?.trim(),
      createdBy: (req as any).user?.email || 'admin', // Récupéré du middleware d'auth
      metadata
    };

    logger.info(`✏️ Mise à jour du prompt ${promptId} par ${updateData.createdBy}`);

    const updatedPrompt = await systemPromptService.updatePrompt(promptId, updateData);

    res.status(200).json({
      success: true,
      data: updatedPrompt,
      message: 'Prompt mis à jour avec succès',
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Prompt mis à jour: ${updatedPrompt.promptId} v${updatedPrompt.version}`);

  } catch (error) {
    logger.error('❌ Erreur mise à jour prompt:', error);
    
    if (error instanceof Error && error.message === 'Prompt non trouvé') {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Prompt non trouvé',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Erreur lors de la mise à jour du prompt',
        timestamp: new Date().toISOString()
      });
    }
  }
};

/**
 * Restaurer une version précédente d'un prompt
 */
export const restoreSystemPromptVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: promptId } = req.params;

    if (!promptId) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'ID du prompt requis',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const createdBy = (req as any).user?.email || 'admin';

    logger.info(`🔄 Restauration de la version ${promptId} par ${createdBy}`);

    const restoredPrompt = await systemPromptService.restoreVersion(promptId, createdBy);

    res.status(200).json({
      success: true,
      data: restoredPrompt,
      message: 'Version restaurée avec succès',
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Version restaurée: ${restoredPrompt.promptId} v${restoredPrompt.version}`);

  } catch (error) {
    logger.error('❌ Erreur restauration version:', error);
    
    if (error instanceof Error && error.message === 'Version à restaurer non trouvée') {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Version à restaurer non trouvée',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Erreur lors de la restauration de la version',
        timestamp: new Date().toISOString()
      });
    }
  }
};

/**
 * Supprimer un prompt système (seulement si pas actif)
 */
export const deleteSystemPrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: promptId } = req.params;

    if (!promptId) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'ID du prompt requis',
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info(`🗑️ Suppression du prompt ${promptId}`);

    const deleted = await systemPromptService.deletePrompt(promptId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Prompt non trouvé',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { deleted: true },
      message: 'Prompt supprimé avec succès',
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Prompt supprimé: ${promptId}`);

  } catch (error) {
    logger.error('❌ Erreur suppression prompt:', error);
    
    if (error instanceof Error && error.message === 'Impossible de supprimer le prompt actif') {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Impossible de supprimer le prompt actif',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Erreur lors de la suppression du prompt',
        timestamp: new Date().toISOString()
      });
    }
  }
};

/**
 * Obtenir les statistiques des prompts système
 */
export const getSystemPromptStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    logger.info('📊 Récupération des statistiques des prompts');

    const stats = await systemPromptService.getStats();

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Statistiques récupérées avec succès',
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Statistiques récupérées: ${stats.totalPrompts} prompts, version active v${stats.activeVersion}`);

  } catch (error) {
    logger.error('❌ Erreur récupération statistiques prompts:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erreur lors de la récupération des statistiques',
      timestamp: new Date().toISOString()
    });
  }
};

const SystemPromptController = {
  getSystemPrompts,
  getActiveSystemPrompt,
  getSystemPromptById,
  createSystemPrompt,
  updateSystemPrompt,
  restoreSystemPromptVersion,
  deleteSystemPrompt,
  getSystemPromptStats
};

export default SystemPromptController; 