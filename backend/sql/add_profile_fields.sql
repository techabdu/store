-- Add profile fields to users table for User Profile Settings feature
-- Run this migration to add full_name, phone, and avatar_color columns

ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NULL AFTER username,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL AFTER email,
ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(7) NOT NULL DEFAULT '#3b82f6' AFTER phone;

-- Update existing users to have default avatar color if NULL
UPDATE users SET avatar_color = '#3b82f6' WHERE avatar_color IS NULL OR avatar_color = '';
