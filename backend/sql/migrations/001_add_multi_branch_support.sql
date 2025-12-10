-- ============================================================================
-- MIGRATION: Add Multi-Branch Shop Support
-- Version: 001
-- Date: 2024-12-09
-- ============================================================================
-- 
-- This migration adds support for multiple branch locations per tenant.
-- 
-- BEFORE RUNNING:
-- 1. Backup your database: mysqldump -u root -p store > backup_before_multi_branch.sql
-- 2. Test on development/staging first
-- 
-- WHAT THIS MIGRATION DOES:
-- 1. Creates new 'shops' table for branch locations
-- 2. Adds 'shop_id' column to users table
-- 3. Adds 'shop_id' column to all data tables (inventory, transactions, etc.)
-- 4. Migrates existing data to become "first branch" of each tenant
--
-- ROLLBACK: Use 001_rollback_multi_branch.sql if needed
-- ============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Start transaction for safety
START TRANSACTION;

-- ============================================================================
-- STEP 1: Create the 'shops' table
-- ============================================================================

CREATE TABLE IF NOT EXISTS shops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Parent business/tenant that owns this branch',
    
    -- Shop/Branch Details
    shop_name VARCHAR(100) NOT NULL COMMENT 'Branch name (e.g., Lagos Main Branch)',
    shop_address TEXT NULL COMMENT 'Physical address of this branch',
    shop_phone VARCHAR(20) NULL COMMENT 'Branch contact phone number',
    shop_email VARCHAR(100) NULL COMMENT 'Branch email (optional, can differ from tenant email)',
    
    -- Business Settings (per branch)
    business_capital DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Capital allocated to this branch',
    
    -- Status
    status ENUM('active', 'suspended') DEFAULT 'active' COMMENT 'Branch operational status',
    is_main_branch TINYINT(1) DEFAULT 0 COMMENT '1 if this is the primary/first branch',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys & Indexes
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_status (status),
    INDEX idx_is_main_branch (is_main_branch),
    INDEX idx_shops_tenant_status (tenant_id, status) COMMENT 'Composite index for active shops lookup'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Physical branch locations under each tenant (business owner)';

-- ============================================================================
-- STEP 2: Migrate existing tenant data to create first shop for each tenant
-- ============================================================================

INSERT INTO shops (tenant_id, shop_name, shop_address, shop_phone, shop_email, business_capital, status, is_main_branch, created_at)
SELECT 
    id AS tenant_id,
    shop_name,
    shop_address,
    shop_phone,
    shop_email,
    business_capital,
    CASE 
        WHEN status IN ('active', 'trial') THEN 'active' 
        ELSE 'suspended' 
    END AS status,
    1 AS is_main_branch,  -- All existing shops become main branch
    created_at
FROM tenants
WHERE id NOT IN (SELECT DISTINCT tenant_id FROM shops);  -- Avoid duplicates if run again

-- ============================================================================
-- STEP 3: Add shop_id column to users table
-- ============================================================================

-- Add column (NULL means owner-level admin who can access all branches)
ALTER TABLE users 
ADD COLUMN shop_id INT NULL COMMENT 'Branch assignment: NULL=Owner (all branches), Non-NULL=Specific branch only' 
AFTER tenant_id;

-- Add foreign key constraint
ALTER TABLE users
ADD CONSTRAINT fk_users_shop_id 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for performance
ALTER TABLE users ADD INDEX idx_shop_id (shop_id);

-- Update existing users:
-- - Admins become owners (shop_id = NULL) - they can access all branches
-- - Staff users get assigned to their tenant's main branch
UPDATE users u
JOIN shops s ON u.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET u.shop_id = s.id
WHERE u.role = 'user';

-- Admins stay with shop_id = NULL (already NULL by default)

-- ============================================================================
-- STEP 4: Add shop_id column to inventory table
-- ============================================================================

ALTER TABLE inventory 
ADD COLUMN shop_id INT NULL COMMENT 'Which branch this inventory item belongs to' 
AFTER tenant_id;

-- Update existing inventory to main branch
UPDATE inventory i
JOIN shops s ON i.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET i.shop_id = s.id;

-- Make shop_id NOT NULL after migration
ALTER TABLE inventory MODIFY COLUMN shop_id INT NOT NULL;

-- Add foreign key
ALTER TABLE inventory
ADD CONSTRAINT fk_inventory_shop_id 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes
ALTER TABLE inventory ADD INDEX idx_shop_id (shop_id);
ALTER TABLE inventory ADD INDEX idx_inventory_shop_status (shop_id, status) COMMENT 'Composite for shop inventory queries';

-- Update unique constraint to be per-shop instead of per-tenant
ALTER TABLE inventory DROP INDEX unique_tenant_imei;
ALTER TABLE inventory ADD UNIQUE KEY unique_shop_imei (shop_id, imei) COMMENT 'IMEI must be unique within each branch';

-- ============================================================================
-- STEP 5: Add shop_id column to transactions table
-- ============================================================================

ALTER TABLE transactions 
ADD COLUMN shop_id INT NULL COMMENT 'Which branch this transaction belongs to' 
AFTER tenant_id;

-- Update existing transactions to main branch
UPDATE transactions t
JOIN shops s ON t.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET t.shop_id = s.id;

-- Make shop_id NOT NULL after migration
ALTER TABLE transactions MODIFY COLUMN shop_id INT NOT NULL;

-- Add foreign key
ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_shop_id 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index
ALTER TABLE transactions ADD INDEX idx_shop_id (shop_id);
ALTER TABLE transactions ADD INDEX idx_transactions_shop_created (shop_id, created_at DESC) COMMENT 'Composite for shop transaction queries';

-- ============================================================================
-- STEP 6: Add shop_id column to transaction_items table
-- ============================================================================

ALTER TABLE transaction_items 
ADD COLUMN shop_id INT NULL COMMENT 'Which branch this item belongs to' 
AFTER tenant_id;

-- Update existing items to main branch
UPDATE transaction_items ti
JOIN shops s ON ti.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET ti.shop_id = s.id;

-- Make shop_id NOT NULL after migration
ALTER TABLE transaction_items MODIFY COLUMN shop_id INT NOT NULL;

-- Add foreign key
ALTER TABLE transaction_items
ADD CONSTRAINT fk_transaction_items_shop_id 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index
ALTER TABLE transaction_items ADD INDEX idx_shop_id (shop_id);

-- ============================================================================
-- STEP 7: Add shop_id column to expenses table
-- ============================================================================

ALTER TABLE expenses 
ADD COLUMN shop_id INT NULL COMMENT 'Which branch this expense belongs to' 
AFTER tenant_id;

-- Update existing expenses to main branch
UPDATE expenses e
JOIN shops s ON e.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET e.shop_id = s.id;

-- Make shop_id NOT NULL after migration
ALTER TABLE expenses MODIFY COLUMN shop_id INT NOT NULL;

-- Add foreign key
ALTER TABLE expenses
ADD CONSTRAINT fk_expenses_shop_id 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index
ALTER TABLE expenses ADD INDEX idx_shop_id (shop_id);
ALTER TABLE expenses ADD INDEX idx_expenses_shop_date (shop_id, date DESC) COMMENT 'Composite for shop expense queries';

-- ============================================================================
-- STEP 8: Add shop_id column to profit_records table
-- ============================================================================

ALTER TABLE profit_records 
ADD COLUMN shop_id INT NULL COMMENT 'Which branch this profit record belongs to' 
AFTER tenant_id;

-- Update existing records to main branch
UPDATE profit_records pr
JOIN shops s ON pr.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET pr.shop_id = s.id;

-- Make shop_id NOT NULL after migration
ALTER TABLE profit_records MODIFY COLUMN shop_id INT NOT NULL;

-- Add foreign key
ALTER TABLE profit_records
ADD CONSTRAINT fk_profit_records_shop_id 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index
ALTER TABLE profit_records ADD INDEX idx_shop_id (shop_id);

-- Update unique constraint to be per-shop instead of per-tenant
ALTER TABLE profit_records DROP INDEX unique_tenant_date;
ALTER TABLE profit_records ADD UNIQUE KEY unique_shop_date (shop_id, date) COMMENT 'One profit record per branch per day';

-- ============================================================================
-- STEP 9: Add shop_id column to reports table
-- ============================================================================

ALTER TABLE reports 
ADD COLUMN shop_id INT NULL COMMENT 'Which branch this report belongs to' 
AFTER tenant_id;

-- Update existing reports to main branch
UPDATE reports r
JOIN shops s ON r.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET r.shop_id = s.id;

-- Make shop_id NOT NULL after migration
ALTER TABLE reports MODIFY COLUMN shop_id INT NOT NULL;

-- Add foreign key
ALTER TABLE reports
ADD CONSTRAINT fk_reports_shop_id 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index
ALTER TABLE reports ADD INDEX idx_shop_id (shop_id);

-- ============================================================================
-- STEP 10: Add shop_id column to activity_logs table
-- ============================================================================

ALTER TABLE activity_logs 
ADD COLUMN shop_id INT NULL COMMENT 'Which branch this activity occurred in (NULL for tenant-level actions)' 
AFTER tenant_id;

-- Update existing logs to main branch
UPDATE activity_logs al
JOIN shops s ON al.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET al.shop_id = s.id;

-- Note: Keep shop_id as NULL allowed for tenant-level actions
-- Add foreign key with SET NULL on delete
ALTER TABLE activity_logs
ADD CONSTRAINT fk_activity_logs_shop_id 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index
ALTER TABLE activity_logs ADD INDEX idx_shop_id (shop_id);

-- ============================================================================
-- STEP 11: Add shop_id column to sessions table (if exists and in use)
-- ============================================================================

ALTER TABLE sessions 
ADD COLUMN shop_id INT NULL COMMENT 'Current active shop for this session' 
AFTER tenant_id;

-- Update existing sessions to main branch
UPDATE sessions sess
JOIN shops s ON sess.tenant_id = s.tenant_id AND s.is_main_branch = 1
SET sess.shop_id = s.id;

-- Add foreign key
ALTER TABLE sessions
ADD CONSTRAINT fk_sessions_shop_id 
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index
ALTER TABLE sessions ADD INDEX idx_shop_id (shop_id);

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify migration)
-- ============================================================================

-- Check shops were created correctly:
-- SELECT t.shop_name as tenant_name, s.shop_name as shop_name, s.is_main_branch 
-- FROM tenants t 
-- LEFT JOIN shops s ON t.id = s.tenant_id;

-- Check users have correct shop assignments:
-- SELECT u.username, u.role, u.shop_id, s.shop_name 
-- FROM users u 
-- LEFT JOIN shops s ON u.shop_id = s.id;

-- Check inventory migration:
-- SELECT COUNT(*) as total, shop_id FROM inventory GROUP BY shop_id;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT '============================================' AS '';
SELECT '✅ MULTI-BRANCH MIGRATION COMPLETE!' AS '';
SELECT '============================================' AS '';
SELECT 'New table created: shops' AS '';
SELECT 'shop_id added to: users, inventory, transactions, transaction_items, expenses, profit_records, reports, activity_logs, sessions' AS '';
SELECT 'All existing data migrated to main branch of each tenant' AS '';
SELECT '' AS '';
SELECT '⚠️  NEXT STEPS:' AS '';
SELECT '1. Update backend API endpoints to use shop_id' AS '';
SELECT '2. Update frontend to support shop switching' AS '';
SELECT '3. Test thoroughly before deploying to production' AS '';
SELECT '============================================' AS '';
