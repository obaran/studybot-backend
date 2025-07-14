// =============================================================================
// STUDYBOT BACKEND - MIDDLEWARE GESTION D'ERREURS
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { logError } from '@/utils/logger';
import { APIError, APIResponse } from '@/types';

// Classe d'erreur personnalisée
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Fonction pour créer une erreur API standardisée
export const createAPIError = (
  message: string,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR',
  details?: any
): APIError => ({
  code,
  message,
  statusCode,
  details
});

// Fonction pour créer une réponse d'erreur standardisée
export const createErrorResponse = (
  error: APIError,
  requestId?: string
): APIResponse => ({
  success: false,
  error,
  metadata: {
    timestamp: new Date().toISOString(),
    requestId: requestId || 'unknown'
  }
});

// Middleware de gestion des erreurs
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Une erreur interne s\'est produite';
  let details;

  // Si c'est une AppError personnalisée
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
  }
  // Erreurs de validation Joi
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Données invalides';
    details = error.message;
  }
  // Erreurs JWT
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Token d\'authentification invalide';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token d\'authentification expiré';
  }
  // Erreurs de base de données MySQL
  else if (error.message.includes('ER_DUP_ENTRY')) {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Cette ressource existe déjà';
  }
  else if (error.message.includes('ER_NO_REFERENCED_ROW')) {
    statusCode = 400;
    code = 'FOREIGN_KEY_ERROR';
    message = 'Référence invalide';
  }
  // Erreurs de parsing JSON
  else if (error instanceof SyntaxError && error.message.includes('JSON')) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Format JSON invalide';
  }
  // Erreurs CORS
  else if (error.message.includes('CORS')) {
    statusCode = 403;
    code = 'CORS_ERROR';
    message = 'Origine non autorisée par CORS';
  }

  // Logger l'erreur
  logError(error, {
    requestId: (req as any).requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id
  });

  // Créer la réponse d'erreur
  const apiError = createAPIError(message, statusCode, code, details);
  const errorResponse = createErrorResponse(apiError, (req as any).requestId);

  // En développement, inclure la stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error!.details = {
      stack: error.stack,
      ...errorResponse.error!.details
    };
  }

  res.status(statusCode).json(errorResponse);
};

// Middleware pour capturer les erreurs asynchrones
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Erreurs prédéfinies courantes
export const errors = {
  // Authentification
  UNAUTHORIZED: new AppError('Non autorisé', 401, 'UNAUTHORIZED'),
  FORBIDDEN: new AppError('Accès interdit', 403, 'FORBIDDEN'),
  INVALID_CREDENTIALS: new AppError('Identifiants invalides', 401, 'INVALID_CREDENTIALS'),
  
  // Validation
  MISSING_REQUIRED_FIELDS: new AppError('Champs obligatoires manquants', 400, 'MISSING_REQUIRED_FIELDS'),
  INVALID_INPUT: new AppError('Données d\'entrée invalides', 400, 'INVALID_INPUT'),
  
  // Ressources
  NOT_FOUND: new AppError('Ressource non trouvée', 404, 'NOT_FOUND'),
  ALREADY_EXISTS: new AppError('Ressource déjà existante', 409, 'ALREADY_EXISTS'),
  
  // Sessions
  SESSION_NOT_FOUND: new AppError('Session non trouvée', 404, 'SESSION_NOT_FOUND'),
  SESSION_EXPIRED: new AppError('Session expirée', 401, 'SESSION_EXPIRED'),
  
  // OpenAI
  OPENAI_ERROR: new AppError('Erreur du service OpenAI', 502, 'OPENAI_ERROR'),
  OPENAI_QUOTA_EXCEEDED: new AppError('Quota OpenAI dépassé', 429, 'OPENAI_QUOTA_EXCEEDED'),
  
  // Qdrant
  QDRANT_ERROR: new AppError('Erreur du service Qdrant', 502, 'QDRANT_ERROR'),
  QDRANT_CONNECTION_ERROR: new AppError('Impossible de se connecter à Qdrant', 503, 'QDRANT_CONNECTION_ERROR'),
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: new AppError('Trop de requêtes', 429, 'RATE_LIMIT_EXCEEDED'),
  
  // Base de données
  DATABASE_ERROR: new AppError('Erreur de base de données', 500, 'DATABASE_ERROR'),
  DATABASE_CONNECTION_ERROR: new AppError('Impossible de se connecter à la base de données', 503, 'DATABASE_CONNECTION_ERROR')
};

export default errorHandler; 