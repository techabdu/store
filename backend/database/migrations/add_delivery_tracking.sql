-- Migration: Add Delivery Tracking and Dispute Resolution System
-- Date: 2025-12-20

-- Step 1: Add delivery_status column to marketplace_orders table
ALTER TABLE marketplace_orders 
ADD COLUMN delivery_status ENUM('pending', 'shipped', 'received') 
DEFAULT 'pending' 
AFTER order_status;

-- Step 2: Add order_id foreign key to marketplace_conversations table
ALTER TABLE marketplace_conversations 
ADD COLUMN order_id INT NULL 
AFTER listing_id,
ADD FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE SET NULL;

-- Step 3: Create order_disputes table
CREATE TABLE IF NOT EXISTS order_disputes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reported_id INT NOT NULL,
    issue_type ENUM('not_shipped', 'wrong_item', 'damaged', 'not_as_described', 'payment_issue', 'other') NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'under_review', 'resolved', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_reporter_id (reporter_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
