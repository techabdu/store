-- Multi-Tenancy: Create Tenants Table
-- This table stores information about each shop (tenant)

CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(100) NOT NULL,
    shop_address TEXT NULL,
    shop_phone VARCHAR(20) NOT NULL,
    shop_email VARCHAR(100) NOT NULL UNIQUE,
    business_capital DECIMAL(15, 2) DEFAULT 0.00,
    status ENUM('active', 'suspended', 'pending', 'trial') DEFAULT 'trial',
    plan_type ENUM('free_trial', 'basic', 'premium', 'enterprise') DEFAULT 'free_trial',
    trial_ends_at TIMESTAMP NULL,
    subscription_ends_at TIMESTAMP NULL,
    email_verified TINYINT(1) DEFAULT 0,
    verification_token VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_plan_type (plan_type),
    INDEX idx_trial_ends_at (trial_ends_at),
    INDEX idx_email_verified (email_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default "Main Shop" tenant for existing data
-- This ensures backward compatibility
INSERT INTO tenants (
    shop_name, 
    shop_address, 
    shop_phone, 
    shop_email, 
    business_capital,
    status, 
    plan_type,
    email_verified,
    created_at
) VALUES (
    'Main Shop',
    '123 Tech Street, Digital City',
    '+1234567890',
    'admin@mainshop.com',
    0.00,
    'active',
    'enterprise',
    1,
    NOW()
) ON DUPLICATE KEY UPDATE id=id;
