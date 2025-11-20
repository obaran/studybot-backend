// =============================================================================
// BIBLIOBOT BACKEND - ROUTES DOCUMENTS
// =============================================================================

import { Router } from 'express';
import * as documentController from '@/controllers/documentController';

const router = Router();

/**
 * @route   POST /api/documents/upload
 * @desc    Upload un document texte dans Qdrant
 * @access  Public (à sécuriser plus tard)
 * @body    { content: string, filename: string, metadata?: object }
 */
router.post('/upload', documentController.uploadDocument);

/**
 * @route   GET /api/documents
 * @desc    Lister tous les documents
 * @access  Public (à sécuriser plus tard)
 */
router.get('/', documentController.listDocuments);

/**
 * @route   DELETE /api/documents/:documentId
 * @desc    Supprimer un document
 * @access  Public (à sécuriser plus tard)
 */
router.delete('/:documentId', documentController.deleteDocument);

export default router;
