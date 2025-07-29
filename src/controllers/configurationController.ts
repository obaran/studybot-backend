// =============================================================================
// STUDYBOT BACKEND - CONTROLLER CONFIGURATION WIDGET  
// =============================================================================

import { Request, Response } from 'express';
import { configurationService } from '@/services/configurationService';
import { logger } from '@/utils/logger';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES
// =============================================================================

interface FileUploadRequest extends Request {
  file?: any;
  body: {
    type: 'bot' | 'user';
  };
}

// =============================================================================
// CONTROLLER CONFIGURATION
// =============================================================================

class ConfigurationController {

  /**
   * @route   GET /api/admin/configuration
   * @desc    Récupérer la configuration par défaut
   * @access  Admin
   */
  async getConfiguration(_req: Request, res: Response): Promise<void> {
    try {
      const config = await configurationService.getDefaultConfiguration();
      
      if (!config) {
        res.status(404).json({
          success: false,
          message: 'Configuration non trouvée',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Erreur getConfiguration', { error });
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération de la configuration',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * @route   PUT /api/admin/configuration  
   * @desc    Mettre à jour la configuration
   * @access  Admin
   */
  async updateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const {
        welcomeMessage,
        footerText,
        footerLink,
        primaryColor,
        secondaryColor,
        position,
        language,
        environment,
        baseUrl,
        apiUrl
      } = req.body;

      // Validation des couleurs (format hex)
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (primaryColor && !colorRegex.test(primaryColor)) {
        res.status(400).json({
          success: false,
          message: 'Format de couleur primaire invalide (utiliser #RRGGBB)',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (secondaryColor && !colorRegex.test(secondaryColor)) {
        res.status(400).json({
          success: false,
          message: 'Format de couleur secondaire invalide (utiliser #RRGGBB)',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validation de la position
      const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
      if (position && !validPositions.includes(position)) {
        res.status(400).json({
          success: false,
          message: 'Position invalide',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validation de l'environnement
      const validEnvironments = ['development', 'production'];
      if (environment && !validEnvironments.includes(environment)) {
        res.status(400).json({
          success: false,
          message: 'Environnement invalide',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedConfig = await configurationService.updateDefaultConfiguration({
        welcomeMessage,
        footerText,
        footerLink,
        primaryColor,
        secondaryColor,
        position,
        language,
        environment,
        baseUrl,
        apiUrl
      }, 'admin');

      logger.info('✅ Configuration mise à jour avec succès');

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Configuration mise à jour avec succès',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Erreur updateConfiguration détaillée', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body
      });
      res.status(500).json({
        success: false,
        message: `Erreur serveur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * @route   POST /api/admin/configuration/upload
   * @desc    Upload d'avatar (bot ou user)
   * @access  Admin
   */
  async uploadFile(req: FileUploadRequest, res: Response): Promise<void> {
    try {
      const { type } = req.body;
      const file = req.file;

      // Validation du type
      if (!type || !['bot', 'user'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Type d\'avatar invalide (bot ou user requis)',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validation du fichier
      if (!file) {
        res.status(400).json({
          success: false,
          message: 'Aucun fichier uploadé',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validation du type de fichier
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          message: 'Type de fichier non supporté (JPEG, PNG, GIF, WebP uniquement)',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validation de la taille (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        res.status(400).json({
          success: false,
          message: 'Fichier trop volumineux (maximum 5MB)',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Créer le dossier uploads s'il n'existe pas
      const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Générer un nom de fichier unique
      const fileExtension = path.extname(file.originalname);
      const fileName = `${type}-avatar-${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      // Sauvegarder le fichier
      fs.writeFileSync(filePath, file.buffer);

      // Construire l'URL du fichier
      const fileUrl = `/uploads/avatars/${fileName}`;

      // Mettre à jour la configuration avec la nouvelle URL
      await configurationService.updateAvatarUrl(
        type as 'bot' | 'user',
        fileUrl,
        'admin'
      );

      logger.info(`📸 Avatar ${type} uploadé avec succès`, { fileName, fileUrl });

      res.json({
        success: true,
        data: {
          filename: fileName,
          url: fileUrl,
          size: file.size,
          mimetype: file.mimetype,
          type: type
        },
        message: `Avatar ${type} uploadé avec succès`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Erreur uploadFile', { error });
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de l\'upload',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * @route   POST /api/admin/configuration/integration-links
   * @desc    Générer les liens d'intégration
   * @access  Admin
   */
  async generateIntegrationLinks(_req: Request, res: Response): Promise<void> {
    try {
      const integrationLinks = await configurationService.generateIntegrationLinks();

      res.json({
        success: true,
        data: integrationLinks,
        message: 'Liens d\'intégration générés avec succès',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Erreur generateIntegrationLinks', { error });
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la génération des liens',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * @route   POST /api/admin/configuration/regenerate-token
   * @desc    Régénérer le token d'intégration
   * @access  Admin
   */
  async regenerateToken(_req: Request, res: Response): Promise<void> {
    try {
      const updatedConfig = await configurationService.regenerateDefaultToken('admin');
      const integrationLinks = await configurationService.generateIntegrationLinks();

      res.json({
        success: true,
        data: {
          configuration: updatedConfig,
          integrationLinks: integrationLinks
        },
        message: 'Token régénéré avec succès',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Erreur regenerateToken', { error });
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la régénération du token',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * @route   GET /api/widget/config/:token
   * @desc    Récupérer la configuration pour un widget (public)
   * @access  Public
   */
  async getWidgetConfig(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Token requis',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const config = await configurationService.getConfigurationByToken(token);

      if (!config) {
        res.status(404).json({
          success: false,
          message: 'Configuration non trouvée pour ce token',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Retourner seulement les données publiques
      const publicConfig = {
        organization: config.organization,
        welcomeMessage: config.welcomeMessage,
        footerText: config.footerText,
        footerLink: config.footerLink,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        botAvatarUrl: config.botAvatarUrl,
        userAvatarUrl: config.userAvatarUrl,
        position: config.position,
        language: config.language,
        apiUrl: config.apiUrl
      };

      res.json({
        success: true,
        data: publicConfig,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Erreur getWidgetConfig', { error });
      res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Export singleton
export const configurationController = new ConfigurationController(); 