// =============================================================================
// STUDYBOT BACKEND - SERVICE GESTION PROMPTS SYSTÈME
// =============================================================================

import { database } from '@/config/database';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface SystemPrompt {
  id: string;
  promptId: string;
  content: string;
  version: string;
  title?: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
  characterCount: number;
  wordCount: number;
  metadata?: any;
}

export interface CreatePromptRequest {
  content: string;
  title?: string;
  description?: string;
  createdBy: string;
  metadata?: any;
}

export interface UpdatePromptRequest {
  content: string;
  title?: string;
  description?: string;
  createdBy: string;
  changeSummary?: string;
  metadata?: any;
}

class SystemPromptService {
  
  /**
   * Initialiser les tables si nécessaire
   */
  async initializeTables(): Promise<void> {
    try {
      // Exécuter le script SQL pour créer les tables
      const sqlScript = `
        CREATE TABLE IF NOT EXISTS system_prompts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          prompt_id VARCHAR(255) UNIQUE NOT NULL,
          content TEXT NOT NULL,
          version VARCHAR(50) NOT NULL,
          title VARCHAR(255),
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255) NOT NULL DEFAULT 'system',
          is_active BOOLEAN DEFAULT FALSE,
          character_count INT GENERATED ALWAYS AS (LENGTH(content)) STORED,
          word_count INT GENERATED ALWAYS AS (
            LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1
          ) STORED,
          metadata JSON,
          INDEX idx_prompt_id (prompt_id),
          INDEX idx_version (version),
          INDEX idx_created_at (created_at),
          INDEX idx_is_active (is_active),
          INDEX idx_created_by (created_by)
        );
      `;

      await database.query(sqlScript);
      logger.info('✅ Tables system_prompts initialisées');
    } catch (error) {
      logger.error('❌ Erreur initialisation tables system_prompts:', error);
      throw error;
    }
  }

  /**
   * Récupérer le prompt système actif
   */
  async getActivePrompt(): Promise<SystemPrompt | null> {
    try {
      const result = await database.query(`
        SELECT 
          id,
          prompt_id,
          content,
          version,
          title,
          description,
          created_at,
          created_by,
          is_active,
          character_count,
          word_count,
          metadata
        FROM system_prompts 
        WHERE is_active = TRUE 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (!Array.isArray(result) || result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        id: row.id.toString(),
        promptId: row.prompt_id,
        content: row.content,
        version: row.version,
        title: row.title,
        description: row.description,
        createdAt: new Date(row.created_at),
        createdBy: row.created_by,
        isActive: Boolean(row.is_active),
        characterCount: row.character_count,
        wordCount: row.word_count,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      };
    } catch (error) {
      logger.error('❌ Erreur récupération prompt actif:', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les prompts (historique)
   */
  async getAllPrompts(): Promise<SystemPrompt[]> {
    try {
      const result = await database.query(`
        SELECT 
          id,
          prompt_id,
          content,
          version,
          title,
          description,
          created_at,
          created_by,
          is_active,
          character_count,
          word_count,
          metadata
        FROM system_prompts 
        ORDER BY created_at DESC
      `);

      if (!Array.isArray(result)) {
        return [];
      }

      return result.map(row => ({
        id: row.id.toString(),
        promptId: row.prompt_id,
        content: row.content,
        version: row.version,
        title: row.title,
        description: row.description,
        createdAt: new Date(row.created_at),
        createdBy: row.created_by,
        isActive: Boolean(row.is_active),
        characterCount: row.character_count,
        wordCount: row.word_count,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      }));
    } catch (error) {
      logger.error('❌ Erreur récupération tous les prompts:', error);
      throw error;
    }
  }

  /**
   * Récupérer un prompt spécifique par ID
   */
  async getPromptById(promptId: string): Promise<SystemPrompt | null> {
    try {
      const result = await database.query(`
        SELECT 
          id,
          prompt_id,
          content,
          version,
          title,
          description,
          created_at,
          created_by,
          is_active,
          character_count,
          word_count,
          metadata
        FROM system_prompts 
        WHERE prompt_id = ?
      `, [promptId]);

      if (!Array.isArray(result) || result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        id: row.id.toString(),
        promptId: row.prompt_id,
        content: row.content,
        version: row.version,
        title: row.title,
        description: row.description,
        createdAt: new Date(row.created_at),
        createdBy: row.created_by,
        isActive: Boolean(row.is_active),
        characterCount: row.character_count,
        wordCount: row.word_count,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      };
    } catch (error) {
      logger.error('❌ Erreur récupération prompt par ID:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau prompt système (première version)
   */
  async createPrompt(data: CreatePromptRequest): Promise<SystemPrompt> {
    try {
      const promptId = `prompt_${Date.now()}_${uuidv4().slice(0, 8)}`;
      const version = '1.0';

      // Désactiver tous les autres prompts
      await database.query(`UPDATE system_prompts SET is_active = FALSE`);

      // Créer le nouveau prompt actif
      await database.query(`
        INSERT INTO system_prompts (
          prompt_id, content, version, title, description, created_by, is_active, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)
      `, [
        promptId,
        data.content,
        version,
        data.title || 'Prompt Système',
        data.description || 'Prompt système StudyBot',
        data.createdBy,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]);

      logger.info(`✅ Nouveau prompt créé: ${promptId} v${version} par ${data.createdBy}`);

      // Récupérer le prompt créé
      const createdPrompt = await this.getPromptById(promptId);
      if (!createdPrompt) {
        throw new Error('Erreur lors de la récupération du prompt créé');
      }

      return createdPrompt;
    } catch (error) {
      logger.error('❌ Erreur création prompt:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un prompt (créer une nouvelle version)
   */
  async updatePrompt(promptId: string, data: UpdatePromptRequest): Promise<SystemPrompt> {
    try {
      // Récupérer le prompt actuel pour déterminer la nouvelle version
      const currentPrompt = await this.getPromptById(promptId);
      if (!currentPrompt) {
        throw new Error('Prompt non trouvé');
      }

      // Calculer la nouvelle version
      const currentVersion = currentPrompt.version;
      const versionParts = currentVersion.split('.');
      const majorVersion = parseInt(versionParts[0]) || 1;
      const minorVersion = parseInt(versionParts[1]) || 0;
      const newVersion = `${majorVersion}.${minorVersion + 1}`;

      // Désactiver tous les autres prompts
      await database.query(`UPDATE system_prompts SET is_active = FALSE`);

      // Créer la nouvelle version
      const newPromptId = `prompt_${Date.now()}_${uuidv4().slice(0, 8)}`;
      await database.query(`
        INSERT INTO system_prompts (
          prompt_id, content, version, title, description, created_by, is_active, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)
      `, [
        newPromptId,
        data.content,
        newVersion,
        data.title || currentPrompt.title,
        data.description || currentPrompt.description,
        data.createdBy,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]);

      logger.info(`✅ Prompt mis à jour: ${newPromptId} v${newVersion} par ${data.createdBy}`);
      if (data.changeSummary) {
        logger.info(`📝 Résumé des changements: ${data.changeSummary}`);
      }

      // Récupérer le prompt mis à jour
      const updatedPrompt = await this.getPromptById(newPromptId);
      if (!updatedPrompt) {
        throw new Error('Erreur lors de la récupération du prompt mis à jour');
      }

      return updatedPrompt;
    } catch (error) {
      logger.error('❌ Erreur mise à jour prompt:', error);
      throw error;
    }
  }

  /**
   * Restaurer une version précédente (la rendre active)
   */
  async restoreVersion(promptId: string, createdBy: string): Promise<SystemPrompt> {
    try {
      const promptToRestore = await this.getPromptById(promptId);
      if (!promptToRestore) {
        throw new Error('Version à restaurer non trouvée');
      }

      // Créer une nouvelle version basée sur la version à restaurer
      const currentActive = await this.getActivePrompt();
      let newVersion = '1.0';
      
      if (currentActive) {
        const versionParts = currentActive.version.split('.');
        const majorVersion = parseInt(versionParts[0]) || 1;
        const minorVersion = parseInt(versionParts[1]) || 0;
        newVersion = `${majorVersion}.${minorVersion + 1}`;
      }

      // Désactiver tous les autres prompts
      await database.query(`UPDATE system_prompts SET is_active = FALSE`);

      // Créer la nouvelle version restaurée
      const newPromptId = `prompt_${Date.now()}_${uuidv4().slice(0, 8)}`;
      await database.query(`
        INSERT INTO system_prompts (
          prompt_id, content, version, title, description, created_by, is_active, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)
      `, [
        newPromptId,
        promptToRestore.content,
        newVersion,
        promptToRestore.title,
        `Restauré depuis v${promptToRestore.version}`,
        createdBy,
        promptToRestore.metadata ? JSON.stringify(promptToRestore.metadata) : null
      ]);

      logger.info(`✅ Version restaurée: ${newPromptId} v${newVersion} (depuis v${promptToRestore.version}) par ${createdBy}`);

      // Récupérer le prompt restauré
      const restoredPrompt = await this.getPromptById(newPromptId);
      if (!restoredPrompt) {
        throw new Error('Erreur lors de la récupération du prompt restauré');
      }

      return restoredPrompt;
    } catch (error) {
      logger.error('❌ Erreur restauration version:', error);
      throw error;
    }
  }

  /**
   * Supprimer un prompt (seulement s'il n'est pas actif)
   */
  async deletePrompt(promptId: string): Promise<boolean> {
    try {
      const prompt = await this.getPromptById(promptId);
      if (!prompt) {
        return false;
      }

      if (prompt.isActive) {
        throw new Error('Impossible de supprimer le prompt actif');
      }

      await database.query(`DELETE FROM system_prompts WHERE prompt_id = ?`, [promptId]);

      logger.info(`✅ Prompt supprimé: ${promptId}`);
      return true;
    } catch (error) {
      logger.error('❌ Erreur suppression prompt:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des prompts
   */
  async getStats(): Promise<{
    totalPrompts: number;
    activeVersion: string | null;
    lastUpdated: Date | null;
    averageLength: number;
  }> {
    try {
      const result = await database.query(`
        SELECT 
          COUNT(*) as total_prompts,
          AVG(character_count) as avg_length,
          MAX(created_at) as last_updated
        FROM system_prompts
      `);

      const activePrompt = await this.getActivePrompt();

      return {
        totalPrompts: result[0]?.total_prompts || 0,
        activeVersion: activePrompt?.version || null,
        lastUpdated: result[0]?.last_updated ? new Date(result[0].last_updated) : null,
        averageLength: Math.round(result[0]?.avg_length || 0)
      };
    } catch (error) {
      logger.error('❌ Erreur récupération stats prompts:', error);
      throw error;
    }
  }
}

export const systemPromptService = new SystemPromptService(); 