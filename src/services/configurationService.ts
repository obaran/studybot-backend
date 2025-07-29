// =============================================================================
// STUDYBOT BACKEND - SERVICE CONFIGURATION WIDGET
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import { database } from '@/config/database';
import { logger } from '@/utils/logger';
import { RowDataPacket } from 'mysql2';

// =============================================================================
// TYPES
// =============================================================================

export interface WidgetConfiguration {
  id: number;
  token: string;
  organization: string;
  welcomeMessage: string;
  footerText: string;
  footerLink?: string;
  primaryColor: string;
  secondaryColor: string;
  botAvatarUrl?: string;
  userAvatarUrl?: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  language: string;
  environment: 'development' | 'production';
  baseUrl: string;
  apiUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface UpdateConfigurationRequest {
  welcomeMessage?: string;
  footerText?: string;
  footerLink?: string;
  primaryColor?: string;
  secondaryColor?: string;
  botAvatarUrl?: string;
  userAvatarUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  language?: string;
  environment?: 'development' | 'production';
  baseUrl?: string;
  apiUrl?: string;
}

export interface IntegrationLinks {
  token: string;
  directLink: string;
  iframeCode: string;
  embedCode: string;
  environment: string;
  generatedAt: string;
}

// =============================================================================
// SERVICE CONFIGURATION
// =============================================================================

class ConfigurationService {

  /**
   * Initialiser les tables de configuration
   */
  async initializeTables(): Promise<void> {
    try {
      logger.info('🔧 Initialisation des tables configuration...');
      
      // Créer la table widget_configurations compatible MySQL
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS widget_configurations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          token VARCHAR(255) UNIQUE NOT NULL,
          organization VARCHAR(255) DEFAULT 'emlyon business school',
          welcome_message TEXT,
          footer_text VARCHAR(255) DEFAULT 'Powered by emlyon business school',
          footer_link VARCHAR(500) DEFAULT 'https://emlyon.com',
          primary_color VARCHAR(7) DEFAULT '#e2001a',
          secondary_color VARCHAR(7) DEFAULT '#b50015',
          bot_avatar_url VARCHAR(500),
          user_avatar_url VARCHAR(500),
          position ENUM('bottom-right', 'bottom-left', 'top-right', 'top-left') DEFAULT 'bottom-right',
          language VARCHAR(5) DEFAULT 'fr',
          environment ENUM('development', 'production') DEFAULT 'development',
          base_url VARCHAR(500) DEFAULT 'http://localhost:5173',
          api_url VARCHAR(500) DEFAULT 'http://localhost:3001',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_by VARCHAR(255) DEFAULT 'system',
          INDEX idx_token (token),
          INDEX idx_organization (organization),
          INDEX idx_is_active (is_active),
          INDEX idx_environment (environment)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      await database.query(createTableQuery);

      // Vérifier si la configuration par défaut existe (FIX: Gestion robuste duplication)
      const [rows] = await database.query(
        'SELECT COUNT(*) as count FROM widget_configurations WHERE token = ?',
        ['default-emlyon-2025']
      ) as [any[], any];

      // Insérer la configuration par défaut si elle n'existe pas
      if (!rows[0] || rows[0].count === 0) {
        const insertQuery = `
          INSERT INTO widget_configurations (
            token, 
            organization, 
            welcome_message,
            footer_text,
            footer_link,
            primary_color,
            secondary_color,
            environment,
            base_url,
            api_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          'default-emlyon-2025',
          'emlyon business school',
          'Bonjour ! Je suis votre assistant virtuel emlyon. 🚨 Veuillez ne pas transmettre d\'informations personnelles. 🔔 Studybot peut faire des erreurs. Comment puis-je vous aider ?',
          'Powered by emlyon business school',
          'https://emlyon.com',
          '#e2001a',
          '#b50015',
          'development',
          'http://localhost:5173',
          'http://localhost:3001'
        ];

        try {
          await database.query(insertQuery, values);
          logger.info('✅ Configuration par défaut créée');
        } catch (insertError: any) {
          if (insertError.code === 'ER_DUP_ENTRY') {
            logger.info('📦 Token déjà existant (redémarrage), ignoré gracieusement');
          } else {
            logger.error('❌ Erreur insertion:', insertError);
            throw insertError;
          }
        }
      }

      logger.info('✅ Tables configuration initialisées');
    } catch (error) {
      logger.error('❌ Erreur initialisation tables configuration:', error);
      throw new Error(`Erreur initialisation tables configuration: ${error}`);
    }
  }
  
  /**
   * Récupérer la configuration par défaut active
   */
  async getDefaultConfiguration(): Promise<WidgetConfiguration | null> {
    try {
      const query = `
        SELECT 
          id,
          token,
          organization,
          welcome_message as welcomeMessage,
          footer_text as footerText,
          footer_link as footerLink,
          primary_color as primaryColor,
          secondary_color as secondaryColor,
          bot_avatar_url as botAvatarUrl,
          user_avatar_url as userAvatarUrl,
          position,
          language,
          environment,
          base_url as baseUrl,
          api_url as apiUrl,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt,
          created_by as createdBy
        FROM widget_configurations 
        WHERE is_active = TRUE 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const rows = await database.query(query) as RowDataPacket[];
      
      if (rows.length === 0) {
        logger.warn('⚠️ Aucune configuration widget par défaut trouvée');
        return null;
      }

      logger.info('📦 Configuration widget récupérée', { token: rows[0].token });
      return rows[0] as WidgetConfiguration;

    } catch (error) {
      logger.error('❌ Erreur lors de la récupération de la configuration', { error });
      throw new Error('Erreur lors de la récupération de la configuration');
    }
  }

  /**
   * Récupérer une configuration par token
   */
  async getConfigurationByToken(token: string): Promise<WidgetConfiguration | null> {
    try {
      const query = `
        SELECT 
          id,
          token,
          organization,
          welcome_message as welcomeMessage,
          footer_text as footerText,
          footer_link as footerLink,
          primary_color as primaryColor,
          secondary_color as secondaryColor,
          bot_avatar_url as botAvatarUrl,
          user_avatar_url as userAvatarUrl,
          position,
          language,
          environment,
          base_url as baseUrl,
          api_url as apiUrl,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt,
          created_by as createdBy
        FROM widget_configurations 
        WHERE token = ? AND is_active = TRUE
      `;

      const rows = await database.query(query, [token]) as RowDataPacket[];
      
      if (rows.length === 0) {
        logger.warn('⚠️ Configuration widget non trouvée', { token });
        return null;
      }

      logger.info('📦 Configuration widget récupérée par token', { token });
      return rows[0] as WidgetConfiguration;

    } catch (error) {
      logger.error('❌ Erreur lors de la récupération de la configuration par token', { error, token });
      throw new Error('Erreur lors de la récupération de la configuration');
    }
  }

  /**
   * Mettre à jour la configuration par défaut
   */
  async updateDefaultConfiguration(
    updates: UpdateConfigurationRequest,
    updatedBy: string = 'admin'
  ): Promise<WidgetConfiguration> {
    try {
      // Récupérer la config actuelle pour mise à jour
      const currentConfig = await this.getDefaultConfiguration();
      if (!currentConfig) {
        throw new Error('Configuration par défaut non trouvée');
      }

      // Mapping explicite pour éviter les erreurs de conversion
      const fieldMapping: { [key: string]: string } = {
        'welcomeMessage': 'welcome_message',
        'footerText': 'footer_text', 
        'footerLink': 'footer_link',
        'primaryColor': 'primary_color',
        'secondaryColor': 'secondary_color',
        'botAvatarUrl': 'bot_avatar_url',
        'userAvatarUrl': 'user_avatar_url',
        'baseUrl': 'base_url',
        'apiUrl': 'api_url'
      };

      // Construire la requête de mise à jour avec mapping explicite
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = fieldMapping[key] || key.toLowerCase();
          updateFields.push(`${dbField} = ?`);
          updateValues.push(value);
        }
      });

      if (updateFields.length === 0) {
        logger.warn('⚠️ Aucun champ à mettre à jour');
        return currentConfig;
      }

      // La colonne updated_by n'existe pas, on skip
      updateValues.push(currentConfig.token);
      
      const query = `
        UPDATE widget_configurations 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE token = ?
      `;

      logger.info('🔍 UPDATE Configuration', { 
        fieldsToUpdate: updateFields,
        token: currentConfig.token,
        updatesReceived: Object.keys(updates)
      });

      await database.query(query, updateValues);

      logger.info('✅ Configuration widget mise à jour avec succès', { 
        token: currentConfig.token,
        fields: updateFields.length,
        updatedBy 
      });

      // Retourner la configuration mise à jour
      const updatedConfig = await this.getDefaultConfiguration();
      return updatedConfig!;

    } catch (error) {
      logger.error('❌ Erreur mise à jour configuration', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        updates: Object.keys(updates)
      });
      throw error; // Re-lancer l'erreur originale pour plus de détails
    }
  }

  /**
   * Générer un nouveau token unique
   */
  async generateNewToken(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const newToken = `widget-${uuidv4().substring(0, 8)}-${Date.now().toString(36)}`;
        
        // Vérifier l'unicité
        const existing = await this.getConfigurationByToken(newToken);
        if (!existing) {
          logger.info('🎯 Nouveau token généré', { token: newToken });
          return newToken;
        }
        
        attempts++;
      } catch (error) {
        attempts++;
        logger.warn('⚠️ Tentative de génération de token échouée', { attempt: attempts });
      }
    }

    throw new Error('Impossible de générer un token unique');
  }

  /**
   * Régénérer le token de la configuration par défaut
   * SÉCURITÉ: Invalide TOUS les anciens tokens avant de créer le nouveau
   */
  async regenerateDefaultToken(updatedBy: string = 'admin'): Promise<WidgetConfiguration> {
    try {
      const currentConfig = await this.getDefaultConfiguration();
      if (!currentConfig) {
        throw new Error('Configuration par défaut non trouvée');
      }

      const oldToken = currentConfig.token;
      const newToken = await this.generateNewToken();

      // ÉTAPE 1: Désactiver TOUS les anciens tokens (sécurité critique)
      await database.query(`
        UPDATE widget_configurations 
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE token != ? AND is_active = TRUE
      `, [newToken]);

      // ÉTAPE 2: Mettre à jour la configuration avec le nouveau token
      const updateQuery = `
        UPDATE widget_configurations 
        SET token = ?, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await database.query(updateQuery, [newToken, currentConfig.id]);

      // ÉTAPE 3: Vérifier que l'ancien token est bien invalidé
      const oldTokenCheck = await this.getConfigurationByToken(oldToken);
      if (oldTokenCheck) {
        logger.warn('⚠️ Ancien token encore actif, forçage de la désactivation');
        await database.query(`
          UPDATE widget_configurations 
          SET is_active = FALSE 
          WHERE token = ?
        `, [oldToken]);
      }

      logger.info('🔄 Token de configuration régénéré avec invalidation sécurisée', { 
        oldToken: oldToken,
        newToken: newToken,
        updatedBy: updatedBy,
        securityCheck: 'PASSED'
      });

      const updatedConfig = await this.getDefaultConfiguration();
      if (!updatedConfig) {
        throw new Error('Configuration mise à jour non trouvée');
      }

      return updatedConfig;

    } catch (error) {
      logger.error('❌ Erreur lors de la régénération sécurisée du token', { error });
      throw new Error('Erreur lors de la régénération du token');
    }
  }

  /**
   * Générer les liens d'intégration
   */
  async generateIntegrationLinks(token?: string): Promise<IntegrationLinks> {
    try {
      const config = token 
        ? await this.getConfigurationByToken(token)
        : await this.getDefaultConfiguration();

      if (!config) {
        throw new Error('Configuration non trouvée');
      }

      const baseUrl = config.baseUrl;
      const apiUrl = config.apiUrl;

      // Lien direct vers le chat (SOURCE UNIQUE: /bot)
      const directLink = `${baseUrl}/bot?token=${config.token}`;

      // Code iframe (pointe vers /bot - source unique)
      const iframeCode = `<iframe
  src="${baseUrl}/bot?token=${config.token}"
  width="100%"
  height="600"
  frameborder="0"
  allow="microphone"
  style="border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
</iframe>`;

      // Code embed complet
      const embedCode = `<!-- StudyBot ${config.organization} - Intégration Widget -->
<div id="studybot-container"></div>
<script>
(function() {
  window.StudyBotConfig = {
    apiUrl: '${apiUrl}',
    token: '${config.token}',
    theme: {
      primaryColor: '${config.primaryColor}',
      secondaryColor: '${config.secondaryColor}',
      position: '${config.position}',
      language: '${config.language}'
    },
    welcome: {
      message: '${config.welcomeMessage.replace(/'/g, "\\'")}',
      delay: 2000
    },
    footer: {
      text: '${config.footerText}',
      link: '${config.footerLink || ''}'
    }
  };

  var script = document.createElement('script');
  script.src = '${baseUrl}/widget.js';
  script.async = true;
  document.head.appendChild(script);
})();
</script>
<!-- Fin StudyBot -->`;

      const integrationLinks: IntegrationLinks = {
        token: config.token,
        directLink,
        iframeCode,
        embedCode,
        environment: config.environment,
        generatedAt: new Date().toISOString()
      };

      logger.info('🔗 Liens d\'intégration générés', { 
        token: config.token,
        environment: config.environment 
      });

      return integrationLinks;

    } catch (error) {
      logger.error('❌ Erreur lors de la génération des liens', { error });
      throw new Error('Erreur lors de la génération des liens d\'intégration');
    }
  }

  /**
   * Sauvegarder URL d'avatar après upload
   */
  async updateAvatarUrl(
    type: 'bot' | 'user',
    avatarUrl: string,
    updatedBy: string = 'admin'
  ): Promise<WidgetConfiguration> {
    try {
      // const field = type === 'bot' ? 'bot_avatar_url' : 'user_avatar_url';
      
      const updates: UpdateConfigurationRequest = {};
      if (type === 'bot') {
        updates.botAvatarUrl = avatarUrl;
      } else {
        updates.userAvatarUrl = avatarUrl;
      }

      const updatedConfig = await this.updateDefaultConfiguration(updates, updatedBy);

      logger.info(`📸 Avatar ${type} mis à jour`, { 
        type,
        avatarUrl,
        updatedBy 
      });

      return updatedConfig;

    } catch (error) {
      logger.error(`❌ Erreur lors de la mise à jour de l'avatar ${type}`, { error });
      throw new Error(`Erreur lors de la mise à jour de l'avatar ${type}`);
    }
  }
}

// Export singleton
export const configurationService = new ConfigurationService(); 