-- ============================================
-- Debt Management System - Database Schema
-- ============================================
-- Created: 2024-12-24
-- Purpose: Store customer debts and payment history
-- ============================================

-- Create debts table
CREATE TABLE IF NOT EXISTS debts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT NOT NULL,
    transaction_id INT NULL COMMENT 'Links to original POS transaction',
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL,
    total_amount DECIMAL(20,2) NOT NULL COMMENT 'Total amount owed originally',
    paid_amount DECIMAL(20,2) DEFAULT 0.00 COMMENT 'Total amount paid so far',
    remaining_balance DECIMAL(20,2) NOT NULL COMMENT 'Amount still owed',
    status ENUM('unpaid', 'partially_paid', 'fully_paid', 'written_off') DEFAULT 'unpaid',
    recorded_by INT NOT NULL COMMENT 'User ID of cashier who created debt',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Indexes for performance
    INDEX idx_shop_status (shop_id, status),
    INDEX idx_customer_phone (customer_phone),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer debt records';

-- Create debt_payments table
CREATE TABLE IF NOT EXISTS debt_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    debt_id INT NOT NULL,
    amount_paid DECIMAL(20,2) NOT NULL COMMENT 'Amount paid in this payment',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT NOT NULL COMMENT 'User ID of cashier who recorded payment',
    notes TEXT NULL COMMENT 'Optional payment notes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Indexes for performance
    INDEX idx_debt_id (debt_id),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Debt payment history';

-- ============================================
-- End of migration
-- ============================================
