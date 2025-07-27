-- =============================================================================
-- STUDYBOT BACKEND - SCHÉMA BASE DE DONNÉES MYSQL
-- =============================================================================

-- Table des sessions de conversation
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_identifier VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at),
    INDEX idx_last_activity (last_activity)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS conversation_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES conversation_sessions(session_id) ON DELETE CASCADE,
    INDEX idx_message_id (message_id),
    INDEX idx_session_id (session_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_role (role)
);

-- Table des feedbacks
CREATE TABLE IF NOT EXISTS conversation_feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feedback_id VARCHAR(255) UNIQUE NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    type ENUM('positive', 'negative') NOT NULL,
    comment TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES conversation_messages(message_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES conversation_sessions(session_id) ON DELETE CASCADE,
    INDEX idx_feedback_id (feedback_id),
    INDEX idx_message_id (message_id),
    INDEX idx_session_id (session_id),
    INDEX idx_type (type),
    INDEX idx_timestamp (timestamp)
);

-- Table des utilisateurs (pour l'admin)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    identifier VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_session (session_id),
    INDEX idx_identifier (identifier),
    INDEX idx_created_at (created_at),
    INDEX idx_last_active (last_active_at)
);

-- Vue pour les conversations complètes (pour l'admin)
CREATE OR REPLACE VIEW conversation_summary AS
SELECT 
    cs.session_id,
    cs.user_identifier,
    cs.ip_address,
    cs.created_at as start_time,
    cs.last_activity,
    COUNT(cm.id) as message_count,
    COUNT(CASE WHEN cf.type = 'positive' THEN 1 END) as positive_feedback_count,
    COUNT(CASE WHEN cf.type = 'negative' THEN 1 END) as negative_feedback_count,
    cs.is_active
FROM conversation_sessions cs
LEFT JOIN conversation_messages cm ON cs.session_id = cm.session_id
LEFT JOIN conversation_feedbacks cf ON cs.session_id = cf.session_id
GROUP BY cs.session_id, cs.user_identifier, cs.ip_address, cs.created_at, cs.last_activity, cs.is_active;

-- Index additionnels pour les performances
CREATE INDEX idx_conversations_date_range ON conversation_sessions(created_at, last_activity);
CREATE INDEX idx_messages_content_search ON conversation_messages(content(255));
CREATE INDEX idx_feedback_combined ON conversation_feedbacks(session_id, type, timestamp); 

-- =============================================================================
-- TABLE DES PROMPTS SYSTÈME
-- =============================================================================

-- Table des prompts système avec versioning
CREATE TABLE IF NOT EXISTS system_prompts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prompt_id VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    version VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    is_active BOOLEAN DEFAULT FALSE,
    character_count INT GENERATED ALWAYS AS (LENGTH(content)) STORED,
    word_count INT GENERATED ALWAYS AS (
        LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1
    ) STORED,
    metadata JSON,
    INDEX idx_prompt_id (prompt_id),
    INDEX idx_version (version),
    INDEX idx_created_at (created_at),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by)
);

-- Vue pour récupérer le prompt actif facilement
CREATE OR REPLACE VIEW active_system_prompt AS
SELECT 
    prompt_id,
    content,
    version,
    title,
    description,
    created_at,
    created_by,
    character_count,
    word_count,
    metadata
FROM system_prompts 
WHERE is_active = TRUE 
ORDER BY created_at DESC 
LIMIT 1;

-- Vue pour l'historique des prompts
CREATE OR REPLACE VIEW system_prompts_history AS
SELECT 
    prompt_id,
    content,
    version,
    title,
    description,
    created_at,
    created_by,
    is_active,
    character_count,
    word_count,
    metadata
FROM system_prompts 
ORDER BY created_at DESC;

-- =============================================================================
-- TABLE DES CONFIGURATIONS WIDGET
-- =============================================================================

-- Table des configurations widget pour les intégrations externes
CREATE TABLE IF NOT EXISTS widget_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    organization VARCHAR(255) DEFAULT 'emlyon business school',
    welcome_message TEXT DEFAULT 'Bonjour ! Je suis votre assistant virtuel emlyon. Comment puis-je vous aider ?',
    footer_text VARCHAR(255) DEFAULT 'Powered by emlyon business school',
    footer_link VARCHAR(500) DEFAULT 'https://emlyon.com',
    primary_color VARCHAR(7) DEFAULT '#e2001a',
    secondary_color VARCHAR(7) DEFAULT '#b50015',
    bot_avatar_url VARCHAR(500),
    user_avatar_url VARCHAR(500),
    position ENUM('bottom-right', 'bottom-left', 'top-right', 'top-left') DEFAULT 'bottom-right',
    language VARCHAR(5) DEFAULT 'fr',
    environment ENUM('development', 'production') DEFAULT 'development',
    base_url VARCHAR(500) DEFAULT 'http://localhost:5173',
    api_url VARCHAR(500) DEFAULT 'http://localhost:3001',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255) DEFAULT 'system',
    INDEX idx_token (token),
    INDEX idx_organization (organization),
    INDEX idx_is_active (is_active),
    INDEX idx_environment (environment)
);

-- Vue pour récupérer la configuration par défaut
CREATE OR REPLACE VIEW default_widget_config AS
SELECT 
    token,
    organization,
    welcome_message,
    footer_text,
    footer_link,
    primary_color,
    secondary_color,
    bot_avatar_url,
    user_avatar_url,
    position,
    language,
    environment,
    base_url,
    api_url,
    is_active,
    created_at,
    updated_at
FROM widget_configurations 
WHERE is_active = TRUE 
ORDER BY created_at DESC 
LIMIT 1;

-- Insertion de la configuration par défaut
INSERT INTO widget_configurations (
    token, 
    organization, 
    welcome_message,
    footer_text,
    footer_link,
    primary_color,
    secondary_color,
    environment,
    base_url,
    api_url
) VALUES (
    'default-emlyon-2025', 
    'emlyon business school',
    'Bonjour ! Je suis votre assistant virtuel emlyon. 🚨 Veuillez ne pas transmettre d\'informations personnelles. 🔔 Studybot peut faire des erreurs. Comment puis-je vous aider ?',
    'Powered by emlyon business school',
    'https://emlyon.com',
    '#e2001a',
    '#b50015',
    'development',
    'http://localhost:5173',
    'http://localhost:3001'
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP; 