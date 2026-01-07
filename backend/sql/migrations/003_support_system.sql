-- Support System Database Migration
-- Created: 2026-01-03
-- Purpose: Create support ticket system tables for marketplace reporting and disputes

-- ============================================
-- Table 1: support_tickets
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    shop_id INT NULL,
    type ENUM('dispute', 'report_buyer', 'report_seller', 'technical', 'billing', 'other') NOT NULL,
    order_id INT NULL,
    listing_id INT NULL,
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'awaiting_response', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ticket_number (ticket_number),
    INDEX idx_status (status),
    INDEX idx_tenant (tenant_id),
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_priority (priority),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 2: support_ticket_responses
-- ============================================
CREATE TABLE IF NOT EXISTS support_ticket_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    is_admin_response TINYINT(1) DEFAULT 0,
    message TEXT NOT NULL,
    attachments JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ticket (ticket_id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 3: support_ticket_status_history
-- ============================================
CREATE TABLE IF NOT EXISTS support_ticket_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by INT NOT NULL,
    notes TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ticket (ticket_id),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify tables were created successfully:
-- SHOW TABLES LIKE 'support%';
-- DESCRIBE support_tickets;
-- DESCRIBE support_ticket_responses;
-- DESCRIBE support_ticket_status_history;
