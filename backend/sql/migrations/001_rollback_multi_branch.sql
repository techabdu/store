-- ============================================================================
-- ROLLBACK: Remove Multi-Branch Shop Support
-- Version: 001
-- Date: 2024-12-09
-- ============================================================================
-- 
-- This script reverses the multi-branch migration.
-- 
-- ⚠️  WARNING: This will DELETE all shop data created after migration!
-- Only use this if you need to completely reverse the multi-branch feature.
-- 
-- BEFORE RUNNING:
-- 1. Backup your database: mysqldump -u root -p store > backup_before_rollback.sql
-- 2. Understand that NEW shops/branches created after migration will be lost
-- 3. Test on development/staging first
--
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;  -- Temporarily disable FK checks for cleanup

-- ============================================================================
-- STEP 1: Remove shop_id from sessions table
-- ============================================================================

ALTER TABLE sessions DROP FOREIGN KEY fk_sessions_shop_id;
ALTER TABLE sessions DROP INDEX idx_shop_id;
ALTER TABLE sessions DROP COLUMN shop_id;

-- ============================================================================
-- STEP 2: Remove shop_id from activity_logs table
-- ============================================================================

ALTER TABLE activity_logs DROP FOREIGN KEY fk_activity_logs_shop_id;
ALTER TABLE activity_logs DROP INDEX idx_shop_id;
ALTER TABLE activity_logs DROP COLUMN shop_id;

-- ============================================================================
-- STEP 3: Remove shop_id from reports table
-- ============================================================================

ALTER TABLE reports DROP FOREIGN KEY fk_reports_shop_id;
ALTER TABLE reports DROP INDEX idx_shop_id;
ALTER TABLE reports DROP COLUMN shop_id;

-- ============================================================================
-- STEP 4: Remove shop_id from profit_records table
-- ============================================================================

ALTER TABLE profit_records DROP FOREIGN KEY fk_profit_records_shop_id;
ALTER TABLE profit_records DROP INDEX idx_shop_id;
-- Restore original unique constraint
ALTER TABLE profit_records DROP INDEX unique_shop_date;
ALTER TABLE profit_records ADD UNIQUE KEY unique_tenant_date (tenant_id, date);
ALTER TABLE profit_records DROP COLUMN shop_id;

-- ============================================================================
-- STEP 5: Remove shop_id from expenses table
-- ============================================================================

ALTER TABLE expenses DROP FOREIGN KEY fk_expenses_shop_id;
ALTER TABLE expenses DROP INDEX idx_shop_id;
ALTER TABLE expenses DROP INDEX idx_expenses_shop_date;
ALTER TABLE expenses DROP COLUMN shop_id;

-- ============================================================================
-- STEP 6: Remove shop_id from transaction_items table
-- ============================================================================

ALTER TABLE transaction_items DROP FOREIGN KEY fk_transaction_items_shop_id;
ALTER TABLE transaction_items DROP INDEX idx_shop_id;
ALTER TABLE transaction_items DROP COLUMN shop_id;

-- ============================================================================
-- STEP 7: Remove shop_id from transactions table
-- ============================================================================

ALTER TABLE transactions DROP FOREIGN KEY fk_transactions_shop_id;
ALTER TABLE transactions DROP INDEX idx_shop_id;
ALTER TABLE transactions DROP INDEX idx_transactions_shop_created;
ALTER TABLE transactions DROP COLUMN shop_id;

-- ============================================================================
-- STEP 8: Remove shop_id from inventory table
-- ============================================================================

ALTER TABLE inventory DROP FOREIGN KEY fk_inventory_shop_id;
ALTER TABLE inventory DROP INDEX idx_shop_id;
ALTER TABLE inventory DROP INDEX idx_inventory_shop_status;
-- Restore original unique constraint
ALTER TABLE inventory DROP INDEX unique_shop_imei;
ALTER TABLE inventory ADD UNIQUE KEY unique_tenant_imei (tenant_id, imei);
ALTER TABLE inventory DROP COLUMN shop_id;

-- ============================================================================
-- STEP 9: Remove shop_id from users table
-- ============================================================================

ALTER TABLE users DROP FOREIGN KEY fk_users_shop_id;
ALTER TABLE users DROP INDEX idx_shop_id;
ALTER TABLE users DROP COLUMN shop_id;

-- ============================================================================
-- STEP 10: Drop shops table
-- ============================================================================

DROP TABLE IF EXISTS shops;

-- ============================================================================
-- Re-enable foreign key checks
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

SELECT '============================================' AS '';
SELECT '⚠️  MULTI-BRANCH ROLLBACK COMPLETE!' AS '';
SELECT '============================================' AS '';
SELECT 'Removed: shops table' AS '';
SELECT 'Removed: shop_id from all tables' AS '';
SELECT 'Restored: Original unique constraints' AS '';
SELECT '' AS '';
SELECT '⚠️  NOTE:' AS '';
SELECT 'Any branches/shops created AFTER the original migration are now DELETED.' AS '';
SELECT 'Data that was in those branches is LOST unless you have a backup.' AS '';
SELECT '============================================' AS '';
