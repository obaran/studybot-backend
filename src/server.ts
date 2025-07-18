// =============================================================================
// STUDYBOT BACKEND - SERVEUR EXPRESS PRINCIPAL
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { requestId } from '@/middleware/requestId';

// Import des routes
import chatRoutes from '@/routes/chat';
// import authRoutes from '@/routes/auth';
import adminRoutes from '@/routes/admin';

const app = express();

// =============================================================================
// MIDDLEWARES DE SÉCURITÉ
// =============================================================================

// Helmet pour la sécurité des headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // Permettre les requêtes sans origin (applications mobiles, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (config.server.corsOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.server.rateLimitWindow,
  max: config.server.rateLimitMaxRequests,
  message: {
    error: 'Trop de requêtes, veuillez réessayer plus tard.',
    retryAfter: config.server.rateLimitWindow / 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// =============================================================================
// MIDDLEWARES GÉNÉRAUX
// =============================================================================

// Compression
app.use(compression());

// Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging des requêtes
if (config.server.nodeEnv !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

// Request ID pour le tracking
app.use(requestId);

// =============================================================================
// ROUTES DE SANTÉ
// =============================================================================

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    uptime: process.uptime(),
    database: config.isDatabaseConfigured ? 'configured' : 'not_configured'
  });
});

// Version de l'API
app.get('/api/version', (_req, res) => {
  res.json({
    version: '1.0.0',
    name: 'StudyBot Backend API',
    environment: config.server.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// ROUTES PRINCIPALES
// =============================================================================

app.use('/api/chat', chatRoutes);
// app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Route par défaut
app.get('/api', (_req, res) => {
  res.json({
    message: 'StudyBot Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      version: '/api/version',
      chat: '/api/chat',
      // auth: '/api/auth',
      admin: '/api/admin'
    }
  });
});

// =============================================================================
// GESTION DES ERREURS
// =============================================================================

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} non trouvée`,
      statusCode: 404
    }
  });
});

// Gestionnaire d'erreurs global
app.use(errorHandler);

// =============================================================================
// DÉMARRAGE DU SERVEUR
// =============================================================================

const startServer = async (): Promise<void> => {
  try {
    // Vérifier les configurations critiques
    logger.info('🔧 Vérification des configurations...');
    
    if (!config.openai.endpoint || !config.openai.apiKey) {
      throw new Error('Configuration Azure OpenAI manquante');
    }
    
    if (!config.qdrant.url || !config.qdrant.apiKey) {
      throw new Error('Configuration Qdrant manquante');
    }
    
    // Démarrer le serveur
    const server = app.listen(config.server.port, () => {
      logger.info(`🚀 StudyBot Backend démarré !`);
      logger.info(`📍 Port: ${config.server.port}`);
      logger.info(`🌍 Environnement: ${config.server.nodeEnv}`);
      logger.info(`💾 Base de données: ${config.isDatabaseConfigured ? 'Configurée' : 'Non configurée'}`);
      logger.info(`🤖 Azure OpenAI: ${config.openai.endpoint}`);
      logger.info(`🔍 Qdrant: ${config.qdrant.url}`);
    });

    // Gestion gracieuse de l'arrêt
    const gracefulShutdown = (signal: string) => {
      logger.info(`📡 Signal ${signal} reçu, arrêt en cours...`);
      server.close(() => {
        logger.info('✅ Serveur arrêté proprement');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Démarrer seulement si ce fichier est exécuté directement
if (require.main === module) {
  startServer().catch(error => {
    logger.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

export { app, startServer };
export default app; 