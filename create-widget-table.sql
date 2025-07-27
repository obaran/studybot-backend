-- =============================================================================
-- CRÉATION TABLE WIDGET_CONFIGURATIONS POUR RÉSOUDRE L'ERREUR API
-- =============================================================================

USE studybot_dev;

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