// =============================================================================
// BIBLIOBOT BACKEND - CONTROLLER DOCUMENTS
// =============================================================================

import { Request, Response } from 'express';
import { qdrantService } from '@/services/qdrantService';
import { openaiService } from '@/services/openaiService';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Découper un texte en chunks
 */
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    
    // Avancer d'au moins 1 caractère pour éviter les boucles infinies
    const step = Math.max(1, chunkSize - overlap);
    start += step;
    
    // Sécurité : si on a dépassé la fin, arrêter
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Upload un document texte dans Qdrant
 */
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const { content, filename, metadata = {} } = req.body;

    if (!content || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Content and filename are required'
      });
    }

    logger.info(`📄 Upload document: ${filename}`);

    // Générer un ID unique pour le document
    const documentId = uuidv4();

    // Découper le texte en chunks
    const chunks = chunkText(content);
    logger.info(`✂️ Document découpé en ${chunks.length} chunks`);

    // Générer les embeddings et uploader dans Qdrant
    const points = [];
    
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        logger.info(`📝 Traitement chunk ${i + 1}/${chunks.length}...`);
        
        // Générer l'embedding
        const embedding = await openaiService.generateEmbedding(chunk);
        
        logger.info(`🔢 Embedding généré: ${embedding.length} dimensions`);

        // Créer le point Qdrant
        const point = {
          id: uuidv4(),
          vector: {
            text: embedding,  // Dense vector
            sparse_text: { indices: [], values: [] }  // Sparse vector vide (pour hybrid search)
          },
          payload: {
            document_id: documentId,
            filename: filename,
            chunk_index: i,
            total_chunks: chunks.length,
            content: chunk,
            upload_date: new Date().toISOString(),
            ...metadata
          }
        };
        
        points.push(point);
        logger.info(`✅ Chunk ${i + 1}/${chunks.length} processed`);
      }

      logger.info(`📤 Upload de ${points.length} points dans Qdrant...`);
      
      // Uploader tous les points dans Qdrant
      await qdrantService.upsertPoints(points);
    } catch (error: any) {
      logger.error(`❌ Erreur lors du traitement: ${error.message}`);
      throw error;
    }

    logger.info(`🎉 Document ${filename} uploadé avec succès (${chunks.length} chunks`);

    return res.json({
      success: true,
      data: {
        documentId,
        filename,
        chunksCount: chunks.length,
        message: 'Document uploaded successfully'
      }
    });

  } catch (error: any) {
    logger.error('❌ Erreur upload document:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error uploading document'
    });
  }
};

/**
 * Lister tous les documents
 */
export const listDocuments = async (_req: Request, res: Response) => {
  try {
    const documents = await qdrantService.listDocuments();

    return res.json({
      success: true,
      data: documents
    });

  } catch (error: any) {
    logger.error('❌ Erreur liste documents:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error listing documents'
    });
  }
};

/**
 * Supprimer un document
 */
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
    }

    await qdrantService.deleteDocument(documentId);

    logger.info(`🗑️ Document ${documentId} supprimé`);

    return res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error: any) {
    logger.error('❌ Erreur suppression document:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error deleting document'
    });
  }
};
