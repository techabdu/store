-- ============================================================================
-- PHONE RETAILER MANAGEMENT SYSTEM - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- 
-- This file contains the complete database schema for the Phone Retailer 
-- Management System with multi-tenancy and multi-branch support.
--
-- FEATURES:
-- - Multi-tenant architecture (multiple business owners in one database)
-- - Multi-branch support (each tenant can have multiple shop locations)
-- - Role-based access control (SuperAdmin, Admin/Owner, Branch Manager, User)
-- - Comprehensive inventory management per branch
-- - Transaction tracking with trade-ins per branch
-- - Expense management per branch
-- - Activity logging and security monitoring
-- - Session management
-- - Password reset functionality
-- - User profile management
--
-- USAGE:
-- 1. Create a new database: CREATE DATABASE your_database_name;
-- 2. Import this file: mysql -u username -p your_database_name < database_schema.sql
-- 3. Update backend/config/database.php with your database credentials
--
-- IMPORTANT NOTES:
-- - All tables use utf8mb4 charset for full Unicode support
-- - Foreign keys enforce referential integrity
-- - Indexes optimize query performance for multi-tenant/multi-branch queries
-- - Data is scoped by shop_id for branch-level isolation
--
-- ============================================================================

-- Set character set and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================================
-- TABLE 1: TENANTS (Business Owners/Organizations)
-- ============================================================================
-- This table stores information about each business owner (tenant) in the system.
-- Each tenant represents a phone retail BUSINESS that can have multiple branches.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Business/Owner Information (legacy shop fields used for first branch)
    shop_name VARCHAR(100) NOT NULL COMMENT 'Primary business name',
    shop_address TEXT NULL COMMENT 'Primary business address',
    shop_phone VARCHAR(20) NOT NULL COMMENT 'Primary contact phone number',
    shop_email VARCHAR(100) NOT NULL UNIQUE COMMENT 'Business owner email (must be unique)',
    
    -- Business Settings (legacy - now primarily at shop level)
    business_capital DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Total business capital (sum of all branches)',
    
    -- Subscription & Status
    status ENUM('active', 'suspended', 'pending', 'trial') DEFAULT 'trial' COMMENT 'Business account status',
    plan_type ENUM('free_trial', 'basic', 'premium', 'enterprise') DEFAULT 'free_trial' COMMENT 'Subscription plan',
    trial_ends_at TIMESTAMP NULL COMMENT 'When free trial expires',
    subscription_ends_at TIMESTAMP NULL COMMENT 'When paid subscription expires',
    
    -- Email Verification
    email_verified TINYINT(1) DEFAULT 0 COMMENT '1 if email is verified, 0 otherwise',
    verification_token VARCHAR(255) NULL COMMENT 'Token for email verification',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_status (status),
    INDEX idx_plan_type (plan_type),
    INDEX idx_trial_ends_at (trial_ends_at),
    INDEX idx_email_verified (email_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores business owner information (tenant level, can have multiple branches)';

-- ============================================================================
-- TABLE 2: SHOPS (Branch Locations)
-- ============================================================================
-- This table stores physical branch locations for each tenant.
-- Each tenant can have multiple shops (branches) with isolated data.
-- ============================================================================

CREATE TABLE IF NOT EXISTS shops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Parent business/tenant that owns this branch',
    
    -- Shop/Branch Details
    shop_name VARCHAR(100) NOT NULL COMMENT 'Branch name (e.g., Lagos Main Branch)',
    shop_address TEXT NULL COMMENT 'Physical address of this branch',
    shop_phone VARCHAR(20) NULL COMMENT 'Branch contact phone number',
    shop_email VARCHAR(100) NULL COMMENT 'Branch email (optional)',
    
    -- Business Settings (per branch)
    business_capital DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Capital allocated to this branch',
    
    -- Status
    status ENUM('active', 'suspended') DEFAULT 'active' COMMENT 'Branch operational status',
    is_main_branch TINYINT(1) DEFAULT 0 COMMENT '1 if this is the primary/first branch',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys & Indexes
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_status (status),
    INDEX idx_is_main_branch (is_main_branch),
    INDEX idx_shops_tenant_status (tenant_id, status) COMMENT 'Composite index for active shops lookup'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Physical branch locations under each tenant (business owner)';

-- ============================================================================
-- TABLE 3: USERS (Shop Owners, Branch Managers, and Staff)
-- ============================================================================
-- This table stores all user accounts in the system.
-- Users belong to a tenant and optionally to a specific shop (branch).
-- shop_id = NULL means owner-level access to all branches.
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Which business this user belongs to',
    shop_id INT NULL COMMENT 'Branch assignment: NULL=Owner (all branches), Non-NULL=Specific branch only',
    
    -- Authentication
    username VARCHAR(50) NOT NULL COMMENT 'Unique username for login',
    email VARCHAR(100) NOT NULL COMMENT 'User email address',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    
    -- User Profile
    full_name VARCHAR(255) NULL COMMENT 'Full name of the user',
    phone VARCHAR(20) NULL COMMENT 'Contact phone number',
    avatar_color VARCHAR(7) NOT NULL DEFAULT '#3b82f6' COMMENT 'Hex color for avatar display',
    
    -- Role & Status
    -- admin with shop_id=NULL = Owner (can access all branches)
    -- admin with shop_id=X = Branch Manager (only sees branch X)
    -- user with shop_id=X = Staff (only sees branch X)
    role ENUM('superadmin', 'admin', 'user') NOT NULL COMMENT 'User role',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'Account status',
    
    -- Password Reset
    reset_token VARCHAR(64) NULL COMMENT 'Token for password reset',
    reset_token_expires DATETIME NULL COMMENT 'When reset token expires',
    
    -- Security Tracking
    username_last_changed TIMESTAMP NULL COMMENT 'Last time username was changed',
    created_by INT NULL COMMENT 'User ID who created this account',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Unique constraints
    UNIQUE KEY unique_tenant_username (tenant_id, username) COMMENT 'Username must be unique within each tenant',
    UNIQUE KEY unique_tenant_email (tenant_id, email) COMMENT 'Email must be unique within each tenant',
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    -- Indexes for performance
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_reset_token (reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores user accounts with role-based and branch-based access control';

-- ============================================================================
-- TABLE 4: INVENTORY (Phone Stock)
-- ============================================================================
-- This table stores all phone inventory items for each branch.
-- Each phone is tracked by its unique IMEI number per branch.
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Which business owns this inventory item',
    shop_id INT NOT NULL COMMENT 'Which branch this inventory item belongs to',
    
    -- Phone Details
    brand VARCHAR(100) NOT NULL COMMENT 'Phone brand (e.g., Apple, Samsung)',
    model VARCHAR(100) NOT NULL COMMENT 'Phone model (e.g., iPhone 14 Pro)',
    imei VARCHAR(20) NOT NULL COMMENT 'Unique IMEI number for this device',
    vendor VARCHAR(100) NULL COMMENT 'Supplier/vendor name',
    color VARCHAR(50) NULL COMMENT 'Phone color',
    storage VARCHAR(20) NULL COMMENT 'Storage capacity (e.g., 128GB, 256GB)',
    condition_status ENUM('new', 'used') NOT NULL DEFAULT 'new' COMMENT 'Device condition',
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL COMMENT 'Selling price',
    cost_price DECIMAL(10, 2) NOT NULL COMMENT 'Purchase/cost price',
    
    -- Status
    status ENUM('in_stock', 'sold', 'returned') NOT NULL DEFAULT 'in_stock' COMMENT 'Current inventory status',
    
    -- Tracking
    created_by INT NOT NULL COMMENT 'User who added this item',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Unique constraint - IMEI unique per branch
    UNIQUE KEY unique_shop_imei (shop_id, imei) COMMENT 'IMEI must be unique within each branch',
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Indexes for performance
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_imei (imei),
    INDEX idx_status (status),
    INDEX idx_brand_model (brand, model),
    INDEX idx_vendor (vendor),
    INDEX idx_created_by (created_by),
    INDEX idx_inventory_shop_status (shop_id, status) COMMENT 'Composite index for filtering by shop and status',
    INDEX idx_inventory_shop_created (shop_id, created_at DESC) COMMENT 'Composite index for sorting by date'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores phone inventory with IMEI tracking per branch';

-- ============================================================================
-- TABLE 5: TRANSACTIONS (Sales Records)
-- ============================================================================
-- This table stores sales transactions per branch.
-- Each transaction can include multiple phones (see transaction_items).
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Which business this transaction belongs to',
    shop_id INT NOT NULL COMMENT 'Which branch this transaction belongs to',
    
    -- Transaction Details
    user_id INT NOT NULL COMMENT 'User who processed this sale',
    customer_name VARCHAR(100) NOT NULL COMMENT 'Customer name',
    customer_phone VARCHAR(20) NULL COMMENT 'Customer contact number',
    
    -- Payment
    total_amount DECIMAL(10, 2) NOT NULL COMMENT 'Total transaction amount',
    payment_method ENUM('cash', 'card', 'transfer', 'mixed') NOT NULL DEFAULT 'cash' COMMENT 'Payment method used',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Indexes for performance
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_customer_phone (customer_phone),
    INDEX idx_transactions_shop_created (shop_id, created_at DESC) COMMENT 'Composite index for sorting transactions'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores sales transactions per branch';

-- ============================================================================
-- TABLE 6: TRANSACTION_ITEMS (Individual Items in Each Sale)
-- ============================================================================
-- This table stores individual phones sold in each transaction.
-- Supports both regular sales and trade-ins.
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Which business this item belongs to',
    shop_id INT NOT NULL COMMENT 'Which branch this item belongs to',
    
    -- Transaction Link
    transaction_id INT NOT NULL COMMENT 'Parent transaction',
    inventory_id INT NOT NULL COMMENT 'Phone that was sold',
    
    -- Item Details
    price DECIMAL(10, 2) NOT NULL COMMENT 'Price this item was sold for',
    type ENUM('sale', 'trade_in') NOT NULL DEFAULT 'sale' COMMENT 'Sale type: regular sale or trade-in',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE RESTRICT,
    
    -- Indexes for performance
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_inventory_id (inventory_id),
    INDEX idx_type (type),
    INDEX idx_transaction_items_shop_txn (shop_id, transaction_id) COMMENT 'Composite index for JOINs'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores individual items in each transaction per branch';

-- ============================================================================
-- TABLE 7: EXPENSES (Business Expenses)
-- ============================================================================
-- This table tracks all business expenses per branch.
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Which business this expense belongs to',
    shop_id INT NOT NULL COMMENT 'Which branch this expense belongs to',
    
    -- Expense Details
    description VARCHAR(255) NOT NULL COMMENT 'What the expense was for',
    amount DECIMAL(10, 2) NOT NULL COMMENT 'Expense amount',
    category VARCHAR(50) NOT NULL COMMENT 'Expense category (e.g., rent, utilities, salaries)',
    date DATE NOT NULL COMMENT 'Date of expense',
    
    -- Tracking
    created_by INT NOT NULL COMMENT 'User who recorded this expense',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_date (date),
    INDEX idx_category (category),
    INDEX idx_created_by (created_by),
    INDEX idx_expenses_shop_date (shop_id, date DESC) COMMENT 'Composite index for filtering expenses'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks business expenses per branch';

-- ============================================================================
-- TABLE 8: PROFIT_RECORDS (Daily Profit Tracking)
-- ============================================================================
-- This table stores daily profit snapshots per branch for historical tracking.
-- Profit is calculated as: total_amount (from transactions) - cost_price (from inventory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profit_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Which business this profit record belongs to',
    shop_id INT NOT NULL COMMENT 'Which branch this profit record belongs to',
    
    -- Profit Data
    date DATE NOT NULL COMMENT 'Date of the profit record',
    daily_profit DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total profit for this day',
    transaction_count INT NOT NULL DEFAULT 0 COMMENT 'Number of transactions this day',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Unique constraint - one record per branch per day
    UNIQUE KEY unique_shop_date (shop_id, date) COMMENT 'One profit record per branch per day',
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    -- Indexes for performance
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_date (date),
    INDEX idx_profit_records_shop_date (shop_id, date DESC) COMMENT 'Composite index for querying profit history'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores daily profit snapshots per branch for historical tracking';

-- ============================================================================
-- TABLE 9: REPORTS (Generated Financial Reports)
-- ============================================================================
-- This table stores snapshots of financial reports generated by users.
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Which business this report belongs to',
    shop_id INT NOT NULL COMMENT 'Which branch this report belongs to',
    
    -- Report Data
    generated_by INT NOT NULL COMMENT 'User who generated this report',
    inventory_value DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total value of inventory',
    total_expenses DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total expenses',
    business_capital DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Business capital at time of report',
    cash_in_hand DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Available cash',
    total_debt DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total outstanding debt',
    net_profit DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Net profit/loss',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shop_id (shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores generated financial reports per branch';

-- ============================================================================
-- TABLE 10: ACTIVITY_LOGS (User Activity Tracking)
-- ============================================================================
-- This table logs all user actions for audit trail and security monitoring.
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Which business this activity belongs to',
    shop_id INT NULL COMMENT 'Which branch this activity occurred in (NULL for tenant-level actions)',
    
    -- Activity Details
    user_id INT NOT NULL COMMENT 'User who performed the action',
    action VARCHAR(50) NOT NULL COMMENT 'Action performed (e.g., login, create_user, update_inventory)',
    details TEXT NULL COMMENT 'Additional details in JSON format',
    ip_address VARCHAR(45) NULL COMMENT 'IP address of user (supports IPv6)',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_activity_logs_shop_created (shop_id, created_at DESC) COMMENT 'Composite index for recent activity queries'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Logs user activities for audit trail';

-- ============================================================================
-- TABLE 11: SESSIONS (Active User Sessions)
-- ============================================================================
-- This table tracks active user sessions for security monitoring.
-- Note: PHP sessions are used for actual authentication.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL COMMENT 'Which business this session belongs to',
    shop_id INT NULL COMMENT 'Current active shop for this session',
    
    -- Session Details
    user_id INT NOT NULL COMMENT 'User who owns this session',
    session_token VARCHAR(255) NOT NULL COMMENT 'Session identifier',
    ip_address VARCHAR(45) NULL COMMENT 'IP address of session',
    user_agent TEXT NULL COMMENT 'Browser/client information',
    
    -- Timestamps
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Last activity time',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_user_id (user_id),
    INDEX idx_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks active user sessions';

-- ============================================================================
-- TABLE 12: SYSTEM_ALERTS (System Notifications and Alerts)
-- ============================================================================
-- This table stores system alerts for monitoring and notifications.
-- Alerts can be tenant-specific or global (tenant_id = NULL).
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NULL COMMENT 'Which business this alert belongs to (NULL for global alerts)',
    
    -- Alert Details
    type ENUM('security', 'database', 'performance', 'business') NOT NULL COMMENT 'Alert category',
    severity ENUM('critical', 'warning', 'info') NOT NULL COMMENT 'Alert severity level',
    message VARCHAR(255) NOT NULL COMMENT 'Brief alert description',
    details TEXT NULL COMMENT 'Additional details in JSON format',
    
    -- Resolution
    resolved TINYINT(1) DEFAULT 0 COMMENT '1 if alert has been resolved',
    resolved_at TIMESTAMP NULL COMMENT 'When alert was resolved',
    resolved_by INT NULL COMMENT 'User who resolved the alert',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_type (type),
    INDEX idx_severity (severity),
    INDEX idx_resolved (resolved),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores system alerts and notifications';

-- ============================================================================
-- TABLE 13: SECURITY_LOGS (Security Events)
-- ============================================================================
-- This table logs security-related events like failed logins.
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NULL COMMENT 'Which business this security event relates to (NULL for unknown users)',
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL COMMENT 'Type of security event (e.g., failed_login, suspicious_activity)',
    username VARCHAR(50) NULL COMMENT 'Username involved in the event',
    ip_address VARCHAR(45) NULL COMMENT 'IP address of the event',
    user_agent TEXT NULL COMMENT 'Browser/client information',
    details TEXT NULL COMMENT 'Additional details in JSON format',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    -- Indexes
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_event_type (event_type),
    INDEX idx_username (username),
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Logs security events for monitoring';

-- ============================================================================
-- DEFAULT DATA: Create Default Tenant, Shop, and SuperAdmin User
-- ============================================================================

-- Insert default "Main Shop" tenant
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

-- Create default shop (branch) for the default tenant
INSERT INTO shops (
    tenant_id,
    shop_name,
    shop_address,
    shop_phone,
    shop_email,
    business_capital,
    status,
    is_main_branch,
    created_at
) SELECT 
    id,
    shop_name,
    shop_address,
    shop_phone,
    shop_email,
    business_capital,
    'active',
    1,
    NOW()
FROM tenants 
WHERE shop_email = 'admin@mainshop.com'
ON DUPLICATE KEY UPDATE id=id;

-- SuperAdmin user creation has been removed from this schema for security.
-- Please use the official setup process to create your initial administrator account.

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT '============================================' AS '';
SELECT '✅ DATABASE SCHEMA CREATED SUCCESSFULLY!' AS '';
SELECT '============================================' AS '';
SELECT '' AS '';
SELECT 'Database Structure:' AS '';
SELECT '- 13 tables created with proper relationships' AS '';
SELECT '- Multi-tenancy support enabled' AS '';
SELECT '- Multi-branch support enabled' AS '';
SELECT '- All indexes and foreign keys configured' AS '';
SELECT '' AS '';
SELECT 'Default Accounts Created:' AS '';
SELECT '- Tenant: Main Shop (ID: 1)' AS '';
SELECT '- Shop: Main Shop Branch (ID: 1)' AS '';
SELECT '- SuperAdmin: [Created via Setup Script]' AS '';
SELECT '' AS '';
SELECT '⚠️  IMPORTANT SECURITY STEPS:' AS '';
SELECT '1. Change the default superadmin password immediately!' AS '';
SELECT '2. Update database credentials in backend/config/database.php' AS '';
SELECT '3. Ensure .env file is not committed to version control' AS '';
SELECT '4. Enable HTTPS in production' AS '';
SELECT '' AS '';
SELECT 'Next Steps:' AS '';
SELECT '1. Configure your backend database connection' AS '';
SELECT '2. Test the application' AS '';
SELECT '3. Create additional admin/user accounts as needed' AS '';
SELECT '4. Set up regular database backups' AS '';
SELECT '' AS '';
SELECT '============================================' AS '';
