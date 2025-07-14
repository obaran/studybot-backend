// =============================================================================
// STUDYBOT BACKEND - SERVICE AZURE OPENAI
// =============================================================================

import { OpenAI } from 'openai';
import { config } from '@/config';
import { logOpenAI, logError } from '@/utils/logger';
import { errors } from '@/middleware/errorHandler';
import { ChatMessage, ChatResponse } from '@/types';

// Interface pour les messages OpenAI
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Configuration du client OpenAI pour Azure
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  baseURL: `${config.openai.endpoint}openai/deployments/${config.openai.deploymentName}`,
  defaultQuery: { 'api-version': config.openai.apiVersion },
  defaultHeaders: {
    'api-key': config.openai.apiKey,
  },
});

class OpenAIService {
  private readonly systemPrompt = `### Nom de l'Assistant : Studybot

**Instruction :**
Utilisez exclusivement la base de données de questions-réponses fournie pour répondre aux questions des étudiants. Si une question dépasse les limites de ces données, guidez l'étudiant avec courtoisie mais fermeté pour recentrer l'attention sur les thèmes couverts par la FAQ.

Pour les questions concernant les informations personnelles à ne pas transmettre, utilisez la réponse suivante : "Veuillez éviter de partager des informations personnelles telles que votre numéro de sécurité sociale, vos informations bancaires, ou tout autre renseignement confidentiel."

Tu précèdera toutes tes réponse par ce caractère: ֍

Tu es polyglotte répondra donc dans la langue de l'étudiant, exemple : répondre en anglais à un message reçu en anglais. 

Dans tes réponses, tu évitera systématiquement l'usage de l'écriture inclusive

Lorsque l'étudiant pose une question sur son programme ou sa classe, proposer les choix des classes et après que l'étudiant ait sélectionné l'une des options, le chatbot répond avec l'information appropriée liée à sa classe.

**Réponse :**
Toutes les réponses doivent être strictement basées sur le contenu de la FAQ et des données fournies. Si une question ne trouve pas de réponse dans ces données, employez la phrase suivante pour orienter positivement l'étudiant : "Cette question est intéressante, mais elle s'étend au-delà de notre base de données actuelle. Concentrons-nous sur [sujet spécifique de la FAQ] pour maximiser votre compréhension et votre performance."

**Note Importante :**
Assurez-vous de ne jamais extrapoler ou fournir des informations non vérifiables à partir des données de la FAQ. Maintenez toujours une attitude professionnelle et éducative pour encourager un environnement d'apprentissage productif et respectueux.

**Informations spécifiques mises à jour :**

Lorsqu'un étudiant demande des informations sur les contacts de coordinateurs ou mentionne le campus de Saint-Étienne, veillez à lui fournir uniquement les informations pour Lyon et Paris car le campus de Saint-Étienne a fermé.

Réponse pour les contacts de coordinateurs :
- BBA1 French Track : Béa Barrière (barriere@em-lyon.com)
- BBA1 English Track : Eléa Baucheron (baucheron@em-lyon.com)
- BBA2 (tous tracks confondus) : Coralie Coriasco (coriacso@em-lyon.com)
- BBA3 : Benjamin Catel (catel@em-lyon.com)
- BBA4 Lyon (Classiques + Alternants Lyon) : Léa Desplanches (desplanches@em-lyon.com)
- BBA4 Paris (Classiques + Alternants Paris) : Lucas Pastori (pastori@em-lyon.com)

Si la question porte sur les dates importantes, ajoute le lien : https://makersboard.me/mon-agenda

Pour les justificatifs d'absence, oriente vers Edusign : https://edusign.app/school
Exceptions pour cours de sport : SPORTCENTER@em-lyon.com
Exceptions pour cours de langues : langues-bba@em-lyon.com

Absences autorisées en langue : "Vous disposez de deux absences autorisées par semestre et par cours de langue. Au-delà, rattrapage obligatoire avec note plafonnée à 10."

Horaires bibliothèque Lyon : 9h-22h du lundi au vendredi, 10h-16h le samedi
Horaires bibliothèque Paris : 7h00-22h00 du lundi au samedi

Le logiciel anti-plagiat est Turnitin (et non plus Ouriginal)

Liens d'impression :
- Lyon: https://print-lyo.em-lyon.com
- Paris: https://print-par.em-lyon.com

Pour Paris : Le Makers Lab se trouve au 3ème étage. Ne plus mentionner l'entrée avenue Legravérend.

Infirmières Lyon : Anouk Chaumentin et Valérie Mimiette
Paris (distanciel uniquement) :
- Consultations médicales : Anouk Chaumentin et Valérie Mimiette (calendly.com/chaumentin et calendly.com/mimiette-em-lyon)
- Soutien psychologique : Tara Panayis (mardi 13h-17h, rdv.apsytude@gmail.com)
- Hotline psychologique 24/7 : 01 84 78 27 07
- Nightline 21h-2h30 : FR 01 88 32 12 32, ENG 01 88 32 12 33
- Handicap : Maxence Rogue (calendly.com/rogue-maxence)
- Problématique sociale : Bérangère Martin (emsocial@interface-es.fr)`;

  /**
   * Générer une réponse de chat avec Azure OpenAI
   */
  async generateChatResponse(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    contextSources: string[] = [],
    sessionId: string
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Construire le contexte à partir des sources
      const contextPrompt = this.buildContextPrompt(contextSources);
      
      // Construire l'historique de conversation
      const messages = this.buildMessages(
        userMessage,
        conversationHistory,
        contextPrompt
      );

      // Appel à Azure OpenAI
      const completion = await openai.chat.completions.create({
        model: config.openai.model,
        messages,
        max_tokens: 800,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.0,
        presence_penalty: 0.6,
        stream: false,
      });

      const responseTime = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Logger la requête OpenAI
      logOpenAI(
        'chat_completion',
        config.openai.model,
        tokensUsed,
        responseTime,
        sessionId
      );

      return {
        response,
        sessionId,
        messageId,
        tokensUsed,
        model: config.openai.model,
        responseTime,
        sources: contextSources
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logError(error as Error, {
        service: 'openai',
        action: 'generateChatResponse',
        sessionId,
        responseTime
      });

      // Gestion des erreurs spécifiques OpenAI
      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          throw errors.OPENAI_QUOTA_EXCEEDED;
        }
        if (error.message.includes('rate')) {
          throw errors.RATE_LIMIT_EXCEEDED;
        }
      }

      throw errors.OPENAI_ERROR;
    }
  }

  /**
   * Construire le prompt de contexte à partir des sources
   */
  private buildContextPrompt(sources: string[]): string {
    if (sources.length === 0) {
      return '';
    }

    return `
CONTEXTE DISPONIBLE :
${sources.map((source, index) => `${index + 1}. ${source}`).join('\n')}

Utilise ces informations pour répondre à la question de l'étudiant. Si les informations ne sont pas suffisantes, dis-le clairement.
`;
  }

  /**
   * Construire les messages pour OpenAI
   */
  private buildMessages(
    userMessage: string,
    conversationHistory: ChatMessage[],
    contextPrompt: string
  ): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    // Message système avec le contexte
    let systemContent = this.systemPrompt;
    if (contextPrompt) {
      systemContent += '\n\n' + contextPrompt;
    }

    messages.push({
      role: 'system',
      content: systemContent
    });

    // Ajouter l'historique récent (derniers 10 messages max)
    const recentHistory = conversationHistory.slice(-10);
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
   * Générer un embedding pour un texte (pour la recherche vectorielle)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Client OpenAI séparé pour les embeddings
      const embeddingClient = new OpenAI({
        apiKey: config.openai.embeddingApiKey,
        baseURL: `${config.openai.embeddingEndpoint}openai/deployments/${config.openai.embeddingDeploymentName}`,
        defaultQuery: { 'api-version': config.openai.embeddingApiVersion },
        defaultHeaders: {
          'api-key': config.openai.embeddingApiKey,
        },
      });

      const response = await embeddingClient.embeddings.create({
        model: config.openai.embeddingModel,
        input: text,
      });

      return response.data[0].embedding;

    } catch (error) {
      logError(error as Error, {
        service: 'openai',
        action: 'generateEmbedding',
        textLength: text.length,
        embeddingModel: config.openai.embeddingModel,
        embeddingDeployment: config.openai.embeddingDeploymentName
      });

      throw errors.OPENAI_ERROR;
    }
  }

  /**
   * Tester la connexion Azure OpenAI
   */
  async testConnection(): Promise<{ success: boolean; model: string; endpoint: string }> {
    try {
      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'user', content: 'Test de connexion. Réponds juste "OK".' }
        ],
        max_tokens: 10,
        temperature: 0
      });

      const isWorking = response.choices[0]?.message?.content?.includes('OK') || false;

      return {
        success: isWorking,
        model: config.openai.model,
        endpoint: config.openai.endpoint
      };

    } catch (error) {
      logError(error as Error, {
        service: 'openai',
        action: 'testConnection'
      });

      return {
        success: false,
        model: config.openai.model,
        endpoint: config.openai.endpoint
      };
    }
  }
}

// Instance singleton
export const openaiService = new OpenAIService();
export default openaiService; 