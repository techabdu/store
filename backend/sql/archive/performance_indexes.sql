-- ============================================================================
-- PERFORMANCE OPTIMIZATION - Composite Indexes
-- ============================================================================
-- This script creates composite indexes for common query patterns
-- These indexes improve query performance for multi-tenant queries
-- 
-- Run this script AFTER the multi-tenancy migration
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================================

-- Inventory: tenant_id + status (used in filtering inventory by status)
-- Improves: SELECT * FROM inventory WHERE tenant_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_status 
ON inventory(tenant_id, status);

-- Inventory: tenant_id + created_at (used in sorting inventory by date)
-- Improves: SELECT * FROM inventory WHERE tenant_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_created 
ON inventory(tenant_id, created_at DESC);

-- Transactions: tenant_id + created_at (used in sorting transactions by date)
-- Improves: SELECT * FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_created 
ON transactions(tenant_id, created_at DESC);

-- Expenses: tenant_id + date (used in filtering/sorting expenses)
-- Improves: SELECT * FROM expenses WHERE tenant_id = ? ORDER BY date DESC
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date 
ON expenses(tenant_id, date DESC);

-- Transaction items: tenant_id + transaction_id (used in JOINs)
-- Improves: SELECT * FROM transaction_items WHERE tenant_id = ? AND transaction_id = ?
CREATE INDEX IF NOT EXISTS idx_transaction_items_tenant_txn 
ON transaction_items(tenant_id, transaction_id);

-- Activity logs: tenant_id + created_at (used for recent activity queries)
-- Improves: SELECT * FROM activity_logs WHERE tenant_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_created 
ON activity_logs(tenant_id, created_at DESC);

-- Verify indexes were created
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME LIKE 'idx_%_tenant_%'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

SELECT '✅ Performance indexes created successfully!' AS Status;
SELECT 'These indexes will improve query performance for all tenants' AS Info;
