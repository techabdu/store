-- Performance Optimization & Indexing
-- Created: 2026-01-04
-- Purpose: Add indexes to frequently queried columns to improve SuperAdmin dashboard performance

-- ============================================
-- 1. Activity Logs Optimization
-- ============================================
ALTER TABLE activity_logs ADD INDEX IF NOT EXISTS idx_tenant_created (tenant_id, created_at);
ALTER TABLE activity_logs ADD INDEX IF NOT EXISTS idx_user_created (user_id, created_at);
ALTER TABLE activity_logs ADD INDEX IF NOT EXISTS idx_action (action);

-- ============================================
-- 2. Transactions Optimization
-- ============================================
ALTER TABLE transactions ADD INDEX IF NOT EXISTS idx_tenant_created (tenant_id, created_at);

-- ============================================
-- 3. Inventory Optimization
-- ============================================
-- Since it's IMEI based, we filter by status and listing
ALTER TABLE inventory ADD INDEX IF NOT EXISTS idx_tenant_status (tenant_id, status);
ALTER TABLE inventory ADD INDEX IF NOT EXISTS idx_tenant_listed (tenant_id, is_listed);

-- ============================================
-- 4. Support Tickets Optimization
-- ============================================
ALTER TABLE support_tickets ADD INDEX IF NOT EXISTS idx_tenant_status_created (tenant_id, status, created_at);

-- ============================================
-- 5. Users List Optimization
-- ============================================
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_tenant_role_status (tenant_id, role, status);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_tenant_created (tenant_id, created_at);

-- ============================================
-- 6. SuperAdmin Notes & Notifications
-- ============================================
ALTER TABLE superadmin_notes ADD INDEX IF NOT EXISTS idx_tenant_type (tenant_id, note_type);
ALTER TABLE tenant_notifications ADD INDEX IF NOT EXISTS idx_tenant_resolved (tenant_id, is_resolved);
