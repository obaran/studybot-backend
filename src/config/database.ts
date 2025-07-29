// =============================================================================
// STUDYBOT BACKEND - CONFIGURATION BASE DE DONNÉES MYSQL
// =============================================================================

import mysql from 'mysql2/promise';
import { logger } from '@/utils/logger';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: any;
  connectTimeout: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
}

class DatabaseService {
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'studybot',
      ssl: process.env.NODE_ENV === 'production',
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: false
    };

    this.initializePool();
  }

  private initializePool(): void {
    try {
      const poolConfig: any = {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        connectionLimit: 10,
        charset: 'utf8mb4',
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: false,
        maxReconnects: 3,
        reconnectDelay: 2000
      };

      // Ajouter SSL pour Azure MySQL
      if (process.env.DB_SSL === 'true') {
        poolConfig.ssl = { rejectUnauthorized: false };
      }

      this.pool = mysql.createPool(poolConfig);

      logger.info('💾 Pool de connexions MySQL initialisé');
    } catch (error) {
      logger.error('❌ Erreur initialisation pool MySQL:', error);
      throw error;
    }
  }

  async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool) {
      throw new Error('Pool de connexions non initialisé');
    }

    try {
      const connection = await this.pool.getConnection();
      return connection;
    } catch (error) {
      logger.error('❌ Erreur récupération connexion MySQL:', error);
      throw error;
    }
  }

  async query(sql: string, params?: any[]): Promise<any> {
    let connection: mysql.PoolConnection | null = null;
    
    try {
      connection = await this.getConnection();
      const [results] = await connection.execute(sql, params);
      return results;
    } catch (error) {
      logger.error('❌ Erreur exécution requête MySQL:', { sql: sql.substring(0, 100), error: error instanceof Error ? error.message : error });
      throw error;
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          logger.warn('⚠️ Erreur libération connexion:', releaseError);
        }
      }
    }
  }

  async transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error('❌ Erreur transaction MySQL:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      logger.info('✅ Connexion MySQL validée');
      return true;
    } catch (error) {
      logger.error('❌ Échec test connexion MySQL:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      logger.info('💾 Pool MySQL fermé');
    }
  }
}

// Instance singleton
export const database = new DatabaseService();
export default database; 