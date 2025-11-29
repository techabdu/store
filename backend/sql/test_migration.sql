-- Test Migration Script
-- Run this to verify the migration was successful

-- Check if tenants table exists and has data
SELECT 'Checking tenants table...' AS Test;
SELECT COUNT(*) AS tenant_count, 
       (SELECT COUNT(*) FROM tenants WHERE id = 1) AS default_tenant_exists
FROM tenants;

-- Check if tenant_id column exists in all tables
SELECT 'Checking tenant_id columns...' AS Test;
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLUMN_NAME = 'tenant_id'
ORDER BY TABLE_NAME;

-- Check if all existing data is assigned to default tenant
SELECT 'Checking data migration to default tenant...' AS Test;

SELECT 'users' AS table_name, 
       COUNT(*) AS total_records, 
       SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END) AS assigned_to_default,
       SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) AS null_tenant_id
FROM users
UNION ALL
SELECT 'inventory', 
       COUNT(*), 
       SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END), 
       SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) 
FROM inventory
UNION ALL
SELECT 'transactions', 
       COUNT(*), 
       SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END), 
       SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) 
FROM transactions
UNION ALL
SELECT 'transaction_items', 
       COUNT(*), 
       SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END), 
       SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) 
FROM transaction_items
UNION ALL
SELECT 'expenses', 
       COUNT(*), 
       SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END), 
       SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) 
FROM expenses
UNION ALL
SELECT 'activity_logs', 
       COUNT(*), 
       SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END), 
       SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) 
FROM activity_logs
UNION ALL
SELECT 'sessions', 
       COUNT(*), 
       SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END), 
       SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) 
FROM sessions;

-- Check foreign key constraints
SELECT 'Checking foreign key constraints...' AS Test;
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND REFERENCED_TABLE_NAME = 'tenants'
ORDER BY TABLE_NAME;

-- Check indexes
SELECT 'Checking indexes on tenant_id...' AS Test;
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND COLUMN_NAME = 'tenant_id'
ORDER BY TABLE_NAME;

-- Check if shop_settings table was dropped
SELECT 'Checking if shop_settings was dropped...' AS Test;
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'shop_settings table successfully dropped'
        ELSE 'WARNING: shop_settings table still exists'
    END AS status
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'shop_settings';

-- Check if business_capital was migrated to tenants
SELECT 'Checking business_capital migration...' AS Test;
SELECT 
    id,
    shop_name,
    business_capital
FROM tenants
WHERE id = 1;

SELECT 'Migration verification complete!' AS Status;
SELECT 'Review the results above. All records should be assigned to tenant_id = 1' AS Note;
