-- Migration: Ajouter la colonne button_icon_url pour l'icône de la bulle flottante
-- Date: 2025-10-28

ALTER TABLE widget_configurations 
ADD COLUMN IF NOT EXISTS button_icon_url VARCHAR(500) AFTER user_avatar_url;
