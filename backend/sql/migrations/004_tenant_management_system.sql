-- Tenant Management System Migration
-- Created: 2026-01-03
-- Purpose: Create tables for comprehensive tenant management, impersonation, and notifications

-- ============================================
-- Table 1: superadmin_notes
-- ============================================
CREATE TABLE IF NOT EXISTS superadmin_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    created_by INT NOT NULL,
    note_type ENUM('general', 'billing', 'support', 'technical', 'sales') DEFAULT 'general',
    content TEXT NOT NULL,
    is_pinned TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_pinned (is_pinned),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 2: tenant_impersonation_logs
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_impersonation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    superadmin_id INT NOT NULL,
    tenant_id INT NOT NULL,
    impersonated_user_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    duration_seconds INT,
    actions_performed INT DEFAULT 0,
    ip_address VARCHAR(45),
    reason TEXT,
    FOREIGN KEY (superadmin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (impersonated_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_superadmin (superadmin_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_impersonated (impersonated_user_id),
    INDEX idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 3: tenant_feature_access
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_feature_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    is_enabled TINYINT(1) DEFAULT 1,
    custom_limit INT NULL,
    notes TEXT,
    modified_by INT NOT NULL,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (modified_by) REFERENCES users(id),
    UNIQUE KEY unique_tenant_feature (tenant_id, feature_key),
    INDEX idx_tenant (tenant_id),
    INDEX idx_feature (feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 4: tenant_notifications
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    notification_type ENUM('error', 'downtime', 'critical_issue', 'warning', 'info') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_resolved TINYINT(1) DEFAULT 0,
    resolved_at TIMESTAMP NULL,
    resolved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_unresolved (is_resolved),
    INDEX idx_severity (severity),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table Updates: Add tracking fields to tenants
-- ============================================
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS total_logins INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_used_mb DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS api_calls_today INT DEFAULT 0;

-- Add indexes for new columns
ALTER TABLE tenants
ADD INDEX IF NOT EXISTS idx_last_login (last_login_at);

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify tables were created successfully:
-- SHOW TABLES LIKE '%tenant%';
-- DESCRIBE superadmin_notes;
-- DESCRIBE tenant_impersonation_logs;
-- DESCRIBE tenant_feature_access;
-- DESCRIBE tenant_notifications;
-- DESCRIBE tenants;
