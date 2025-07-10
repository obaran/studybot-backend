# 🔧 StudyBot Backend

**API Node.js pour la plateforme StudyBot avec IA intégrée**

## 🎯 Description

Module backend de la plateforme StudyBot développée pour emlyon business school. Comprend :

- **API REST** - Communication avec frontend et widget
- **Intelligence Artificielle** - Intégration OpenAI + Qdrant
- **Web Scraping** - Extraction automatique de contenu
- **Analytics** - Collecte et traitement des métriques
- **Système de Sécurité** - Authentification JWT, rate limiting

## 🛠️ Technologies

- **Node.js** + **Express.js** + **TypeScript**
- **OpenAI API** pour la génération de réponses
- **Qdrant** pour le vector store et recherche sémantique
- **Azure MySQL** pour les données relationnelles
- **Puppeteer** + **Cheerio** pour le web scraping
- **JWT** + **bcrypt** pour l'authentification

## 🤖 Services IA

### Pipeline de Traitement des Messages
1. **Recherche contexte** dans Qdrant (similarity search)
2. **Construction prompt** avec contexte pertinent
3. **Appel OpenAI** pour génération de réponse
4. **Post-traitement** et attribution des sources
5. **Sauvegarde** conversation et métriques

### Web Scraping Intelligent
- **Extraction contenu** depuis URLs configurées
- **Génération embeddings** OpenAI
- **Stockage Qdrant** pour recherche sémantique
- **Mise à jour automatique** via cron jobs

## 🗄️ Base de Données

### Azure MySQL
- `users` - Utilisateurs admin
- `chatbots` - Configuration des chatbots
- `chat_sessions` / `chat_messages` - Conversations
- `feedbacks` - Retours utilisateurs
- `scraped_content` - Contenu scrapé

### Qdrant Vector Store
- **Collection existante** configurée
- **Embeddings** du contenu scrapé
- **Recherche sémantique** pour RAG

## 🌐 API Endpoints

```typescript
// Authentication
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

// Chatbots
GET    /api/chatbots
POST   /api/chatbots
PUT    /api/chatbots/:id

// Chat
POST   /api/chat/message
GET    /api/chat/history/:sessionId
POST   /api/chat/feedback

// Analytics
GET    /api/analytics/overview
GET    /api/analytics/usage

// Scraping
GET    /api/scraping/urls
POST   /api/scraping/trigger
```

## 🚀 Installation

```bash
npm install
cp .env.example .env
# Configurer les variables d'environnement
npm run dev
```

## 🔐 Variables d'Environnement

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MYSQL_HOST=your-azure-mysql-host
MYSQL_USER=your-username
MYSQL_PASSWORD=your-password

# Qdrant
QDRANT_URL=https://your-qdrant-instance
QDRANT_API_KEY=your-api-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# Authentication
JWT_SECRET=your-jwt-secret
```

## 📋 Développement

Voir [BACKEND_TRACKING.md](./BACKEND_TRACKING.md) pour le suivi détaillé des tâches.

## 🔗 Repositories Liés

- **Frontend :** [studybot-frontend](https://github.com/obaran/studybot-frontend)
- **Docker :** [studybot-docker](https://github.com/obaran/studybot-docker)

---

**Développé avec ❤️ pour emlyon business school** 