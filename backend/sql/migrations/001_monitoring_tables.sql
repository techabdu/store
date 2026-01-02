-- =====================================================
-- Migration: 001 - Monitoring Tables
-- Description: Create comprehensive monitoring and logging tables
-- Author: SuperAdmin Monitoring System
-- Date: 2026-01-02
-- =====================================================

USE store;

-- =====================================================
-- Table 1: application_errors
-- Purpose: Comprehensive error logging with context
-- =====================================================

CREATE TABLE IF NOT EXISTS application_errors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Context identifiers
    tenant_id INT UNSIGNED NULL,
    user_id INT UNSIGNED NULL,
    shop_id INT UNSIGNED NULL,
    
    -- Error details
    error_level ENUM('warning', 'error', 'critical') NOT NULL DEFAULT 'error',
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    error_code VARCHAR(20) NULL,
    
    -- Source location
    file_path VARCHAR(500) NULL,
    line_number INT NULL,
    stack_trace TEXT NULL,
    
    -- Request context
    request_url VARCHAR(500) NULL,
    request_method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS') NULL,
    
    -- Client information
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    -- Additional context (JSON format)
    context JSON NULL,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_error_level (error_level),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_error_type (error_type),
    INDEX idx_composite_tenant_date (tenant_id, created_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Comprehensive application error logging with full context';

-- =====================================================
-- Table 2: api_request_logs
-- Purpose: Track API performance and usage patterns
-- =====================================================

CREATE TABLE IF NOT EXISTS api_request_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Context identifiers
    tenant_id INT UNSIGNED NULL,
    user_id INT UNSIGNED NULL,
    shop_id INT UNSIGNED NULL,
    
    -- Request details
    endpoint VARCHAR(500) NOT NULL,
    http_method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS') NOT NULL,
    
    -- Performance metrics
    status_code INT NOT NULL,
    response_time_ms INT NOT NULL COMMENT 'Response time in milliseconds',
    
    -- Size metrics
    request_size_bytes INT NULL,
    response_size_bytes INT NULL,
    
    -- Client information
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    -- Error tracking
    is_error TINYINT(1) DEFAULT 0 COMMENT '1 if status code >= 400',
    
    -- Module categorization
    module VARCHAR(50) NULL COMMENT 'inventory, sales, marketplace, admin, etc.',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_endpoint (endpoint(255)),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_is_error (is_error),
    INDEX idx_module (module),
    INDEX idx_composite_module_date (module, created_at),
    INDEX idx_composite_tenant_date (tenant_id, created_at),
    INDEX idx_status_code (status_code)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='API request logging for performance monitoring and analytics';

-- =====================================================
-- Table 3: metrics_hourly
-- Purpose: Pre-aggregated hourly metrics for fast queries
-- =====================================================

CREATE TABLE IF NOT EXISTS metrics_hourly (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Time bucket
    hour_timestamp TIMESTAMP NOT NULL COMMENT 'Start of the hour (e.g., 2026-01-02 14:00:00)',
    
    -- Metric identification
    metric_type VARCHAR(50) NOT NULL COMMENT 'api_requests, errors, revenue, active_users, etc.',
    
    -- Metric values
    metric_value DECIMAL(20, 2) DEFAULT 0.00 COMMENT 'Primary metric value',
    count INT DEFAULT 0 COMMENT 'Number of events aggregated',
    
    -- Additional data (JSON format)
    metadata JSON NULL COMMENT 'Additional metric-specific data',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicates
    UNIQUE KEY unique_hour_metric (hour_timestamp, metric_type),
    
    -- Indexes for performance
    INDEX idx_metric_type (metric_type),
    INDEX idx_hour_timestamp (hour_timestamp),
    INDEX idx_composite_type_time (metric_type, hour_timestamp)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Hourly aggregated metrics for performance dashboards';

-- =====================================================
-- Table 4: metrics_daily
-- Purpose: Pre-aggregated daily metrics for trend analysis
-- =====================================================

CREATE TABLE IF NOT EXISTS metrics_daily (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Time bucket
    date DATE NOT NULL COMMENT 'Date of the metric (e.g., 2026-01-02)',
    
    -- Metric identification
    metric_type VARCHAR(50) NOT NULL COMMENT 'api_requests, errors, revenue, active_users, etc.',
    
    -- Metric values
    metric_value DECIMAL(20, 2) DEFAULT 0.00 COMMENT 'Primary metric value',
    count INT DEFAULT 0 COMMENT 'Number of events aggregated',
    
    -- Additional data (JSON format)
    metadata JSON NULL COMMENT 'Additional metric-specific data',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicates
    UNIQUE KEY unique_date_metric (date, metric_type),
    
    -- Indexes for performance
    INDEX idx_metric_type (metric_type),
    INDEX idx_date (date),
    INDEX idx_composite_type_date (metric_type, date)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Daily aggregated metrics for trend analysis and reporting';

-- =====================================================
-- Table 5: email_notifications
-- Purpose: Track email notifications sent by the system
-- =====================================================

CREATE TABLE IF NOT EXISTS email_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Email details
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    
    -- Notification type
    notification_type ENUM('alert', 'report', 'system', 'retention', 'support') NOT NULL DEFAULT 'system',
    
    -- Status tracking
    status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    
    -- Timestamps
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Error tracking
    error_message TEXT NULL COMMENT 'Error message if sending failed',
    
    -- Retry tracking
    retry_count INT DEFAULT 0 COMMENT 'Number of retry attempts',
    
    -- Indexes for performance
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_notification_type (notification_type),
    INDEX idx_recipient (recipient_email),
    INDEX idx_composite_status_created (status, created_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Email notification tracking and queue management';

-- =====================================================
-- Verification Queries
-- =====================================================

-- Show all created tables
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME,
    TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'store'
AND TABLE_NAME IN (
    'application_errors',
    'api_request_logs',
    'metrics_hourly',
    'metrics_daily',
    'email_notifications'
)
ORDER BY TABLE_NAME;

-- =====================================================
-- Migration Complete
-- =====================================================
-- All 5 monitoring tables created successfully
-- Ready for Phase 1 Day 3: EventLogger & Error Handlers
-- =====================================================
