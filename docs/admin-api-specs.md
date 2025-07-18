# StudyBot Admin API Specifications

## Base URL
```
http://localhost:3001/api/admin
```

## Authentication
Tous les endpoints admin nécessitent une authentification JWT via header :
```
Authorization: Bearer <token>
```

---

## 1. CONVERSATIONS ENDPOINTS

### GET /conversations
Récupérer la liste des conversations avec pagination et filtres

**Query Parameters:**
```typescript
{
  page?: number = 1
  limit?: number = 20
  sortBy?: 'startTime' | 'lastMessageTime' | 'messageCount' = 'lastMessageTime'
  sortOrder?: 'asc' | 'desc' = 'desc'
  status?: 'active' | 'completed' | 'expired' | 'all' = 'all'
  feedback?: 'positive' | 'negative' | 'none' | 'all' = 'all'
  dateFrom?: string // ISO date
  dateTo?: string   // ISO date
  search?: string   // Recherche dans contenu messages
  userIdentifier?: string
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    items: Conversation[],
    total: number,
    page: number,
    limit: number,
    totalPages: number
  },
  timestamp: string
}
```

### GET /conversations/:id
Récupérer une conversation spécifique avec tous ses messages

**Response:**
```typescript
{
  success: true,
  data: Conversation, // avec messages[] et feedback[]
  timestamp: string
}
```

### GET /conversations/search
Recherche avancée dans les conversations

**Query Parameters:**
```typescript
{
  q: string,              // Requête de recherche
  status?: string,
  feedback?: string,
  dateFrom?: string,
  dateTo?: string,
  limit?: number = 50
}
```

**Response:**
```typescript
{
  success: true,
  data: Conversation[],
  timestamp: string
}
```

### GET /conversations/export
Exporter les conversations au format CSV

**Query Parameters:** (mêmes filtres que GET /conversations)

**Response:** Fichier CSV

---

## 2. SYSTEM PROMPT ENDPOINTS

### GET /system-prompt
Récupérer tous les prompts système

**Response:**
```typescript
{
  success: true,
  data: SystemPrompt[],
  timestamp: string
}
```

### GET /system-prompt/active
Récupérer le prompt système actif

**Response:**
```typescript
{
  success: true,
  data: SystemPrompt,
  timestamp: string
}
```

### POST /system-prompt
Créer un nouveau prompt système

**Body:**
```typescript
{
  content: string,
  description?: string,
  tags?: string[]
}
```

**Response:**
```typescript
{
  success: true,
  data: SystemPrompt,
  timestamp: string
}
```

### PUT /system-prompt/:id
Mettre à jour un prompt système

**Body:**
```typescript
{
  content?: string,
  description?: string,
  tags?: string[],
  changeSummary?: string
}
```

### POST /system-prompt/:id/activate
Activer un prompt système (désactive les autres)

**Response:**
```typescript
{
  success: true,
  data: SystemPrompt,
  timestamp: string
}
```

### DELETE /system-prompt/:id
Supprimer un prompt système (sauf actif)

### GET /system-prompt/:id/history
Récupérer l'historique des modifications d'un prompt

---

## 3. CONFIGURATION ENDPOINTS

### GET /configuration
Récupérer la configuration du bot

**Response:**
```typescript
{
  success: true,
  data: BotConfiguration,
  timestamp: string
}
```

### PUT /configuration
Mettre à jour la configuration

**Body:**
```typescript
{
  welcomeMessage?: string,
  footerText?: string,
  footerLink?: string,
  primaryColor?: string,
  secondaryColor?: string
}
```

### POST /configuration/upload
Upload de fichiers (logos/avatars)

**Body:** FormData avec file + type

**Response:**
```typescript
{
  success: true,
  data: {
    filename: string,
    url: string,
    size: number,
    mimetype: string
  },
  timestamp: string
}
```

### POST /configuration/integration-links
Générer les liens d'intégration

**Response:**
```typescript
{
  success: true,
  data: {
    uniqueToken: string,
    directLink: string,
    iframeCode: string,
    embedCode: string,
    generatedAt: string
  },
  timestamp: string
}
```

### POST /configuration/regenerate-token
Régénérer le token d'intégration

---

## 4. ADMIN USERS ENDPOINTS

### GET /users
Récupérer tous les utilisateurs admin

**Response:**
```typescript
{
  success: true,
  data: AdminUser[],
  timestamp: string
}
```

### POST /users
Créer un nouvel utilisateur admin

**Body:**
```typescript
{
  name: string,
  email: string,
  role: 'admin' | 'moderator',
  permissions: AdminPermission[]
}
```

### PUT /users/:id
Mettre à jour un utilisateur admin

**Body:**
```typescript
{
  name?: string,
  role?: 'admin' | 'moderator',
  permissions?: AdminPermission[],
  status?: 'active' | 'suspended'
}
```

### DELETE /users/:id
Supprimer un utilisateur admin

### POST /users/:id/resend-invitation
Renvoyer l'invitation par email

---

## 5. ANALYTICS ENDPOINTS

### GET /analytics/metrics
Récupérer les métriques du dashboard

**Response:**
```typescript
{
  success: true,
  data: {
    totalConversations: number,
    todayMessages: number,
    averageRating: number,
    activeUsers: number,
    totalTokensUsed: number,
    estimatedCost: number,
    activeSessions: number,
    peakUsageTime: string,
    averageResponseTime: number,
    costSavings: number
  },
  timestamp: string
}
```

### GET /analytics/usage
Récupérer les statistiques d'usage

**Query Parameters:**
```typescript
{
  dateFrom: string,
  dateTo: string,
  granularity: 'hour' | 'day' | 'week' | 'month'
}
```

**Response:**
```typescript
{
  success: true,
  data: UsageStatistics[],
  timestamp: string
}
```

### GET /analytics/export
Exporter les analytics au format Excel

---

## 6. AUTHENTICATION ENDPOINTS

### POST /auth/login
Connexion admin

**Body:**
```typescript
{
  email: string,
  password: string
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    token: string,
    user: AdminUser,
    expiresAt: string
  },
  timestamp: string
}
```

### POST /auth/logout
Déconnexion

### POST /auth/refresh
Rafraîchir le token JWT

### GET /auth/me
Récupérer l'utilisateur connecté

---

## Data Models

### Conversation
```typescript
interface Conversation {
  id: string
  sessionId: string
  user: User
  messages: Message[]
  feedback?: Feedback[]
  status: 'active' | 'completed' | 'expired'
  startTime: string
  endTime?: string
  messageCount: number
  lastMessage: string
  lastMessageTime: string
  averageResponseTime?: number
  totalTokensUsed?: number
}
```

### Message
```typescript
interface Message {
  id: string
  sessionId: string
  content: string
  type: 'user' | 'bot'
  timestamp: string
  metadata?: {
    model?: string
    tokensUsed?: number
    responseTime?: number
    sources?: string[]
  }
}
```

### User
```typescript
interface User {
  id: string
  sessionId: string
  identifier: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
  lastActiveAt: string
}
```

### Feedback
```typescript
interface Feedback {
  id: string
  messageId: string
  sessionId: string
  type: 'positive' | 'negative'
  comment?: string
  timestamp: string
}
```

### SystemPrompt
```typescript
interface SystemPrompt {
  id: string
  content: string
  version: string
  status: 'active' | 'draft' | 'archived'
  createdAt: string
  updatedAt: string
  createdBy: string
  activatedAt?: string
  description?: string
  tags?: string[]
}
```

---

## Error Responses

Tous les endpoints peuvent retourner :

### 400 Bad Request
```typescript
{
  success: false,
  error: 'VALIDATION_ERROR',
  message: 'Description de l\'erreur',
  details?: any,
  timestamp: string
}
```

### 401 Unauthorized
```typescript
{
  success: false,
  error: 'UNAUTHORIZED',
  message: 'Token manquant ou invalide',
  timestamp: string
}
```

### 403 Forbidden
```typescript
{
  success: false,
  error: 'FORBIDDEN',
  message: 'Permissions insuffisantes',
  timestamp: string
}
```

### 404 Not Found
```typescript
{
  success: false,
  error: 'NOT_FOUND',
  message: 'Ressource introuvable',
  timestamp: string
}
```

### 500 Internal Server Error
```typescript
{
  success: false,
  error: 'INTERNAL_ERROR',
  message: 'Erreur serveur interne',
  timestamp: string
}
``` 