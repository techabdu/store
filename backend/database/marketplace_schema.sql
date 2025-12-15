-- ============================================
-- MARKETPLACE CORE TABLES
-- ============================================

-- Marketplace Profiles
CREATE TABLE IF NOT EXISTS marketplace_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    shop_id INT NOT NULL,
    
    -- Profile details
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    profile_image VARCHAR(500),
    
    -- Verification status
    is_verified BOOLEAN DEFAULT FALSE,
    verification_level ENUM('none', 'basic', 'advanced') DEFAULT 'none',
    
    -- Statistics
    total_listings INT DEFAULT 0,
    total_sales INT DEFAULT 0,
    total_purchases INT DEFAULT 0,
    
    -- Ratings
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_restricted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_shop (shop_id),
    INDEX idx_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- WALLET SYSTEM
-- ============================================

-- User Wallets
CREATE TABLE IF NOT EXISTS marketplace_wallets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    
    -- Balance breakdown
    available_balance DECIMAL(12, 2) DEFAULT 0.00,
    pending_balance DECIMAL(12, 2) DEFAULT 0.00,
    held_balance DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Metadata
    total_funded DECIMAL(12, 2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
    total_sales DECIMAL(12, 2) DEFAULT 0.00,
    total_purchases DECIMAL(12, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS marketplace_wallet_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    wallet_id INT NOT NULL,
    user_id INT NOT NULL,
    
    transaction_type ENUM('fund', 'withdraw', 'purchase_hold', 'purchase_release', 'sale_pending', 'sale_complete', 'refund') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    
    -- Balances after transaction
    available_balance_after DECIMAL(12, 2) NOT NULL,
    pending_balance_after DECIMAL(12, 2) NOT NULL,
    held_balance_after DECIMAL(12, 2) NOT NULL,
    
    order_id INT NULL,
    reference_number VARCHAR(50) UNIQUE,
    description TEXT,
    metadata JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (wallet_id) REFERENCES marketplace_wallets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Removed forward reference to order_id, will check constraints later or allow NULL without FK for now if circular dependency is an issue. 
    -- Actually order_id might depend on marketplace_orders which is created later. 
    -- Better to add FK later or create tables in order. 
    -- Assuming this script is run as a whole, FK checks can be disabled or tables reordered. 
    -- I will keep the FK but tables need to be created in order. 
    -- marketplace_orders is created later. I should move marketplace_orders up or create without FK and alter table later.
    -- I'll reorder tables in this file to ensure dependencies are met.
    -- Or just disable foreign key checks at the start.
    
    INDEX idx_wallet (wallet_id),
    INDEX idx_user (user_id),
    INDEX idx_type (transaction_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- LISTINGS
-- ============================================

-- Marketplace Listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    shop_id INT NOT NULL,
    user_id INT NOT NULL,
    inventory_id INT NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    listing_type ENUM('fixed_price', 'negotiable', 'auction') DEFAULT 'fixed_price',
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2) NULL,
    min_offer_price DECIMAL(10, 2) NULL,
    
    -- Auction specific
    auction_start_price DECIMAL(10, 2) NULL,
    auction_reserve_price DECIMAL(10, 2) NULL,
    auction_ends_at TIMESTAMP NULL,
    current_bid DECIMAL(10, 2) NULL,
    highest_bidder_id INT NULL,
    
    -- Phone details (denormalized)
    phone_model VARCHAR(255),
    phone_brand VARCHAR(100),
    phone_condition ENUM('new', 'like_new', 'good', 'fair', 'poor') NOT NULL,
    phone_storage VARCHAR(50),
    phone_color VARCHAR(50),
    
    -- Status
    status ENUM('active', 'sold', 'pending', 'expired', 'removed', 'suspended') DEFAULT 'active',
    is_featured BOOLEAN DEFAULT FALSE,
    views_count INT DEFAULT 0,
    inquiries_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    sold_at TIMESTAMP NULL,
    
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (highest_bidder_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_status (status),
    INDEX idx_shop (shop_id),
    INDEX idx_user (user_id),
    INDEX idx_listing_type (listing_type),
    INDEX idx_created (created_at),
    INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Listing Images
CREATE TABLE IF NOT EXISTS marketplace_listing_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    listing_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    INDEX idx_listing (listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Listing Views
CREATE TABLE IF NOT EXISTS marketplace_listing_views (
    id INT PRIMARY KEY AUTO_INCREMENT,
    listing_id INT NOT NULL,
    user_id INT NULL,
    ip_address VARCHAR(45),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_listing (listing_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Favorites
CREATE TABLE IF NOT EXISTS marketplace_favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    listing_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_favorite (user_id, listing_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ORDERS & ESCROW
-- ============================================

-- Marketplace Orders
CREATE TABLE IF NOT EXISTS marketplace_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    listing_id INT NOT NULL,
    seller_id INT NOT NULL,
    seller_shop_id INT NOT NULL,
    buyer_id INT NOT NULL,
    buyer_shop_id INT NOT NULL,
    
    phone_model VARCHAR(255),
    agreed_price DECIMAL(10, 2) NOT NULL,
    
    escrow_status ENUM('pending_payment', 'funds_held', 'funds_released', 'refunded', 'disputed') DEFAULT 'pending_payment',
    order_status ENUM('pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed') DEFAULT 'pending',
    
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(100),
    delivery_address TEXT,
    delivery_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    
    cancellation_reason TEXT,
    cancelled_by INT NULL,
    
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_seller (seller_id),
    INDEX idx_buyer (buyer_id),
    INDEX idx_status (order_status),
    INDEX idx_escrow (escrow_status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order History
CREATE TABLE IF NOT EXISTS marketplace_order_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    status_from VARCHAR(50),
    status_to VARCHAR(50) NOT NULL,
    changed_by INT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- MESSAGING
-- ============================================

-- Conversations
CREATE TABLE IF NOT EXISTS marketplace_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    listing_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    
    is_archived_by_buyer BOOLEAN DEFAULT FALSE,
    is_archived_by_seller BOOLEAN DEFAULT FALSE,
    
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_conversation (listing_id, buyer_id),
    INDEX idx_buyer (buyer_id),
    INDEX idx_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Messages
CREATE TABLE IF NOT EXISTS marketplace_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    
    message TEXT NOT NULL,
    
    is_offer BOOLEAN DEFAULT FALSE,
    offer_amount DECIMAL(10, 2) NULL,
    offer_status ENUM('pending', 'accepted', 'rejected', 'expired') NULL,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_conversation (conversation_id),
    INDEX idx_receiver_unread (receiver_id, is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- AUCTIONS
-- ============================================

-- Auction Bids
CREATE TABLE IF NOT EXISTS marketplace_auction_bids (
    id INT PRIMARY KEY AUTO_INCREMENT,
    listing_id INT NOT NULL,
    bidder_id INT NOT NULL,
    bid_amount DECIMAL(10, 2) NOT NULL,
    
    is_winning BOOLEAN DEFAULT FALSE,
    is_auto_bid BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_listing (listing_id),
    INDEX idx_bidder (bidder_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- REVIEWS
-- ============================================

-- Reviews
CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL UNIQUE,
    listing_id INT NOT NULL,
    
    reviewer_id INT NOT NULL,
    reviewed_user_id INT NOT NULL,
    
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    
    seller_response TEXT NULL,
    seller_responded_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_reviewed_user (reviewed_user_id),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- KORA INTEGRATION
-- ============================================

-- Kora Payment References
CREATE TABLE IF NOT EXISTS kora_payment_references (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    wallet_transaction_id INT NULL,
    
    kora_reference VARCHAR(100) UNIQUE NOT NULL,
    kora_transaction_id VARCHAR(100) UNIQUE,
    transaction_type ENUM('pay_in', 'payout') NOT NULL,
    
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    
    status ENUM('pending', 'processing', 'success', 'failed', 'cancelled') DEFAULT 'pending',
    
    payment_method VARCHAR(50),
    
    bank_code VARCHAR(10),
    account_number VARCHAR(20),
    account_name VARCHAR(255),
    
    webhook_received_at TIMESTAMP NULL,
    webhook_data JSON,
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_transaction_id) REFERENCES marketplace_wallet_transactions(id) ON DELETE SET NULL,
    
    INDEX idx_kora_reference (kora_reference),
    INDEX idx_status (status),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Withdrawal Requests
CREATE TABLE IF NOT EXISTS marketplace_withdrawal_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    wallet_id INT NOT NULL,
    kora_payment_id INT NULL,
    
    amount DECIMAL(12, 2) NOT NULL,
    
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(10) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    
    failure_reason TEXT,
    retry_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_id) REFERENCES marketplace_wallets(id) ON DELETE CASCADE,
    FOREIGN KEY (kora_payment_id) REFERENCES kora_payment_references(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- IDENTITY VERIFICATION
-- ============================================

-- Identity Verifications
CREATE TABLE IF NOT EXISTS marketplace_identity_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    
    is_verified BOOLEAN DEFAULT FALSE,
    verification_level ENUM('none', 'basic', 'advanced') DEFAULT 'none',
    
    verification_type ENUM('bvn', 'nin', 'vnin', 'passport', 'voters_card') NOT NULL,
    
    kora_verification_id VARCHAR(100) UNIQUE,
    kora_reference VARCHAR(100) UNIQUE,
    
    id_number VARCHAR(255),  -- Encrypted
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    
    verification_status ENUM('pending', 'success', 'failed', 'expired') DEFAULT 'pending',
    match_score DECIMAL(5, 2),
    verification_data JSON,
    
    selfie_image_path VARCHAR(500),
    facial_match_performed BOOLEAN DEFAULT FALSE,
    facial_match_score DECIMAL(5, 2),
    
    user_consent_given BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMP NULL,
    
    verified_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_status (verification_status),
    INDEX idx_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verification Attempts
CREATE TABLE IF NOT EXISTS marketplace_verification_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    verification_type ENUM('bvn', 'nin', 'vnin', 'passport', 'voters_card') NOT NULL,
    attempt_status ENUM('success', 'failed', 'error') NOT NULL,
    
    kora_reference VARCHAR(100),
    error_message TEXT,
    response_data JSON,
    
    verification_cost DECIMAL(10, 2),
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ADMIN MODERATION
-- ============================================

-- Restrictions
CREATE TABLE IF NOT EXISTS marketplace_restrictions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    restricted_by INT NOT NULL,
    
    restriction_type ENUM('listing_banned', 'buying_banned', 'messaging_banned', 'full_ban') NOT NULL,
    reason TEXT NOT NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lifted_at TIMESTAMP NULL,
    lifted_by INT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restricted_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lifted_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user (user_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reports
CREATE TABLE IF NOT EXISTS marketplace_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    reported_by INT NOT NULL,
    report_type ENUM('listing', 'user', 'message') NOT NULL,
    
    listing_id INT NULL,
    reported_user_id INT NULL,
    message_id INT NULL,
    
    reason ENUM('scam', 'inappropriate', 'fake_listing', 'harassment', 'other') NOT NULL,
    description TEXT,
    
    status ENUM('pending', 'reviewing', 'resolved', 'dismissed') DEFAULT 'pending',
    reviewed_by INT NULL,
    resolution_notes TEXT,
    action_taken VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (message_id) REFERENCES marketplace_messages(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_status (status),
    INDEX idx_type (report_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SECURITY & AUDIT
-- ============================================

-- Rate Limiting
CREATE TABLE IF NOT EXISTS rate_limit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_action (user_id, action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fraud Alerts
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    transaction_type VARCHAR(50),
    amount DECIMAL(12, 2),
    flags JSON,
    status ENUM('pending_review', 'cleared', 'confirmed_fraud') DEFAULT 'pending_review',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_status (status),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Enable Foreign Key Checks (if disabled earlier)
SET FOREIGN_KEY_CHECKS = 1;
