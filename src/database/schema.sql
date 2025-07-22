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