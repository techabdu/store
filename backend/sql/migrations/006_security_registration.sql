-- Migration: Add 'registration_attempt' to security_logs event_type ENUM
-- Date: 2026-01-08
-- Description: Allows logging of registration attempts for rate limiting and security monitoring

-- Update the event_type ENUM to include 'registration_attempt'
ALTER TABLE `security_logs` 
MODIFY COLUMN `event_type` enum(
    'failed_login',
    'suspicious_activity',
    'session_hijack',
    'brute_force',
    'unauthorized_access',
    'registration_attempt'
) NOT NULL;

-- Add index on event_type and created_at for efficient rate limiting queries
-- CREATE INDEX IF NOT EXISTS idx_event_type_created ON security_logs(event_type, created_at);
-- Note: MySQL doesn't support IF NOT EXISTS for indexes, check if exists first or ignore error

-- Alternative: Run this to check if index exists before creating
-- If you get "Duplicate key name" error, the index already exists, which is fine
ALTER TABLE `security_logs` ADD INDEX `idx_security_event_created` (`event_type`, `created_at`);
