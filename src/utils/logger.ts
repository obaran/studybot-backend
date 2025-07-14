// =============================================================================
// STUDYBOT BACKEND - SYSTÈME DE LOGGING
// =============================================================================

import winston from 'winston';
import { config } from '@/config';

// Note: Le dossier logs sera créé automatiquement par Winston si nécessaire

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Ajouter la stack trace pour les erreurs
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Ajouter les métadonnées s'il y en a
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Format pour la console (avec couleurs)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// Configuration des transports
const transports: winston.transport[] = [
  // Console (toujours actif en développement)
  new winston.transports.Console({
    level: config.server.nodeEnv === 'production' ? 'warn' : 'debug',
    format: consoleFormat
  })
];

// Fichier de log (seulement en production ou si spécifié)
if (config.server.nodeEnv === 'production' || process.env.LOG_TO_FILE === 'true') {
  transports.push(
    new winston.transports.File({
      filename: config.logging.file,
      level: config.logging.level,
      format: customFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  );
}

// Créer le logger
export const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  defaultMeta: {
    service: 'studybot-backend'
  },
  transports,
  // Ne pas sortir sur stderr en cas d'erreur (évite les doublons)
  exitOnError: false
});

// Méthodes utilitaires pour différents types de logs
export const logRequest = (method: string, url: string, userId?: string): void => {
  logger.info(`${method} ${url}`, {
    type: 'request',
    method,
    url,
    userId
  });
};

export const logResponse = (
  method: string, 
  url: string, 
  statusCode: number, 
  responseTime: number,
  userId?: string
): void => {
  logger.info(`${method} ${url} - ${statusCode} (${responseTime}ms)`, {
    type: 'response',
    method,
    url,
    statusCode,
    responseTime,
    userId
  });
};

export const logError = (
  error: Error, 
  context?: Record<string, any>
): void => {
  logger.error(error.message, {
    type: 'error',
    error: error.name,
    stack: error.stack,
    ...context
  });
};

export const logOpenAI = (
  action: string,
  model: string,
  tokensUsed: number,
  responseTime: number,
  userId?: string
): void => {
  logger.info(`OpenAI ${action} - ${model} (${tokensUsed} tokens, ${responseTime}ms)`, {
    type: 'openai',
    action,
    model,
    tokensUsed,
    responseTime,
    userId
  });
};

export const logQdrant = (
  action: string,
  collection: string,
  resultsCount: number,
  responseTime: number
): void => {
  logger.info(`Qdrant ${action} - ${collection} (${resultsCount} results, ${responseTime}ms)`, {
    type: 'qdrant',
    action,
    collection,
    resultsCount,
    responseTime
  });
};

export const logAuth = (
  action: string,
  userId: string,
  success: boolean,
  ipAddress?: string
): void => {
  const level = success ? 'info' : 'warn';
  logger[level](`Auth ${action} - ${userId} (${success ? 'success' : 'failed'})`, {
    type: 'auth',
    action,
    userId,
    success,
    ipAddress
  });
};

// Fonction pour changer le niveau de log à chaud
export const setLogLevel = (level: string): void => {
  logger.level = level;
  logger.info(`Niveau de log changé vers: ${level}`);
};

export default logger; 