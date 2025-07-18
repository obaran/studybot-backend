// =============================================================================
// STUDYBOT BACKEND - SERVICE QDRANT VECTOR DATABASE
// =============================================================================

import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '@/config';
import { logQdrant, logError } from '@/utils/logger';
import { errors } from '@/middleware/errorHandler';
import { VectorSearchResult } from '@/types';
import { openaiService } from './openaiService';

// Types pour travailler avec l'API Qdrant réelle

// Configuration du client Qdrant
const qdrantClient = new QdrantClient({
  url: config.qdrant.url,
  apiKey: config.qdrant.apiKey,
  checkCompatibility: false, // Désactive la vérification de compatibilité client-serveur
});

class QdrantService {
  private readonly collectionName = config.qdrant.collectionName;

  /**
   * Rechercher dans la base de connaissances vectorielle
   */
  async searchSimilarContent(
    query: string,
    limit: number = 5,
    scoreThreshold: number = 0.4
  ): Promise<VectorSearchResult[]> {
    const startTime = Date.now();

    try {
      // Générer l'embedding de la requête
      const queryVector = await openaiService.generateEmbedding(query);

      // Recherche dans Qdrant
      const searchResult = await qdrantClient.search(this.collectionName, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      });

      const responseTime = Date.now() - startTime;

      // Logger la recherche
      logQdrant(
        'vector_search',
        this.collectionName,
        searchResult.length,
        responseTime
      );

      // Convertir les résultats
      return searchResult.map((result) => {
        const payload = result.payload as any || {};
        return {
          content: payload.content || '',
          score: result.score,
          metadata: {
            source: payload.source,
            title: payload.title,
            url: payload.url,
            id: result.id,
            ...payload
          }
        };
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logError(error as Error, {
        service: 'qdrant',
        action: 'searchSimilarContent',
        query: query.substring(0, 100),
        responseTime
      });

      // Gestion des erreurs spécifiques Qdrant
      if (error instanceof Error) {
        if (error.message.includes('collection') && error.message.includes('not found')) {
          throw new Error(`Collection Qdrant "${this.collectionName}" non trouvée`);
        }
        if (error.message.includes('connection')) {
          throw errors.QDRANT_CONNECTION_ERROR;
        }
      }

      throw errors.QDRANT_ERROR;
    }
  }

  /**
   * Rechercher du contenu pour un chatbot spécifique
   */
  async searchForChatbot(
    query: string,
    chatbotType: 'studybot' | 'bibliobot',
    limit: number = 3
  ): Promise<VectorSearchResult[]> {
    try {
      // Recherche générale
      const results = await this.searchSimilarContent(query, limit * 2, 0.4);

      // Filtrer selon le type de chatbot si nécessaire
      let filteredResults = results;
      
      if (chatbotType === 'bibliobot') {
        // Pour Bibliobot, prioriser le contenu de la bibliothèque
        filteredResults = results.filter(result => 
          result.metadata?.source?.toLowerCase().includes('biblioth') ||
          result.metadata?.title?.toLowerCase().includes('biblioth') ||
          result.content.toLowerCase().includes('biblioth')
        );
        
        // Si pas assez de résultats spécifiques, compléter avec d'autres
        if (filteredResults.length < limit) {
          const otherResults = results.filter(result => !filteredResults.includes(result));
          filteredResults = [...filteredResults, ...otherResults];
        }
      }

      return filteredResults.slice(0, limit);

    } catch (error) {
      logError(error as Error, {
        service: 'qdrant',
        action: 'searchForChatbot',
        chatbotType,
        query: query.substring(0, 100)
      });

      throw error;
    }
  }

  /**
   * Obtenir des informations sur la collection
   */
  async getCollectionInfo(): Promise<{
    name: string;
    pointsCount: number;
    vectorSize: number;
    status: string;
  }> {
    try {
      const collectionInfo = await qdrantClient.getCollection(this.collectionName);
      
      const vectorsConfig = collectionInfo.config?.params?.vectors;
      let vectorSize = 0;
      
      if (typeof vectorsConfig === 'object' && vectorsConfig && 'size' in vectorsConfig) {
        vectorSize = (vectorsConfig as any).size || 0;
      }

      return {
        name: this.collectionName,
        pointsCount: collectionInfo.points_count || 0,
        vectorSize,
        status: collectionInfo.status || 'unknown'
      };

    } catch (error) {
      logError(error as Error, {
        service: 'qdrant',
        action: 'getCollectionInfo'
      });

      throw errors.QDRANT_ERROR;
    }
  }

  /**
   * Tester la connexion Qdrant
   */
  async testConnection(): Promise<{
    success: boolean;
    collectionExists: boolean;
    pointsCount: number;
    url: string;
  }> {
    try {
      // Tester la connexion générale
      const collections = await qdrantClient.getCollections();
      
      // Vérifier si notre collection existe
      const collectionExists = collections.collections.some(
        col => col.name === this.collectionName
      );

      let pointsCount = 0;
      if (collectionExists) {
        const info = await this.getCollectionInfo();
        pointsCount = info.pointsCount;
      }

      return {
        success: true,
        collectionExists,
        pointsCount,
        url: config.qdrant.url
      };

    } catch (error) {
      logError(error as Error, {
        service: 'qdrant',
        action: 'testConnection'
      });

      return {
        success: false,
        collectionExists: false,
        pointsCount: 0,
        url: config.qdrant.url
      };
    }
  }

  /**
   * Ajouter du contenu à la collection (pour l'administration future)
   */
  async addContent(
    content: string,
    metadata: {
      source?: string;
      title?: string;
      url?: string;
      [key: string]: any;
    } = {}
  ): Promise<string> {
    try {
      // Générer l'embedding
      const vector = await openaiService.generateEmbedding(content);
      
      // Générer un ID unique
      const pointId = `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Ajouter le point à Qdrant
      await qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: pointId,
            vector,
            payload: {
              content,
              timestamp: new Date().toISOString(),
              ...metadata
            }
          }
        ]
      });

      logQdrant('add_content', this.collectionName, 1, 0);

      return pointId;

    } catch (error) {
      logError(error as Error, {
        service: 'qdrant',
        action: 'addContent',
        contentLength: content.length
      });

      throw errors.QDRANT_ERROR;
    }
  }
}

// Instance singleton
export const qdrantService = new QdrantService();
export default qdrantService; 