// =============================================================================
// BIBLIOBOT BACKEND - RAG CHAIN SERVICE (CONVERSATIONAL RETRIEVAL QA)
// =============================================================================

import { ChatMessage } from '@/types';
import { qdrantService } from '@/services/qdrantService';
import { systemPromptService } from '@/services/systemPromptService';
import { logger, logOpenAI, logError } from '@/utils/logger';
import { config } from '@/config';
import { OpenAI } from 'openai';

// Configuration du client OpenAI pour Azure
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  baseURL: `${config.openai.endpoint}openai/deployments/${config.openai.deploymentName}`,
  defaultQuery: { 'api-version': config.openai.apiVersion },
  defaultHeaders: {
    'api-key': config.openai.apiKey,
  },
});

/**
 * RAG Chain Service - Implémente un Conversational Retrieval QA Chain
 * Similaire au noeud Flowise mais optimisé et professionnel
 */
class RAGChainService {
  // Seuils de pertinence (AJUSTÉ pour précision)
  private readonly SIMILARITY_THRESHOLD = 0.55; // ✅ Plus strict pour éviter le bruit
  private readonly MIN_RELEVANT_DOCS = 1; // Nombre minimum de docs pertinents requis
  private readonly TOP_K = 5; // ✅ Moins de docs pour plus de concentration

  // Paramètres LLM (COMME FLOWISE)
  private readonly TEMPERATURE = 0.4; // ✅ Plus factuel (moins d'hallucinations)
  private readonly MAX_TOKENS = 500; // ✅ Concis mais suffisant pour explications pédagogiques
  private readonly TOP_P = 0.9; // Nucleus sampling
  private readonly FREQUENCY_PENALTY = 0.3; // Réduit répétitions
  private readonly PRESENCE_PENALTY = 0.2; // Encourage diversité minimale

  /**
   * Générer une réponse avec RAG Chain strict
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: ChatMessage[],
    sessionId: string,
    chatbot: string = 'bibliobot'
  ): Promise<{
    response: string;
    tokensUsed: number;
    responseTime: number;
    sources: string[];
    relevantDocsCount: number;
    hasRelevantContext: boolean;
  }> {
    const startTime = Date.now();

    try {
      // ÉTAPE 1: Reformuler la question avec le contexte de conversation
      const reformulatedQuestion = await this.reformulateWithHistory(
        userMessage,
        conversationHistory
      );

      logger.info(`🔄 Question reformulée: "${reformulatedQuestion}"`);

      // ÉTAPE 2: Recherche vectorielle avec TOP_K = 7 (comme Flowise)
      const vectorResults = await qdrantService.searchForChatbot(
        reformulatedQuestion,
        chatbot as 'studybot' | 'bibliobot',
        this.TOP_K // ✅ 5 documents (plus précis)
      );

      // ÉTAPE 3: FILTRAGE STRICT par score de similarité
      const relevantDocs = vectorResults.filter(
        doc => doc.score >= this.SIMILARITY_THRESHOLD
      );

      logger.info(
        `📊 Recherche vectorielle: ${vectorResults.length} résultats, ${relevantDocs.length} pertinents (seuil: ${this.SIMILARITY_THRESHOLD})`
      );
      logger.info(
        `   Scores: ${vectorResults.map(r => r.score.toFixed(3)).join(', ')}`
      );

      // ÉTAPE 4: Vérifier si on a du contexte pertinent
      const hasRelevantContext = relevantDocs.length >= this.MIN_RELEVANT_DOCS;

      if (!hasRelevantContext) {
        logger.warn('⚠️ Pas de contexte pertinent trouvé - Le LLM répondra sans contexte');
      }

      // ÉTAPE 5: Construire le contexte (vide si pas de docs pertinents)
      const contextSources = relevantDocs.map(doc => doc.content);

      // ÉTAPE 6: Construire les messages avec prompt STRICT
      const messages = await this.buildStrictMessages(
        userMessage,
        conversationHistory,
        contextSources
      );

      // ÉTAPE 7: Appel LLM avec paramètres anti-hallucination
      const completion = await openai.chat.completions.create({
        model: config.openai.model,
        messages,
        max_tokens: this.MAX_TOKENS,
        temperature: this.TEMPERATURE, // ⚡ TRÈS BAS pour éviter hallucinations (0.1)
        top_p: this.TOP_P,
        frequency_penalty: this.FREQUENCY_PENALTY,
        presence_penalty: this.PRESENCE_PENALTY,
        stream: false,
      });

      const responseTime = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;

      // Logger la requête
      logOpenAI(
        'rag_chain_completion',
        config.openai.model,
        tokensUsed,
        responseTime,
        sessionId
      );

      // ÉTAPE 8: Post-traitement de la réponse
      const cleanedResponse = this.cleanResponse(response);

      return {
        response: cleanedResponse,
        tokensUsed,
        responseTime,
        sources: contextSources,
        relevantDocsCount: relevantDocs.length,
        hasRelevantContext: true
      };

    } catch (error) {
      logError(error as Error, {
        service: 'ragChain',
        action: 'generateResponse',
        sessionId
      });

      throw error;
    }
  }

  /**
   * Reformuler la question avec l'historique de conversation
   * REPHRASE PROMPT (comme Flowise)
   */
  private async reformulateWithHistory(
    question: string,
    history: ChatMessage[]
  ): Promise<string> {
    // Si pas d'historique, retourner la question telle quelle
    if (history.length === 0) {
      return question;
    }

    // Prendre les 3 derniers échanges pour le contexte
    const recentHistory = history.slice(-6); // 3 user + 3 assistant

    // Si la question est déjà complète (plus de 10 mots), pas besoin de reformuler
    if (question.split(' ').length > 10) {
      return question;
    }


    try {
      // ✅ REPHRASE PROMPT (exactement comme Flowise)
      const chatHistoryText = recentHistory
        .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      const reformulationPrompt = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
${chatHistoryText}

Follow Up Input: ${question}

Standalone Question:`;

      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: reformulationPrompt }],
        max_tokens: 100,
        temperature: 0.3
      });

      const reformulated = response.choices[0]?.message?.content?.trim() || question;
      return reformulated;

    } catch (error) {
      logger.warn('⚠️ Erreur reformulation, utilisation question originale');
      return question;
    }
  }

  /**
   * Construire les messages avec prompt STRICT anti-hallucination
   * ORDRE IMPORTANT (comme Flowise):
   * 1. RÈGLES RAG CHAIN (techniques)
   * 2. PROMPT DASHBOARD (métier)
   * 3. CONTEXTE (documents)
   */
  private async buildStrictMessages(
    userMessage: string,
    conversationHistory: ChatMessage[],
    contextSources: string[]
  ): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Récupérer le prompt système actif depuis le dashboard
    let dashboardPrompt = '';
    try {
      const activePrompt = await systemPromptService.getActivePrompt();
      if (activePrompt && activePrompt.content) {
        dashboardPrompt = activePrompt.content;
        logger.info('✅ Prompt dashboard chargé (via RAG Chain)');
      }
    } catch (error) {
      logger.warn('⚠️ Erreur chargement prompt dashboard');
    }

    // Construire le contexte
    const contextBlock = this.buildContextBlock(contextSources);

    // RESPONSE PROMPT (COMME FLOWISE)
    // Prompt système dashboard + contexte (comme dans Flowise Response Prompt)
    const strictSystemPrompt = `${dashboardPrompt || 'Nom de l\'Assistant : BiblioBot\n\nInstruction :\nTu es un assistant virtuel dédié exclusivement aux services et ressources de la bibliothèque de emlyon.'}

${contextBlock}

RÈGLES DE RÉPONSE:
1. Utilise le contexte fourni pour répondre de manière précise et utile
2. FORMATAGE DES LIENS (OBLIGATOIRE):
   - TOUJOURS utiliser UNIQUEMENT le format Markdown pour les liens: [Texte descriptif](URL_complète)
   - JAMAIS générer du HTML (<a href=...), JAMAIS écrire l'URL complète en texte brut
   - Le texte du lien doit être court et descriptif (nom de la ressource, du service, etc.)
   - L'URL doit TOUJOURS être complète avec https://
   - Exemples CORRECTS:
     ✅ "Consultez [ENI Belearn](https://library.em-lyon.com/...)"
     ✅ "Accédez aux [ressources presse](https://library.em-lyon.com/Default/presse.aspx)"
     ✅ "[Télécharger Lean Library](https://download.leanlibrary.com/download-lean-library-em-lyon)"
   - Exemples INCORRECTS:
     ❌ "Consultez https://library.em-lyon.com/Default/doc/SYRACUSE/98582/..." (URL brute)
     ❌ '<a href="...">texte</a>' (HTML interdit)
     ❌ 'presse.aspx" target="_blank"...' (HTML malformé)
3. FORMATAGE DES LISTES:
   - Toujours aller à la ligne après deux-points (:)
   - Toujours aller à la ligne entre chaque élément numéroté
4. Longueur: Adapte la longueur selon le besoin (concis mais complet)
5. Sois naturel, conversationnel et professionnel`;

    messages.push({
      role: 'system',
      content: strictSystemPrompt
    });

    // Ajouter l'historique récent (max 6 messages = 3 échanges)
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      });
    }

    // Ajouter le message utilisateur actuel
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  /**
   * Construire le bloc de contexte
   */
  private buildContextBlock(sources: string[]): string {
    if (sources.length === 0) {
      return '\n=== CONTEXTE ===\nAucune information pertinente trouvée.\n================\n';
    }

    const contextItems = sources.map((source, index) => {
      return `${index + 1}. ${source}`;
    }).join('\n\n');

    return `
=== CONTEXTE FOURNI ===
${contextItems}
========================

Utilise UNIQUEMENT les informations ci-dessus pour répondre.`;
  }


  /**
   * Nettoyer la réponse (corriger les liens cassés, formatage, etc.)
   */
  private cleanResponse(response: string): string {
    let cleaned = response;

    // 0. ⚡ CRITIQUE: Supprimer TOUT code HTML malformé généré par erreur
    // Pattern 1: Fragments HTML orphelins comme 'presse.aspx" target="_blank" rel="noopener noreferrer" class="bot-link">texte'
    // Ces fragments apparaissent quand le LLM génère du HTML au lieu de Markdown
    cleaned = cleaned.replace(/[a-zA-Z0-9\-_.]+\.(?:aspx|html|php|htm)["'][^>]*>([^<\n]+)/g, '$1');
    
    // Pattern 2: Balises <a> complètes mal formées (sans href ou href cassé)
    // Ex: <a href="presse.aspx">texte</a> → [texte](presse.aspx)
    cleaned = cleaned.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi, '[$2]($1)');
    
    // Pattern 3: Balises HTML orphelines (ouverture ou fermeture seules)
    cleaned = cleaned.replace(/<\/?a[^>]*>/gi, '');
    
    // Pattern 4: Attributs HTML orphelins (target="_blank", rel=..., class=...)
    cleaned = cleaned.replace(/(?:target|rel|class)=["'][^"']*["']/gi, '');

    // 1. S'assurer que les deux-points sont suivis d'un saut de ligne double
    // Ex: "Voici: liste" → "Voici:\n\nliste"
    cleaned = cleaned.replace(/:(?!\n\n)(\s*)/g, ':\n\n');

    // 2. S'assurer que les éléments de liste numérotée sont sur une nouvelle ligne
    // Ex: "1. Item 2. Item" → "1. Item\n2. Item"
    // On cherche un chiffre suivi d'un point, précédé d'espace mais pas de saut de ligne
    cleaned = cleaned.replace(/(?<!\n)(\s+)(\d+\.)/g, '\n$2');

    // 3. S'assurer qu'il y a un espace après le numéro de liste
    // Ex: "1.Item" → "1. Item"
    cleaned = cleaned.replace(/(\d+\.)([^\s])/g, '$1 $2');

    // 4. Corriger les liens Markdown mal formatés
    // Ex: [texte]https://url → [texte](https://url)
    cleaned = cleaned.replace(/\[([^\]]+)\](https?:\/\/[^\s)]+)/g, '[$1]($2)');

    // 5. Corriger les espaces dans les emails
    // Ex: library@ em-lyon.com → library@em-lyon.com
    cleaned = cleaned.replace(/(\w+)@\s+(\S+)/g, '$1@$2');

    // 6. S'assurer que les emails library ont le bon format
    cleaned = cleaned.replace(/library\s*@\s*em-lyon\.com/gi, 'library@em-lyon.com');

    // 7. ⚡ CORRIGER URLs PROTOCOLE-RELATIVE (//domain.com → https://domain.com)
    // CRITIQUE: Évite que les liens deviennent relatifs et cassés dans le frontend
    cleaned = cleaned.replace(/\[([^\]]+)\]\((\/\/[^)]+)\)/g, '[$1](https:$2)');
    cleaned = cleaned.replace(/(?<!https?:)(\/\/[a-zA-Z0-9][^\s)]*)/g, 'https:$1');

    // 8. Corriger les URLs seules avec parenthèses inutiles (mais pas dans Markdown)
    // Ex: (https://url.com) qui n'est pas précédé de ] → https://url.com
    cleaned = cleaned.replace(/(?<!\])\((https?:\/\/[^\s)]+)\)/g, '$1');

    // 9. Enlever les doubles espaces MAIS GARDER les sauts de ligne
    // On remplace seulement les espaces horizontaux multiples par un seul espace
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

    // 10. S'assurer qu'il n'y a pas plus de 2 sauts de ligne consécutifs
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 11. Trim
    cleaned = cleaned.trim();

    return cleaned;
  }
}

// Instance singleton
export const ragChainService = new RAGChainService();
export default ragChainService;
