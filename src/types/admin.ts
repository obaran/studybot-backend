// Types pour l'API Admin Backend - StudyBot

// =============================================================================
// TYPES DE BASE
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
  timestamp: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// CONVERSATIONS
// =============================================================================

export interface User {
  id: string;
  sessionId: string;
  identifier: string; // Ex: "Étudiant BBA2"
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface Message {
  id: string;
  sessionId: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    responseTime?: number;
    sources?: string[];
  };
}

export interface Feedback {
  id: string;
  messageId: string;
  sessionId: string;
  type: 'positive' | 'negative';
  comment?: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  sessionId: string;
  user: User;
  messages: Message[];
  feedback?: Feedback[];
  status: 'active' | 'completed' | 'expired';
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  lastMessage: string;
  lastMessageTime: Date;
  averageResponseTime?: number;
  totalTokensUsed?: number;
}

export interface ConversationFilters extends PaginationQuery {
  status?: 'active' | 'completed' | 'expired' | 'all';
  feedback?: 'positive' | 'negative' | 'none' | 'all';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  userIdentifier?: string;
}

export interface ConversationSearchQuery {
  q: string;
  status?: string;
  feedback?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

// =============================================================================
// SYSTÈME PROMPT
// =============================================================================

export interface SystemPrompt {
  id: string;
  content: string;
  version: string;
  status: 'active' | 'draft' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  activatedAt?: Date;
  description?: string;
  tags?: string[];
}

export interface CreateSystemPromptRequest {
  content: string;
  description?: string;
  tags?: string[];
}

export interface UpdateSystemPromptRequest {
  content?: string;
  description?: string;
  tags?: string[];
  changeSummary?: string;
}

export interface SystemPromptHistory {
  id: string;
  promptId: string;
  version: string;
  content: string;
  changedBy: string;
  changeSummary: string;
  timestamp: Date;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface BotConfiguration {
  id: string;
  welcomeMessage: string;
  footerText: string;
  footerLink?: string;
  botAvatarUrl?: string;
  userAvatarUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface UpdateConfigurationRequest {
  welcomeMessage?: string;
  footerText?: string;
  footerLink?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface FileUploadResponse {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

export interface IntegrationLinks {
  uniqueToken: string;
  directLink: string;
  iframeCode: string;
  embedCode: string;
  generatedAt: Date;
}

// =============================================================================
// UTILISATEURS ADMIN
// =============================================================================

export type AdminPermission = 'conversations' | 'analytics' | 'configuration' | 'users' | 'system-prompt';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'moderator';
  status: 'active' | 'pending' | 'suspended';
  permissions: AdminPermission[];
  createdAt: Date;
  lastLoginAt?: Date;
  invitedBy?: string;
  passwordHash?: string; // Only for internal use
}

export interface CreateAdminUserRequest {
  name: string;
  email: string;
  role: 'admin' | 'moderator';
  permissions: AdminPermission[];
}

export interface UpdateAdminUserRequest {
  name?: string;
  role?: 'admin' | 'moderator';
  permissions?: AdminPermission[];
  status?: 'active' | 'suspended';
}

// =============================================================================
// ANALYTICS
// =============================================================================

export interface DashboardMetrics {
  totalConversations: number;
  todayMessages: number;
  averageRating: number;
  activeUsers: number;
  totalTokensUsed: number;
  estimatedCost: number;
  activeSessions: number;
  peakUsageTime: string;
  averageResponseTime: number;
  costSavings: number;
}

export interface UsageStatistics {
  date: string;
  conversations: number;
  messages: number;
  tokensUsed: number;
  uniqueUsers: number;
  positiveFeedback: number;
  negativeFeedback: number;
}

export interface AnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

// =============================================================================
// AUTHENTIFICATION
// =============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Omit<AdminUser, 'passwordHash'>; // Sans le hash du mot de passe
  expiresAt: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  permissions: AdminPermission[];
  iat: number;
  exp: number;
}

// =============================================================================
// REQUEST/RESPONSE HELPERS
// =============================================================================

export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
    permissions: AdminPermission[];
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
  timestamp: string;
}

// =============================================================================
// DATABASE MODELS (pour Mongoose si utilisé)
// =============================================================================

export interface ConversationDocument extends Omit<Conversation, 'id'> {
  _id: string;
}

export interface MessageDocument extends Omit<Message, 'id'> {
  _id: string;
}

export interface FeedbackDocument extends Omit<Feedback, 'id'> {
  _id: string;
}

export interface UserDocument extends Omit<User, 'id'> {
  _id: string;
}

export interface SystemPromptDocument extends Omit<SystemPrompt, 'id'> {
  _id: string;
}

export interface AdminUserDocument extends Omit<AdminUser, 'id'> {
  _id: string;
}

export interface BotConfigurationDocument extends Omit<BotConfiguration, 'id'> {
  _id: string;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const VALIDATION_RULES = {
  pagination: {
    maxLimit: 100,
    defaultLimit: 20,
    defaultPage: 1
  },
  systemPrompt: {
    maxContentLength: 10000,
    maxDescriptionLength: 500,
    maxTagsCount: 10
  },
  configuration: {
    maxWelcomeMessageLength: 1000,
    maxFooterTextLength: 200
  },
  search: {
    minQueryLength: 2,
    maxQueryLength: 100,
    maxResultsLimit: 100
  },
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
} as const;

// =============================================================================
// ERROR CODES
// =============================================================================

export enum ErrorCodes {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  FORBIDDEN = 'FORBIDDEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_PAGINATION = 'INVALID_PAGINATION',
  INVALID_FILTERS = 'INVALID_FILTERS',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // System Prompt
  ACTIVE_PROMPT_REQUIRED = 'ACTIVE_PROMPT_REQUIRED',
  CANNOT_DELETE_ACTIVE_PROMPT = 'CANNOT_DELETE_ACTIVE_PROMPT',

  // File Upload
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // Internal
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type APIHandler<T = any> = (
  req: any,
  res: any,
  next?: any
) => Promise<ApiResponse<T> | void>;

export type Middleware = (req: any, res: any, next: any) => void | Promise<void>;

export type ConversationStatus = Conversation['status'];
export type FeedbackType = Feedback['type'];
export type AdminRole = AdminUser['role'];
export type AdminStatus = AdminUser['status'];
export type PromptStatus = SystemPrompt['status']; 