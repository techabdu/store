-- System Insights Database Schema
-- Creates tables for monitoring application health, security, and performance

-- ============================================
-- Table: system_alerts
-- Purpose: Store system-generated alerts with severity levels
-- ============================================
CREATE TABLE IF NOT EXISTS system_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL COMMENT 'Alert category: security, database, performance, business',
    severity ENUM('critical', 'warning', 'info') NOT NULL DEFAULT 'info',
    message VARCHAR(255) NOT NULL COMMENT 'Brief alert description',
    details TEXT COMMENT 'Additional alert information in JSON format',
    resolved BOOLEAN DEFAULT FALSE COMMENT 'Whether alert has been addressed',
    resolved_at DATETIME DEFAULT NULL,
    resolved_by INT DEFAULT NULL COMMENT 'User ID who resolved the alert',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_severity (severity),
    INDEX idx_resolved (resolved),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: security_logs
-- Purpose: Track security events (failed logins, suspicious activities)
-- ============================================
CREATE TABLE IF NOT EXISTS security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM('failed_login', 'suspicious_activity', 'session_hijack', 'brute_force', 'unauthorized_access') NOT NULL,
    username VARCHAR(100) COMMENT 'Username involved in the event',
    user_id INT DEFAULT NULL COMMENT 'User ID if authenticated',
    ip_address VARCHAR(45) NOT NULL COMMENT 'IPv4 or IPv6 address',
    user_agent TEXT COMMENT 'Browser/client information',
    details TEXT COMMENT 'Additional event details in JSON format',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_username (username),
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: system_metrics
-- Purpose: Cache expensive computed metrics for performance
-- ============================================
CREATE TABLE IF NOT EXISTS system_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_type VARCHAR(100) NOT NULL COMMENT 'Type of metric: db_size, table_stats, api_performance, etc.',
    metric_data TEXT NOT NULL COMMENT 'Metric values in JSON format',
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL COMMENT 'Cache expiration time (5 minutes from cached_at)',
    INDEX idx_metric_type (metric_type),
    INDEX idx_expires_at (expires_at),
    UNIQUE KEY unique_metric_type (metric_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insert initial system metrics placeholders
-- ============================================
INSERT INTO system_metrics (metric_type, metric_data, expires_at) VALUES
('database_size', '{"size_mb": 0, "allocated_mb": 1024}', DATE_ADD(NOW(), INTERVAL 5 MINUTE)),
('table_statistics', '{"tables": []}', DATE_ADD(NOW(), INTERVAL 5 MINUTE)),
('api_performance', '{"avg_response_time_ms": 0}', DATE_ADD(NOW(), INTERVAL 5 MINUTE))
ON DUPLICATE KEY UPDATE cached_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE);
