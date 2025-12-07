-- ============================================================================
-- MIGRATION SCRIPT V2: SECURITY HARDENING
-- ============================================================================
-- Run this script on your Hostinger database to apply schema changes
-- required for the new security features.
-- ============================================================================

-- 1. Allow NULL tenant_id in security_logs to track failed logins from unknown users
ALTER TABLE security_logs MODIFY tenant_id INT NULL COMMENT 'Which shop this security event relates to (NULL for unknown users)';

-- 2. Add missing index on activity_logs for performance (if not exists)
-- Note: MySQL doesn't support "IF NOT EXISTS" for indexes in standard syntax easily,
-- so this might error if it exists. If so, ignore the error.
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);

-- 3. Optimization: Add index for finding users by username/email efficiently (for login)
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

SELECT 'Migration completed successfully. security_logs table updated.' AS 'Status';
