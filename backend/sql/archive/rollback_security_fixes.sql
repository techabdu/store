-- ============================================================================
-- ROLLBACK SCRIPT - Multi-Tenancy Security Fixes
-- ============================================================================
-- This script reverts the security and performance fixes if needed
-- Run this ONLY if you need to rollback the changes
-- 
-- IMPORTANT: This does NOT revert code changes, only database changes
-- To fully rollback, you'll need to use Git to revert the PHP file changes
-- ============================================================================

-- Drop composite indexes (if they cause issues)
DROP INDEX IF EXISTS idx_inventory_tenant_status ON inventory;
DROP INDEX IF EXISTS idx_inventory_tenant_created ON inventory;
DROP INDEX IF EXISTS idx_transactions_tenant_created ON transactions;
DROP INDEX IF EXISTS idx_expenses_tenant_date ON expenses;
DROP INDEX IF EXISTS idx_transaction_items_tenant_txn ON transaction_items;

-- Note: Code changes to PHP files must be reverted via Git
-- Use: git log --oneline to find the commit before security fixes
-- Then: git revert <commit-hash>

SELECT '✅ Database indexes rolled back successfully!' AS Status;
SELECT 'To fully rollback, revert PHP code changes using Git' AS Info;
