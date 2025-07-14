// =============================================================================
// STUDYBOT BACKEND - TYPES TYPESCRIPT
// =============================================================================

import { Request } from 'express';

// Utilisateur Admin
export interface AdminUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'super_admin';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Session de chat
export interface ChatSession {
  id: string;
  sessionId: string;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  chatbot: 'studybot' | 'bibliobot';
  startedAt: Date;
  endedAt?: Date;
  messageCount: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

// Message de chat
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  model?: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}

// Feedback utilisateur
export interface UserFeedback {
  id: string;
  sessionId: string;
  messageId?: string;
  type: 'thumbs_up' | 'thumbs_down' | 'rating' | 'comment';
  value: string | number;
  comment?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Requête chat
export interface ChatRequest {
  message: string;
  sessionId?: string;
  chatbot: 'studybot' | 'bibliobot';
  context?: Record<string, any>;
}

// Réponse chat
export interface ChatResponse {
  response: string;
  sessionId: string;
  messageId: string;
  tokensUsed: number;
  model: string;
  responseTime: number;
  sources?: string[];
}

// Configuration OpenAI
export interface OpenAIConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deploymentName: string;
  model: string;
  // Configuration pour les embeddings
  embeddingEndpoint: string;
  embeddingApiKey: string;
  embeddingApiVersion: string;
  embeddingDeploymentName: string;
  embeddingModel: string;
}

// Configuration Qdrant
export interface QdrantConfig {
  url: string;
  apiKey: string;
  collectionName: string;
}

// Configuration base de données
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Request avec utilisateur authentifié
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Statistiques dashboard
export interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  averageResponseTime: number;
  tokensUsedToday: number;
  tokensUsedMonth: number;
  topQuestions: Array<{
    question: string;
    count: number;
  }>;
  userSatisfaction: {
    thumbsUp: number;
    thumbsDown: number;
    averageRating: number;
  };
}

// Résultat de recherche vectorielle
export interface VectorSearchResult {
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

// Configuration du serveur
export interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
}

// Erreur API personnalisée
export interface APIError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

// Réponse API standardisée
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  };
} 