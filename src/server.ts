// =============================================================================
// STUDYBOT BACKEND - SERVEUR PRINCIPAL AVEC MYSQL
// =============================================================================

import express from 'express';
import cors from 'cors';
import { logger } from '@/utils/logger';
// import { config } from '@/config';
import chatRoutes from '@/routes/chat';
import adminRoutes from '@/routes/admin';
import widgetRoutes from '@/routes/widget';
import DatabaseInitializer from '@/database/init';
import { conversationDB } from '@/services/conversationDatabaseService';

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging des requêtes
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    // const duration = Date.now() - start;
    logger.info(`${req.ip} - - [${new Date().toISOString().replace('T', ' ').slice(0, -5)}] "${req.method} ${req.originalUrl} HTTP/${req.httpVersion}" ${res.statusCode} ${res.get('Content-Length') || '-'} "${req.get('Referer') || ''}" "${req.get('User-Agent') || ''}"`);
  });
  next();
});

// =============================================================================
// INITIALISATION BASE DE DONNÉES
// =============================================================================

async function initializeDatabase() {
  try {
    logger.info('🔧 Initialisation de la base de données MySQL...');
    
    const initialized = await DatabaseInitializer.initialize();
    if (!initialized) {
      throw new Error('Échec initialisation base de données');
    }

    // Vérifier l'intégrité
    const integrityOk = await DatabaseInitializer.checkIntegrity();
    if (!integrityOk) {
      logger.warn('⚠️ Problème d\'intégrité détecté, mais continue...');
    }

    // Afficher les statistiques
    const stats = await DatabaseInitializer.getStats();
    logger.info(`📊 Statistiques DB: ${stats.sessions} sessions, ${stats.messages} messages, ${stats.feedbacks} feedbacks`);
    
    return true;
  } catch (error) {
    logger.error('❌ Erreur initialisation base de données:', error);
    return false;
  }
}

// =============================================================================
// ROUTES
// =============================================================================

// Routes principales
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/widget', widgetRoutes);

// Route de santé avec statistiques DB
app.get('/health', async (_req, res) => {
  try {
    const stats = await DatabaseInitializer.getStats();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        ...stats
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// Route de base
app.get('/', (_req, res) => {
  res.json({
    message: 'StudyBot Backend API avec MySQL',
    version: '2.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// Servir les fichiers uploadés
app.use('/uploads', express.static('uploads'));

// =============================================================================
// GESTION D'ERREURS
// =============================================================================

// Middleware de gestion d'erreurs
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('❌ Erreur non gérée:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne du serveur',
    timestamp: new Date().toISOString()
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.originalUrl} non trouvée`,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// DÉMARRAGE DU SERVEUR
// =============================================================================

async function startServer() {
  try {
    // 1. Initialiser la base de données
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      logger.error('❌ Impossible de démarrer sans base de données');
      process.exit(1);
    }

    // 2. Démarrer le serveur HTTP
    const server = app.listen(PORT, () => {
      logger.info('🧠 Service mémoire conversationnelle initialisé');
      logger.info('🔧 Vérification des configurations...');
      logger.info('🚀 StudyBot Backend démarré !');
      logger.info(`📍 Port: ${PORT}`);
      logger.info(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      logger.info('💾 Base de données: Configurée');
      logger.info(`🤖 Azure OpenAI: ${process.env.AZURE_OPENAI_ENDPOINT || 'Non configuré'}`);
      logger.info(`🔍 Qdrant: ${process.env.QDRANT_URL || 'Non configuré'}`);
    });

    // 3. Gestion gracieuse de l'arrêt
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📡 Signal ${signal} reçu, arrêt en cours...`);
      
      server.close(async () => {
        try {
          // Fermer les connexions DB
          await conversationDB.cleanupOldConversations(7); // Nettoyer les conversations de plus de 7 jours
          logger.info('💾 Connexions base de données fermées');
          
          logger.info('✅ Serveur arrêté proprement');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Erreur lors de l\'arrêt:', error);
          process.exit(1);
        }
      });
    };

    // Écouter les signaux d'arrêt
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Gestion des erreurs non capturées
    process.on('unhandledRejection', (reason, _promise) => {
      logger.error('❌ Promesse non gérée:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('❌ Exception non capturée:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Erreur fatale au démarrage:', error);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();

export default app; 