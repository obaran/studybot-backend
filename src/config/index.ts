// =============================================================================
// STUDYBOT BACKEND - CONFIGURATION
// =============================================================================

import dotenv from 'dotenv';
import { 
  OpenAIConfig, 
  QdrantConfig, 
  DatabaseConfig, 
  ServerConfig 
} from '@/types';

// Charger les variables d'environnement
dotenv.config();

// Validation des variables d'environnement obligatoires
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'JWT_SECRET',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_EMBEDDING_API_KEY',
  'QDRANT_URL',
  'QDRANT_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Variables d'environnement manquantes: ${missingEnvVars.join(', ')}`
  );
}

// Configuration du serveur
export const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
};

// Configuration Azure OpenAI
export const openaiConfig: OpenAIConfig = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4',
  model: process.env.AZURE_OPENAI_MODEL || 'gpt-4',
  // Configuration des embeddings
  embeddingEndpoint: process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT || 'https://flowise-azure-openai.openai.azure.com/',
  embeddingApiKey: process.env.AZURE_OPENAI_EMBEDDING_API_KEY!,
  embeddingApiVersion: process.env.AZURE_OPENAI_EMBEDDING_API_VERSION || '2023-05-15',
  embeddingDeploymentName: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'Azure-embedding',
  embeddingModel: process.env.AZURE_OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
};

// Configuration Qdrant - CLÉS VALIDÉES ✅
export const qdrantConfig: QdrantConfig = {
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
  collectionName: process.env.QDRANT_COLLECTION_NAME || 'Studybot BBA 11.10.24',
};

// Configuration base de données (sera activée quand la DB sera créée)
export const databaseConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  name: process.env.DB_NAME || 'studybot_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true',
};

// Vérifier si la base de données est configurée
export const isDatabaseConfigured = (): boolean => {
  return !!(
    process.env.DB_HOST &&
    process.env.DB_USER &&
    process.env.DB_PASSWORD &&
    process.env.DB_NAME
  );
};

// Configuration de logging
export const loggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  file: process.env.LOG_FILE || 'logs/studybot.log',
};

// URLs frontend
export const frontendConfig = {
  url: process.env.FRONTEND_URL || 'http://localhost:5173',
  adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3000',
};

// Configuration Azure (pour le déploiement)
export const azureConfig = {
  appServiceName: process.env.AZURE_APP_SERVICE_NAME,
  resourceGroup: process.env.AZURE_RESOURCE_GROUP,
  location: process.env.AZURE_LOCATION || 'francecentral',
  applicationInsightsKey: process.env.AZURE_APPLICATION_INSIGHTS_KEY,
};

// Export de toutes les configurations
export const config = {
  server: serverConfig,
  openai: openaiConfig,
  qdrant: qdrantConfig,
  database: databaseConfig,
  logging: loggingConfig,
  frontend: frontendConfig,
  azure: azureConfig,
  isDatabaseConfigured: isDatabaseConfigured(),
} as const;

export default config; 