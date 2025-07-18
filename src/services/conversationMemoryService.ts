// =============================================================================
// STUDYBOT BACKEND - SERVICE MÉMOIRE CONVERSATIONNELLE
// =============================================================================

import { ChatMessage } from '@/types';
import { logger } from '@/utils/logger';

interface ConversationSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

class ConversationMemoryService {
  private conversations = new Map<string, ConversationSession>();
  private readonly MAX_MESSAGES_PER_SESSION = 10;
  private readonly SESSION_TIMEOUT_HOURS = 24;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Nettoyage automatique toutes les heures
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 60 * 60 * 1000); // 1 heure

    logger.info('🧠 Service mémoire conversationnelle initialisé');
  }

  /**
   * Ajouter un message à la conversation
   */
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
    let session = this.conversations.get(sessionId);
    
    if (!session) {
      // Créer nouvelle session
      session = {
        sessionId,
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date()
      };
      this.conversations.set(sessionId, session);
      logger.info(`🧠 Nouvelle session créée: ${sessionId}`);
    }

    // Ajouter le message
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role,
      content,
      timestamp: new Date()
    };

    session.messages.push(message);
    session.lastActivity = new Date();

    // Limiter à MAX_MESSAGES_PER_SESSION messages (garder les plus récents)
    if (session.messages.length > this.MAX_MESSAGES_PER_SESSION) {
      session.messages = session.messages.slice(-this.MAX_MESSAGES_PER_SESSION);
    }

    logger.info(`🧠 Message ajouté à ${sessionId} (${session.messages.length} messages)`);
  }

  /**
   * Récupérer l'historique d'une conversation
   */
  getConversationHistory(sessionId: string): ChatMessage[] {
    const session = this.conversations.get(sessionId);
    
    if (!session) {
      logger.info(`🧠 Aucun historique trouvé pour: ${sessionId}`);
      return [];
    }

    // Mettre à jour la dernière activité
    session.lastActivity = new Date();
    
    logger.info(`🧠 Historique récupéré pour ${sessionId}: ${session.messages.length} messages`);
    return [...session.messages]; // Copie pour éviter les mutations
  }

  /**
   * Supprimer une conversation
   */
  clearConversation(sessionId: string): boolean {
    const deleted = this.conversations.delete(sessionId);
    if (deleted) {
      logger.info(`🧠 Conversation supprimée: ${sessionId}`);
    }
    return deleted;
  }

  /**
   * Nettoyer les sessions anciennes
   */
  private cleanupOldSessions(): void {
    const now = new Date();
    const timeoutMs = this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const [sessionId, session] of this.conversations.entries()) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > timeoutMs) {
        this.conversations.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`🧠 Nettoyage: ${deletedCount} conversations supprimées (timeout ${this.SESSION_TIMEOUT_HOURS}h)`);
    }
  }

  /**
   * Récupérer toutes les conversations pour l'API admin
   */
  getAllConversations(): ConversationSession[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()); // Plus récentes en premier
  }

  /**
   * Obtenir des statistiques sur la mémoire
   */
  getStats(): {
    activeSessions: number;
    totalMessages: number;
    oldestSession: string | null;
    newestSession: string | null;
  } {
    const sessions = Array.from(this.conversations.values());
    
    return {
      activeSessions: sessions.length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
      oldestSession: sessions.length > 0 
        ? sessions.reduce((oldest, current) => 
            current.createdAt < oldest.createdAt ? current : oldest
          ).sessionId
        : null,
      newestSession: sessions.length > 0
        ? sessions.reduce((newest, current) => 
            current.createdAt > newest.createdAt ? current : newest
          ).sessionId
        : null
    };
  }

  /**
   * Nettoyer toutes les conversations (pour les tests)
   */
  clearAll(): void {
    const count = this.conversations.size;
    this.conversations.clear();
    logger.info(`🧠 Toutes les conversations supprimées (${count})`);
  }

  /**
   * Destructor pour nettoyer l'interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clearAll();
    logger.info('🧠 Service mémoire conversationnelle détruit');
  }
}

// Instance singleton
export const conversationMemory = new ConversationMemoryService();
export default conversationMemory; 