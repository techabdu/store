-- Subscription System Migration
-- Creates subscription limits configuration and updates tenant trial settings

-- ============================================================
-- Table: subscription_limits
-- Purpose: Define feature limits for each subscription plan
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_limits (
    plan_name VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    price_monthly DECIMAL(10,2) DEFAULT 0.00,
    max_inventory_items INT DEFAULT 29,
    max_sales_history_display INT DEFAULT 50,
    max_users INT DEFAULT 2,
    restricted_pages JSON COMMENT 'Array of page paths not accessible on this plan',
    features JSON COMMENT 'Array of feature descriptions for display',
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Insert Default Subscription Plans
-- ============================================================

-- Starter/Basic Plan (Free Trial, then ₦39,999/month)
INSERT INTO subscription_limits (
    plan_name, 
    display_name, 
    price_monthly, 
    max_inventory_items, 
    max_sales_history_display, 
    max_users, 
    restricted_pages, 
    features,
    sort_order
) VALUES (
    'basic',
    'Starter',
    39999.00,
    29,
    50,
    2,
    '["customer-insights", "abc-analysis", "branch-comparison", "cash-flow", "budgeting", "customers", "branches", "marketplace"]',
    '["Up to 29 items in inventory", "Last 50 sales in history", "2 User accounts (Admin + 1)", "Basic sales tracking", "POS system access", "Stock level alerts", "Basic reporting"]',
    1
) ON DUPLICATE KEY UPDATE 
    display_name = VALUES(display_name),
    price_monthly = VALUES(price_monthly),
    max_inventory_items = VALUES(max_inventory_items),
    max_sales_history_display = VALUES(max_sales_history_display),
    max_users = VALUES(max_users),
    restricted_pages = VALUES(restricted_pages),
    features = VALUES(features);

-- Pro Plan
INSERT INTO subscription_limits (
    plan_name, 
    display_name, 
    price_monthly, 
    max_inventory_items, 
    max_sales_history_display, 
    max_users, 
    restricted_pages, 
    features,
    sort_order
) VALUES (
    'pro',
    'Pro',
    49999.00,
    150,
    -1, -- -1 means unlimited
    5,
    '[]', -- No restricted pages
    '["Up to 150 inventory items", "Unlimited sales history", "Up to 5 User accounts", "Advanced analytics", "Priority support", "Receipt printing", "Finance Calculation", "Customer Management"]',
    2
) ON DUPLICATE KEY UPDATE 
    display_name = VALUES(display_name),
    price_monthly = VALUES(price_monthly),
    max_inventory_items = VALUES(max_inventory_items),
    max_sales_history_display = VALUES(max_sales_history_display),
    max_users = VALUES(max_users),
    restricted_pages = VALUES(restricted_pages),
    features = VALUES(features);

-- Enterprise Plan
INSERT INTO subscription_limits (
    plan_name, 
    display_name, 
    price_monthly, 
    max_inventory_items, 
    max_sales_history_display, 
    max_users, 
    restricted_pages, 
    features,
    sort_order
) VALUES (
    'enterprise',
    'Enterprise',
    0.00, -- Custom pricing
    -1, -- Unlimited
    -1, -- Unlimited
    -1, -- Unlimited
    '[]', -- No restricted pages
    '["Unlimited everything", "Custom integrations", "Multi-user support", "Multi-store management", "Dedicated support", "API access"]',
    3
) ON DUPLICATE KEY UPDATE 
    display_name = VALUES(display_name),
    price_monthly = VALUES(price_monthly),
    max_inventory_items = VALUES(max_inventory_items),
    max_sales_history_display = VALUES(max_sales_history_display),
    max_users = VALUES(max_users),
    restricted_pages = VALUES(restricted_pages),
    features = VALUES(features);

-- ============================================================
-- Table: trial_reminder_log
-- Purpose: Track sent trial reminder emails to avoid duplicates
-- ============================================================
CREATE TABLE IF NOT EXISTS trial_reminder_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    reminder_type ENUM('7_days', '3_days', '1_day', 'expired') NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_sent_to VARCHAR(255) NOT NULL,
    UNIQUE KEY unique_reminder (tenant_id, reminder_type),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Update tenants table: Ensure subscription columns exist
-- ============================================================

-- Add subscription_started_at if not exists
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP NULL AFTER trial_ends_at;

-- Update subscription_plan ENUM to ensure 'basic' is included
-- Note: This may need adjustment based on existing ENUM values
ALTER TABLE tenants 
MODIFY COLUMN subscription_plan ENUM('trial', 'basic', 'pro', 'enterprise') DEFAULT 'basic';

-- ============================================================
-- Update existing trial tenants with correct trial period (14 days)
-- This only affects NEW registrations going forward
-- ============================================================

-- Create index for faster trial expiry queries
CREATE INDEX IF NOT EXISTS idx_tenants_trial_ends ON tenants(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription ON tenants(subscription_plan, status);
