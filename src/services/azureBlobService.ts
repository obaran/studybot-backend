/**
 * 🗄️ Service Azure Blob Storage
 * Gestion de l'upload des images (avatars bot/user) vers Azure Blob Storage
 */

import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger';

class AzureBlobService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName: string = 'images'; // Container pour les images

  constructor() {
    // Récupérer les credentials depuis les variables d'environnement
    const accountName = process.env.AZURE_STORAGE_ACCOUNT;
    const accountKey = process.env.AZURE_STORAGE_KEY;
    
    if (!accountName || !accountKey) {
      throw new Error('❌ AZURE_STORAGE_ACCOUNT et AZURE_STORAGE_KEY doivent être définis dans .env');
    }

    // Construire la connection string à partir des variables séparées
    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
    
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    
    logger.info('✅ Azure Blob Service initialisé', { accountName });
  }

  /**
   * Upload un fichier vers Azure Blob Storage
   * @param file Buffer du fichier
   * @param originalName Nom original du fichier
   * @param type Type d'avatar ('bot', 'user' ou 'button')
   * @returns URL publique du fichier uploadé
   */
  async uploadAvatar(
    file: Buffer,
    originalName: string,
    type: 'bot' | 'user' | 'button'
  ): Promise<string> {
    try {
      // S'assurer que le container existe
      await this.ensureContainerExists();

      // Générer un nom unique pour le fichier
      const fileExtension = originalName.split('.').pop();
      const blobName = `${type}-avatar-${uuidv4()}.${fileExtension}`;

      // Créer le blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      // Déterminer le content type
      const contentType = this.getContentType(fileExtension || '');

      // Upload le fichier
      await blockBlobClient.upload(file, file.length, {
        blobHTTPHeaders: {
          blobContentType: contentType
        }
      });

      // Retourner l'URL publique
      const publicUrl = blockBlobClient.url;
      
      logger.info(`✅ Avatar ${type} uploadé vers Azure Blob Storage`, { 
        blobName, 
        url: publicUrl 
      });

      return publicUrl;

    } catch (error) {
      logger.error('❌ Erreur upload Azure Blob Storage', { error });
      throw new Error(`Erreur lors de l'upload vers Azure: ${error}`);
    }
  }

  /**
   * Supprimer un avatar d'Azure Blob Storage
   * @param blobUrl URL du blob à supprimer
   */
  async deleteAvatar(blobUrl: string): Promise<void> {
    try {
      // Extraire le nom du blob depuis l'URL
      const blobName = this.extractBlobNameFromUrl(blobUrl);
      
      if (!blobName) {
        logger.warn('⚠️ Impossible d\'extraire le nom du blob depuis l\'URL', { blobUrl });
        return;
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.deleteIfExists();

      logger.info(`🗑️ Avatar supprimé d'Azure Blob Storage`, { blobName });

    } catch (error) {
      logger.error('❌ Erreur suppression Azure Blob Storage', { error });
      // Ne pas throw pour ne pas bloquer le flux
    }
  }

  /**
   * Vérifier si le container existe, sinon le créer
   */
  async ensureContainerExists(): Promise<void> {
    try {
      logger.info(`🔍 Vérification existence container '${this.containerName}'`);
      const exists = await this.containerClient.exists();
      logger.info(`📦 Container existe: ${exists}`);
      
      if (!exists) {
        logger.info(`🔨 Création du container '${this.containerName}'...`);
        await this.containerClient.create({
          access: 'blob' // Accès public en lecture pour les blobs
        });
        logger.info(`✅ Container '${this.containerName}' créé avec succès`);
      } else {
        logger.info(`✅ Container '${this.containerName}' existe déjà`);
      }
    } catch (error: any) {
      logger.error('❌ Erreur création container Azure', { 
        message: error?.message,
        code: error?.code,
        statusCode: error?.statusCode,
        details: error?.details,
        stack: error?.stack
      });
      throw error;
    }
  }

  /**
   * Extraire le nom du blob depuis une URL Azure
   */
  private extractBlobNameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // Format: /container-name/blob-name
      return pathParts.length >= 3 ? pathParts.slice(2).join('/') : null;
    } catch {
      return null;
    }
  }

  /**
   * Déterminer le content type selon l'extension
   */
  private getContentType(extension: string): string {
    const contentTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };

    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}

// Export singleton
export const azureBlobService = new AzureBlobService();
