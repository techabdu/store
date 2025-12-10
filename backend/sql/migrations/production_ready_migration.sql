-- ============================================================================
-- PRODUCTION MIGRATION: Multi-Branch Support (Safe & Robust)
-- Version: 1.1
-- Date: 2024-12-10
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. Backup your database first!
-- 2. Run this entire script in your SQL client (phpMyAdmin, Workbench, terminal).
--    It is designed to be safe to run even if some parts were partially applied.
--
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0; -- Disable FK checks temporarily to allow schema changes
START TRANSACTION;

-- ============================================================================
-- 1. Create 'shops' table
-- ============================================================================

CREATE TABLE IF NOT EXISTS shops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Parent business/tenant',
    shop_name VARCHAR(100) NOT NULL,
    shop_address TEXT NULL,
    shop_phone VARCHAR(20) NULL,
    shop_email VARCHAR(100) NULL,
    business_capital DECIMAL(15, 2) DEFAULT 0.00,
    status ENUM('active', 'suspended') DEFAULT 'active',
    is_main_branch TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_is_main_branch (is_main_branch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing tenants to shops (only if they don't have a shop yet)
INSERT INTO shops (tenant_id, shop_name, shop_address, shop_phone, shop_email, business_capital, status, is_main_branch, created_at)
SELECT 
    id, shop_name, shop_address, shop_phone, shop_email, business_capital, 
    CASE WHEN status IN ('active', 'trial') THEN 'active' ELSE 'suspended' END,
    1, created_at
FROM tenants
WHERE id NOT IN (SELECT DISTINCT tenant_id FROM shops);

-- ============================================================================
-- 2. Add 'shop_id' to USERS table
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_id INT NULL COMMENT 'NULL=Owner, Value=Branch' AFTER tenant_id;

-- Assign existing staff users to their tenant's main shop
UPDATE users u
JOIN shops s ON u.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET u.shop_id = s.id
WHERE u.role = 'user' AND u.shop_id IS NULL;

ALTER TABLE users ADD INDEX IF NOT EXISTS idx_shop_id (shop_id);

-- ============================================================================
-- 3. Add 'shop_id' to INVENTORY table
-- ============================================================================

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS shop_id INT NULL AFTER tenant_id;

UPDATE inventory i
JOIN shops s ON i.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET i.shop_id = s.id
WHERE i.shop_id IS NULL;

-- Now safe to make NOT NULL
ALTER TABLE inventory MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE inventory ADD INDEX IF NOT EXISTS idx_shop_id (shop_id);

-- Update unique constraint for inventory (IMEI)
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = 'inventory' AND index_name = 'unique_tenant_imei' AND table_schema = DATABASE());
SET @sql := IF(@exist > 0, 'ALTER TABLE inventory DROP INDEX unique_tenant_imei', 'SELECT "Index unique_tenant_imei not found"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE inventory ADD UNIQUE KEY IF NOT EXISTS unique_shop_imei (shop_id, imei);

-- ============================================================================
-- 4. Add 'shop_id' to TRANSACTIONS table
-- ============================================================================

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shop_id INT NULL AFTER tenant_id;

UPDATE transactions t
JOIN shops s ON t.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET t.shop_id = s.id
WHERE t.shop_id IS NULL;

ALTER TABLE transactions MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE transactions ADD INDEX IF NOT EXISTS idx_shop_id (shop_id);

-- ============================================================================
-- 5. Add 'shop_id' to TRANSACTION_ITEMS table
-- ============================================================================

ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS shop_id INT NULL AFTER tenant_id;

UPDATE transaction_items ti
JOIN shops s ON ti.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET ti.shop_id = s.id
WHERE ti.shop_id IS NULL;

ALTER TABLE transaction_items MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE transaction_items ADD INDEX IF NOT EXISTS idx_shop_id (shop_id);

-- ============================================================================
-- 6. Add 'shop_id' to EXPENSES table
-- ============================================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS shop_id INT NULL AFTER tenant_id;

UPDATE expenses e
JOIN shops s ON e.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET e.shop_id = s.id
WHERE e.shop_id IS NULL;

ALTER TABLE expenses MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE expenses ADD INDEX IF NOT EXISTS idx_shop_id (shop_id);

-- ============================================================================
-- 7. Add 'shop_id' to EXPENSE_RECORDS table
-- ============================================================================

-- Check if table exists first (optional, but assumes schema consistency)
ALTER TABLE expense_records ADD COLUMN IF NOT EXISTS shop_id INT NULL AFTER tenant_id;

UPDATE expense_records er
JOIN shops s ON er.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET er.shop_id = s.id
WHERE er.shop_id IS NULL;

ALTER TABLE expense_records MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE expense_records ADD INDEX IF NOT EXISTS idx_shop_id (shop_id);

-- ============================================================================
-- 8. Add 'shop_id' to PROFIT_RECORDS table
-- ============================================================================

ALTER TABLE profit_records ADD COLUMN IF NOT EXISTS shop_id INT NULL AFTER tenant_id;

UPDATE profit_records pr
JOIN shops s ON pr.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET pr.shop_id = s.id
WHERE pr.shop_id IS NULL;

ALTER TABLE profit_records MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE profit_records ADD INDEX IF NOT EXISTS idx_shop_id (shop_id);

-- Update unique constraint for profit records
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = 'profit_records' AND index_name = 'unique_tenant_date' AND table_schema = DATABASE());
SET @sql := IF(@exist > 0, 'ALTER TABLE profit_records DROP INDEX unique_tenant_date', 'SELECT "Index unique_tenant_date not found"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE profit_records ADD UNIQUE KEY IF NOT EXISTS unique_shop_date (shop_id, date);

-- ============================================================================
-- 9. Add 'shop_id' to REPORTS table
-- ============================================================================

ALTER TABLE reports ADD COLUMN IF NOT EXISTS shop_id INT NULL AFTER tenant_id;

UPDATE reports r
JOIN shops s ON r.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET r.shop_id = s.id
WHERE r.shop_id IS NULL;

ALTER TABLE reports MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE reports ADD INDEX IF NOT EXISTS idx_shop_id (shop_id);

-- ============================================================================
-- 10. Add 'shop_id' to ACTIVITY_LOGS table
-- ============================================================================

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS shop_id INT NULL AFTER tenant_id;

UPDATE activity_logs al
JOIN shops s ON al.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET al.shop_id = s.id
WHERE al.shop_id IS NULL;

ALTER TABLE activity_logs ADD INDEX IF NOT EXISTS idx_shop_id (shop_id);

-- ============================================================================
-- 11. Add 'shop_id' to SESSIONS table (if exists)
-- ============================================================================

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS shop_id INT NULL AFTER tenant_id;

UPDATE sessions sess
JOIN shops s ON sess.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET sess.shop_id = s.id
WHERE sess.shop_id IS NULL;

ALTER TABLE sessions ADD INDEX IF NOT EXISTS idx_shop_id (shop_id);

-- ============================================================================
-- Re-enable Checks & Commit
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

SELECT '✅ Migration Version 1.1 Completed Successfully!' AS Status;
