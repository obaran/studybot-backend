# 🚀 GUIDE DE MIGRATION VERS MYSQL - STUDYBOT

## 📋 RÉSUMÉ DE LA MIGRATION

✅ **TERMINÉ :**
- Configuration MySQL avec pool de connexions
- Schéma de base de données complet (sessions, messages, feedbacks)
- Service de base de données remplaçant le service mémoire
- Nouveau contrôleur admin utilisant MySQL
- Mise à jour du chat controller pour MySQL
- Scripts d'initialisation et maintenance
- Serveur principal mis à jour

## 🎯 PROCHAINES ÉTAPES

### 1. CONFIGURATION AZURE MYSQL

#### Créer la base de données Azure MySQL :
```bash
# 1. Se connecter à Azure
az login

# 2. Créer la base de données MySQL (France Central)
az mysql flexible-server create \
  --name studybot-mysql-server \
  --resource-group your-resource-group \
  --location francecentral \
  --admin-user studybotadmin \
  --admin-password "VotreMotDePasse123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 20

# 3. Créer la base de données
az mysql flexible-server db create \
  --resource-group your-resource-group \
  --server-name studybot-mysql-server \
  --database-name studybot
```

#### Configurer le firewall :
```bash
# Permettre l'accès depuis votre IP locale (pour développement)
az mysql flexible-server firewall-rule create \
  --resource-group your-resource-group \
  --name studybot-mysql-server \
  --rule-name AllowMyIP \
  --start-ip-address VOTRE.IP.LOCALE \
  --end-ip-address VOTRE.IP.LOCALE

# Permettre l'accès depuis Azure services
az mysql flexible-server firewall-rule create \
  --resource-group your-resource-group \
  --name studybot-mysql-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 2. CONFIGURATION LOCALE

#### Variables d'environnement :
Créer/mettre à jour votre fichier `.env` :
```env
# Base de données MySQL
DB_HOST=studybot-mysql-server.mysql.database.azure.com
DB_PORT=3306
DB_USER=studybotadmin
DB_PASSWORD=VotreMotDePasse123!
DB_NAME=studybot

# Autres configurations existantes...
AZURE_OPENAI_API_KEY=votre_clé
AZURE_OPENAI_ENDPOINT=votre_endpoint
QDRANT_URL=votre_qdrant_url
QDRANT_API_KEY=votre_qdrant_clé
```

### 3. TESTS ET VALIDATION

#### Tester la connexion :
```bash
# Démarrer le serveur backend
cd studybot-backend
npm install mysql2  # Si pas déjà fait
npm run dev
```

Le serveur va automatiquement :
1. ✅ Se connecter à MySQL
2. ✅ Créer les tables si nécessaires
3. ✅ Vérifier l'intégrité
4. ✅ Afficher les statistiques

#### Tester les conversations :
1. **Chat API** : Les nouvelles conversations seront stockées en MySQL
2. **Admin Dashboard** : Les filtres fonctionneront avec les vraies données
3. **Feedbacks** : Persistés en base de données

### 4. MIGRATION DES ROUTES ADMIN

#### Remplacer l'ancien contrôleur :
```bash
# Dans studybot-backend/src/routes/admin.ts
# Remplacer les imports :
# import { ... } from '@/controllers/adminConversationsController';
# PAR :
# import { ... } from '@/controllers/adminConversationsControllerDB';
```

## 🔧 STRUCTURE DE LA BASE DE DONNÉES

### Tables créées automatiquement :

1. **`conversation_sessions`**
   - `session_id` (clé unique)
   - `user_identifier`, `ip_address`, `user_agent`
   - `created_at`, `last_activity`
   - `is_active`

2. **`conversation_messages`**
   - `message_id` (clé unique)
   - `session_id` (FK vers sessions)
   - `role` ('user' | 'assistant')
   - `content`, `timestamp`, `metadata`

3. **`conversation_feedbacks`**
   - `feedback_id` (clé unique)
   - `message_id` (FK vers messages)
   - `session_id` (FK vers sessions)
   - `type` ('positive' | 'negative')
   - `comment`, `timestamp`

### Index de performance :
- Recherches par date optimisées
- Recherche textuelle dans les messages
- Filtrage rapide par feedback

## 🚀 AVANTAGES DE LA MIGRATION

### ✅ **PRODUCTION READY**
- Données persistantes (plus de perte au redémarrage)
- Scalabilité Azure MySQL
- Sauvegardes automatiques Azure
- Monitoring et métriques intégrés

### ✅ **FONCTIONNALITÉS ADMIN AMÉLIORÉES**
- Filtres rapides et précis
- Recherche textuelle optimisée
- Export CSV avec toutes les données
- Statistiques en temps réel

### ✅ **PERFORMANCE**
- Index de base de données pour recherches rapides
- Pool de connexions pour gestion de charge
- Requêtes optimisées avec joins

## 📊 COMMANDES UTILES

### Statistiques de base de données :
```bash
curl http://localhost:3001/health
# Affiche : sessions, messages, feedbacks, uptime, etc.
```

### Nettoyage automatique :
```bash
# Les conversations de plus de 7 jours sont nettoyées automatiquement à l'arrêt du serveur
# Ou manuellement via la méthode cleanupOldConversations()
```

### Reset complet (DANGER) :
```javascript
// Dans le code ou via script
import DatabaseInitializer from '@/database/init';
await DatabaseInitializer.reset(); // Supprime TOUT et recrée
```

## 🔒 SÉCURITÉ PRODUCTION

### Pour le déploiement Azure :
1. **Variables d'environnement sécurisées** via Azure App Service
2. **SSL/TLS** activé sur MySQL Flexible Server
3. **Firewall** configuré pour autoriser seulement Azure App Service
4. **Backup automatique** configuré (7-35 jours)

### Configuration de production :
```env
NODE_ENV=production
DB_HOST=studybot-mysql-server.mysql.database.azure.com
DB_USER=studybotadmin@studybot-mysql-server
DB_SSL=true
```

## 🎯 PROCHAINES ÉTAPES SECTION PAR SECTION

Selon votre stratégie :
1. ✅ **Conversations** → **TERMINÉ** avec MySQL
2. 🔄 **System Prompts** → À migrer vers MySQL
3. 🔄 **User Management** → À migrer vers MySQL
4. 🔄 **Analytics** → À migrer vers MySQL
5. 🔄 **File Uploads** → À migrer vers Azure Blob Storage

**Stratégie** : Une section à la fois, en gardant l'ancien code comme backup jusqu'à validation complète.

---

## ⚡ DÉMARRAGE RAPIDE

```bash
# 1. Configurer MySQL Azure (voir guide ci-dessus)
# 2. Mettre à jour .env avec les credentials MySQL
# 3. Démarrer le backend
cd studybot-backend
npm run dev

# 4. Tester avec le frontend
cd ../studybot-frontend  
npm run dev

# 5. Aller sur http://localhost:5173 et tester les conversations
# 6. Vérifier l'admin dashboard sur les conversations
```

🎉 **Votre StudyBot utilise maintenant MySQL en production !** 