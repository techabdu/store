-- ============================================================================
-- PRODUCTION DATABASE VERIFICATION SCRIPT
-- ============================================================================
-- This script verifies your production database has all required indexes
-- and security measures for multi-tenancy performance and isolation.
--
-- Run this on your PRODUCTION database to check everything is set up correctly
-- Usage: mysql -u your_user -p your_database < verify_production_db.sql
-- ============================================================================

SELECT '========================================' AS '';
SELECT '🔍 PRODUCTION DATABASE VERIFICATION' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';

-- ============================================================================
-- STEP 1: Verify Multi-Tenancy Migration Completed
-- ============================================================================
SELECT '📋 STEP 1: Checking Multi-Tenancy Migration' AS '';
SELECT '-------------------------------------------' AS '';

-- Check if tenants table exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ tenants table exists'
        ELSE '❌ tenants table MISSING - Run PRODUCTION_MIGRATION.sql first!'
    END AS Status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'tenants';

-- Check if tenant_id columns exist in all tables
SELECT 
    TABLE_NAME,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has tenant_id column'
        ELSE '❌ MISSING tenant_id column'
    END AS Status
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('users', 'inventory', 'transactions', 'transaction_items', 'expenses', 'activity_logs')
AND COLUMN_NAME = 'tenant_id'
GROUP BY TABLE_NAME
UNION
SELECT 
    t.table_name,
    '❌ Table missing tenant_id' AS Status
FROM information_schema.tables t
WHERE t.table_schema = DATABASE()
AND t.table_name IN ('users', 'inventory', 'transactions', 'transaction_items', 'expenses', 'activity_logs')
AND NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS c
    WHERE c.TABLE_SCHEMA = DATABASE()
    AND c.TABLE_NAME = t.table_name
    AND c.COLUMN_NAME = 'tenant_id'
)
ORDER BY TABLE_NAME;

SELECT '' AS '';

-- ============================================================================
-- STEP 2: Verify Base Indexes (tenant_id)
-- ============================================================================
SELECT '📊 STEP 2: Checking Base tenant_id Indexes' AS '';
SELECT '--------------------------------------------' AS '';

SELECT 
    TABLE_NAME,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ idx_tenant_id exists'
        ELSE '❌ MISSING idx_tenant_id - Run PRODUCTION_MIGRATION.sql'
    END AS Status
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('users', 'inventory', 'transactions', 'transaction_items', 'expenses', 'activity_logs', 'sessions', 'security_logs')
AND INDEX_NAME = 'idx_tenant_id'
GROUP BY TABLE_NAME
UNION
SELECT 
    t.table_name,
    '❌ Missing idx_tenant_id' AS Status
FROM information_schema.tables t
WHERE t.table_schema = DATABASE()
AND t.table_name IN ('users', 'inventory', 'transactions', 'transaction_items', 'expenses', 'activity_logs', 'sessions', 'security_logs')
AND NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS s
    WHERE s.TABLE_SCHEMA = DATABASE()
    AND s.TABLE_NAME = t.table_name
    AND s.INDEX_NAME = 'idx_tenant_id'
)
ORDER BY TABLE_NAME;

SELECT '' AS '';

-- ============================================================================
-- STEP 3: Verify Composite Performance Indexes
-- ============================================================================
SELECT '⚡ STEP 3: Checking Composite Performance Indexes' AS '';
SELECT '---------------------------------------------------' AS '';

-- Check each composite index
SELECT 
    'idx_inventory_tenant_status' AS Index_Name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run performance_indexes.sql'
    END AS Status
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND INDEX_NAME = 'idx_inventory_tenant_status'

UNION ALL

SELECT 
    'idx_inventory_tenant_created' AS Index_Name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run performance_indexes.sql'
    END AS Status
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND INDEX_NAME = 'idx_inventory_tenant_created'

UNION ALL

SELECT 
    'idx_transactions_tenant_created' AS Index_Name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run performance_indexes.sql'
    END AS Status
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND INDEX_NAME = 'idx_transactions_tenant_created'

UNION ALL

SELECT 
    'idx_expenses_tenant_date' AS Index_Name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run performance_indexes.sql'
    END AS Status
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND INDEX_NAME = 'idx_expenses_tenant_date'

UNION ALL

SELECT 
    'idx_transaction_items_tenant_txn' AS Index_Name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run performance_indexes.sql'
    END AS Status
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND INDEX_NAME = 'idx_transaction_items_tenant_txn'

UNION ALL

SELECT 
    'idx_activity_logs_tenant_created' AS Index_Name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run performance_indexes.sql'
    END AS Status
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND INDEX_NAME = 'idx_activity_logs_tenant_created';

SELECT '' AS '';

-- ============================================================================
-- STEP 4: Verify Foreign Key Constraints
-- ============================================================================
SELECT '🔗 STEP 4: Checking Foreign Key Constraints' AS '';
SELECT '-------------------------------------------' AS '';

SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    CASE 
        WHEN CONSTRAINT_NAME LIKE '%tenant%' THEN '✅ Tenant FK exists'
        ELSE 'ℹ️  Other FK'
    END AS Status
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
AND CONSTRAINT_TYPE = 'FOREIGN KEY'
AND CONSTRAINT_NAME LIKE '%tenant%'
ORDER BY TABLE_NAME;

SELECT '' AS '';

-- ============================================================================
-- STEP 5: Check Data Integrity
-- ============================================================================
SELECT '🔒 STEP 5: Checking Data Integrity' AS '';
SELECT '------------------------------------' AS '';

-- Check for orphaned records (records without valid tenant_id)
SELECT 
    'users' AS Table_Name,
    COUNT(*) AS Orphaned_Records,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '⚠️  Has orphaned records - needs cleanup'
    END AS Status
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = u.tenant_id)

UNION ALL

SELECT 
    'inventory' AS Table_Name,
    COUNT(*) AS Orphaned_Records,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '⚠️  Has orphaned records - needs cleanup'
    END AS Status
FROM inventory i
WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = i.tenant_id)

UNION ALL

SELECT 
    'transactions' AS Table_Name,
    COUNT(*) AS Orphaned_Records,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '⚠️  Has orphaned records - needs cleanup'
    END AS Status
FROM transactions tr
WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = tr.tenant_id)

UNION ALL

SELECT 
    'expenses' AS Table_Name,
    COUNT(*) AS Orphaned_Records,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '⚠️  Has orphaned records - needs cleanup'
    END AS Status
FROM expenses e
WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = e.tenant_id);

SELECT '' AS '';

-- ============================================================================
-- STEP 6: Performance Statistics
-- ============================================================================
SELECT '📈 STEP 6: Database Statistics' AS '';
SELECT '-------------------------------' AS '';

SELECT 
    t.shop_name AS Tenant,
    COUNT(DISTINCT i.id) AS Inventory_Items,
    COUNT(DISTINCT tr.id) AS Transactions,
    COUNT(DISTINCT e.id) AS Expenses,
    COUNT(DISTINCT u.id) AS Users
FROM tenants t
LEFT JOIN inventory i ON t.id = i.tenant_id
LEFT JOIN transactions tr ON t.id = tr.tenant_id
LEFT JOIN expenses e ON t.id = e.tenant_id
LEFT JOIN users u ON t.id = u.tenant_id
GROUP BY t.id, t.shop_name
ORDER BY Inventory_Items DESC;

SELECT '' AS '';

-- ============================================================================
-- STEP 7: Index Usage Statistics (if available)
-- ============================================================================
SELECT '📊 STEP 7: Index Coverage Summary' AS '';
SELECT '-----------------------------------' AS '';

SELECT 
    TABLE_NAME,
    COUNT(DISTINCT INDEX_NAME) AS Total_Indexes,
    SUM(CASE WHEN INDEX_NAME LIKE 'idx_%tenant%' THEN 1 ELSE 0 END) AS Tenant_Indexes,
    CASE 
        WHEN SUM(CASE WHEN INDEX_NAME LIKE 'idx_%tenant%' THEN 1 ELSE 0 END) >= 1 
        THEN '✅ Has tenant indexes'
        ELSE '⚠️  Missing tenant indexes'
    END AS Status
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('users', 'inventory', 'transactions', 'transaction_items', 'expenses', 'activity_logs')
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;

SELECT '' AS '';

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
SELECT '========================================' AS '';
SELECT '✅ VERIFICATION COMPLETE' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';
SELECT 'Review the results above:' AS '';
SELECT '- All ✅ marks = Production ready!' AS '';
SELECT '- Any ❌ marks = Action required' AS '';
SELECT '- Any ⚠️  marks = Review recommended' AS '';
SELECT '' AS '';
SELECT 'Next steps if issues found:' AS '';
SELECT '1. Run PRODUCTION_MIGRATION.sql for missing tenant_id' AS '';
SELECT '2. Run performance_indexes.sql for missing indexes' AS '';
SELECT '3. Contact support if orphaned records found' AS '';
SELECT '' AS '';
