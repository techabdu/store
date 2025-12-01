-- Add password reset token fields to users table
ALTER TABLE users
ADD COLUMN reset_token VARCHAR(64) NULL,
ADD COLUMN reset_token_expires DATETIME NULL;

-- Add index for faster token lookups
CREATE INDEX idx_reset_token ON users(reset_token);
