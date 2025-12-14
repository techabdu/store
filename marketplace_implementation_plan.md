# Marketplace Implementation Plan

## Project Overview

**Feature:** P2P Phone Marketplace with Escrow System  
**Tech Stack:** React (Frontend), PHP OOP (Backend), MySQL (Database), Kora API (Payments & Identity)  
**Timeline:** 10-12 weeks  
**Stages:** 15 stages (sequential implementation)

---

## Prerequisites & Setup

### 1. Kora Account Setup (Complete BEFORE Stage 1)

**Steps:**
1. Create Kora merchant account at [korapay.com](https://korapay.com)
2. Complete email and phone verification
3. Enable Two-Factor Authentication (2FA)
4. Select business type: "Registered Business"
5. Submit business verification documents:
   - Business License/Certificate of Incorporation
   - Tax Registration Certificate (TIN)
   - Proof of Business Ownership
   - Director's ID (National ID/Passport)
   - Proof of Business Address
6. Wait for approval (1-3 business days)
7. Access API keys from Settings → API Configuration
8. Request Identity API access (submit due diligence form)
9. Fund account with minimum ₦10,000

**API Keys to Obtain:**
- Test Public Key (`pk_test_xxxxx`)
- Test Secret Key (`sk_test_xxxxx`)
- Live Public Key (`pk_live_xxxxx`) - after verification
- Live Secret Key (`sk_live_xxxxx`) - after verification
- Webhook Secret

---

## Implementation Stages

### **STAGE 1: Database Schema Creation**

#### Tasks:
1. Create all marketplace database tables
2. Add Kora integration tables
3. Add identity verification tables
4. Add security and audit tables
5. Create indexes for performance

#### Files to Create:
- `backend/database/marketplace_schema.sql`

#### SQL Schema:

```sql
-- ============================================
-- MARKETPLACE CORE TABLES
-- ============================================

-- Marketplace Profiles
CREATE TABLE marketplace_profiles (
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
CREATE TABLE marketplace_wallets (
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
CREATE TABLE marketplace_wallet_transactions (
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
    FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE SET NULL,
    
    INDEX idx_wallet (wallet_id),
    INDEX idx_user (user_id),
    INDEX idx_type (transaction_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- LISTINGS
-- ============================================

-- Marketplace Listings
CREATE TABLE marketplace_listings (
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
CREATE TABLE marketplace_listing_images (
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
CREATE TABLE marketplace_listing_views (
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
CREATE TABLE marketplace_favorites (
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
CREATE TABLE marketplace_orders (
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
CREATE TABLE marketplace_order_history (
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
CREATE TABLE marketplace_conversations (
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
CREATE TABLE marketplace_messages (
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
CREATE TABLE marketplace_auction_bids (
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
CREATE TABLE marketplace_reviews (
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
CREATE TABLE kora_payment_references (
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
CREATE TABLE marketplace_withdrawal_requests (
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
CREATE TABLE marketplace_identity_verifications (
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
CREATE TABLE marketplace_verification_attempts (
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
CREATE TABLE marketplace_restrictions (
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
CREATE TABLE marketplace_reports (
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
CREATE TABLE rate_limit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_action (user_id, action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fraud Alerts
CREATE TABLE fraud_alerts (
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
```

#### Testing Checklist:
- [ ] All tables created successfully
- [ ] Foreign keys properly set
- [ ] Indexes created
- [ ] No SQL errors
- [ ] Database size checked

#### Git Commit:
```bash
git add backend/database/marketplace_schema.sql
git commit -m "Stage 1: Create marketplace database schema with Kora integration and identity verification tables"
git push origin main
```

---

### **STAGE 2: Environment Configuration & Security Setup**

#### Tasks:
1. Update `.env` file with Kora API credentials
2. Create encryption helper functions
3. Create Kora API helper class
4. Set up security utilities

#### Files to Create/Modify:
- `backend/.env` (update)
- `backend/includes/encryption.php` (new)
- `backend/includes/kora_api.php` (new)
- `backend/includes/security.php` (new)

#### `.env` Configuration:

```bash
# Add to backend/.env

# Kora API - Test Mode
KORA_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
KORA_SECRET_KEY=sk_test_xxxxxxxxxxxxx
KORA_ENCRYPTION_KEY=xxxxxxxxxxxxx
KORA_WEBHOOK_SECRET=xxxxxxxxxxxxx
KORA_API_URL=https://api.korapay.com/merchant/api/v1
KORA_ENVIRONMENT=test

# Encryption (Generate a 32-character random string)
ENCRYPTION_KEY=your-32-character-encryption-key

# Marketplace Settings
MARKETPLACE_MIN_WITHDRAWAL=1000
MARKETPLACE_MAX_DAILY_WITHDRAWAL=500000
MARKETPLACE_VERIFICATION_EXPIRY_DAYS=365
```

#### `encryption.php`:

```php
<?php
// backend/includes/encryption.php

/**
 * Encrypt sensitive data using AES-256-GCM
 */
function encryptSensitiveData($data) {
    $encryption_key = getenv('ENCRYPTION_KEY');
    
    if (!$encryption_key || strlen($encryption_key) < 32) {
        throw new Exception('Invalid encryption key');
    }
    
    $cipher = "aes-256-gcm";
    $ivlen = openssl_cipher_iv_length($cipher);
    $iv = openssl_random_pseudo_bytes($ivlen);
    $tag = '';
    
    $ciphertext = openssl_encrypt($data, $cipher, $encryption_key, 0, $iv, $tag);
    
    if ($ciphertext === false) {
        throw new Exception('Encryption failed');
    }
    
    // Return base64 encoded: iv + tag + ciphertext
    return base64_encode($iv . $tag . $ciphertext);
}

/**
 * Decrypt sensitive data
 */
function decryptSensitiveData($encrypted_data) {
    $encryption_key = getenv('ENCRYPTION_KEY');
    
    if (!$encryption_key) {
        throw new Exception('Invalid encryption key');
    }
    
    $cipher = "aes-256-gcm";
    $ivlen = openssl_cipher_iv_length($cipher);
    $tag_length = 16;
    
    $data = base64_decode($encrypted_data);
    
    if ($data === false) {
        throw new Exception('Invalid encrypted data');
    }
    
    $iv = substr($data, 0, $ivlen);
    $tag = substr($data, $ivlen, $tag_length);
    $ciphertext = substr($data, $ivlen + $tag_length);
    
    $plaintext = openssl_decrypt($ciphertext, $cipher, $encryption_key, 0, $iv, $tag);
    
    if ($plaintext === false) {
        throw new Exception('Decryption failed');
    }
    
    return $plaintext;
}

/**
 * Generate secure random reference
 */
function generateSecureReference($prefix = 'REF') {
    return $prefix . '_' . time() . '_' . bin2hex(random_bytes(8));
}
?>
```

#### `kora_api.php`:

```php
<?php
// backend/includes/kora_api.php

class KoraAPI {
    private $secret_key;
    private $public_key;
    private $api_url;
    private $environment;
    
    public function __construct() {
        $this->secret_key = getenv('KORA_SECRET_KEY');
        $this->public_key = getenv('KORA_PUBLIC_KEY');
        $this->api_url = getenv('KORA_API_URL');
        $this->environment = getenv('KORA_ENVIRONMENT');
        
        if (!$this->secret_key || !$this->api_url) {
            throw new Exception('Kora API credentials not configured');
        }
    }
    
    /**
     * Verify identity using Kora Identity API
     */
    public function verifyIdentity($endpoint, $data) {
        $url = $this->api_url . $endpoint;
        
        $headers = [
            'Authorization: Bearer ' . $this->secret_key,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            error_log("Kora API cURL Error: " . $curl_error);
            return ['success' => false, 'error' => 'Connection error'];
        }
        
        $response_data = json_decode($response, true);
        
        if ($http_code !== 200) {
            error_log("Kora API Error: " . json_encode($response_data));
            return [
                'success' => false,
                'error' => $response_data['message'] ?? 'Verification failed'
            ];
        }
        
        return [
            'success' => true,
            'data' => $response_data['data'],
            'cost' => $response_data['amount_charged'] ?? 0
        ];
    }
    
    /**
     * Initiate payment (Pay-in)
     */
    public function initiatePayment($amount, $customer_data, $reference) {
        $url = $this->api_url . '/charges';
        
        $data = [
            'reference' => $reference,
            'amount' => $amount,
            'currency' => 'NGN',
            'customer' => $customer_data,
            'notification_url' => getenv('APP_URL') . '/api/marketplace/wallet/webhooks/kora_webhook.php'
        ];
        
        return $this->makeRequest($url, $data);
    }
    
    /**
     * Initiate payout (Withdrawal)
     */
    public function initiatePayout($amount, $bank_details, $reference) {
        $url = $this->api_url . '/payouts';
        
        $data = [
            'reference' => $reference,
            'amount' => $amount,
            'currency' => 'NGN',
            'destination' => $bank_details,
            'notification_url' => getenv('APP_URL') . '/api/marketplace/wallet/webhooks/kora_webhook.php'
        ];
        
        return $this->makeRequest($url, $data);
    }
    
    /**
     * Verify webhook signature
     */
    public function verifyWebhookSignature($payload, $signature) {
        $webhook_secret = getenv('KORA_WEBHOOK_SECRET');
        
        if (!$webhook_secret) {
            return false;
        }
        
        $computed_signature = hash_hmac('sha256', $payload, $webhook_secret);
        
        return hash_equals($computed_signature, $signature);
    }
    
    /**
     * Make HTTP request to Kora API
     */
    private function makeRequest($url, $data) {
        $headers = [
            'Authorization: Bearer ' . $this->secret_key,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            error_log("Kora API Error: " . $curl_error);
            return ['success' => false, 'error' => 'Connection error'];
        }
        
        $response_data = json_decode($response, true);
        
        return [
            'success' => $http_code === 200 || $http_code === 201,
            'data' => $response_data,
            'http_code' => $http_code
        ];
    }
}

// Global helper function
function callKoraIdentityAPI($endpoint, $data) {
    $kora = new KoraAPI();
    return $kora->verifyIdentity($endpoint, $data);
}
?>
```

#### `security.php`:

```php
<?php
// backend/includes/security.php

/**
 * Rate limiter class
 */
class RateLimiter {
    private $conn;
    
    public function __construct($db_connection) {
        $this->conn = $db_connection;
    }
    
    /**
     * Check if user has exceeded rate limit
     */
    public function checkLimit($user_id, $action, $max_attempts, $time_window_minutes) {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as attempt_count 
            FROM rate_limit_log 
            WHERE user_id = ? 
            AND action = ? 
            AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
        ");
        
        $stmt->bind_param("isi", $user_id, $action, $time_window_minutes);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        
        if ($result['attempt_count'] >= $max_attempts) {
            return false;  // Rate limit exceeded
        }
        
        // Log this attempt
        $stmt = $this->conn->prepare("INSERT INTO rate_limit_log (user_id, action, ip_address) VALUES (?, ?, ?)");
        $ip = $_SERVER['REMOTE_ADDR'];
        $stmt->bind_param("iss", $user_id, $action, $ip);
        $stmt->execute();
        
        return true;  // Within limit
    }
}

/**
 * Detect suspicious activity
 */
function detectSuspiciousActivity($conn, $user_id, $amount, $action) {
    $flags = [];
    
    // Rule 1: Large transaction for new user
    $stmt = $conn->prepare("SELECT DATEDIFF(NOW(), created_at) as account_age FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    
    if ($user['account_age'] < 7 && $amount > 50000) {
        $flags[] = 'large_transaction_new_account';
    }
    
    // Rule 2: Multiple withdrawals in short time
    if ($action === 'withdraw') {
        $stmt = $conn->prepare("
            SELECT COUNT(*) as withdrawal_count 
            FROM marketplace_wallet_transactions 
            WHERE user_id = ? 
            AND transaction_type = 'withdraw' 
            AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        
        if ($result['withdrawal_count'] > 3) {
            $flags[] = 'multiple_withdrawals';
        }
    }
    
    // Rule 3: Unusual transaction amount
    $stmt = $conn->prepare("
        SELECT AVG(amount) as avg_amount 
        FROM marketplace_wallet_transactions 
        WHERE user_id = ? 
        AND transaction_type = ?
    ");
    $stmt->bind_param("is", $user_id, $action);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    
    if ($result['avg_amount'] > 0 && $amount > ($result['avg_amount'] * 5)) {
        $flags[] = 'unusual_amount';
    }
    
    // If any flags, create fraud alert
    if (count($flags) > 0) {
        $stmt = $conn->prepare("
            INSERT INTO fraud_alerts (user_id, transaction_type, amount, flags, status)
            VALUES (?, ?, ?, ?, 'pending_review')
        ");
        $flags_json = json_encode($flags);
        $stmt->bind_param("isds", $user_id, $action, $amount, $flags_json);
        $stmt->execute();
        
        return true;  // Suspicious
    }
    
    return false;  // Clean
}

/**
 * Check if user is restricted
 */
function checkUserRestriction($conn, $user_id, $restriction_type) {
    $stmt = $conn->prepare("
        SELECT id FROM marketplace_restrictions 
        WHERE user_id = ? 
        AND (restriction_type = ? OR restriction_type = 'full_ban')
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    ");
    
    $stmt->bind_param("is", $user_id, $restriction_type);
    $stmt->execute();
    $result = $stmt->get_result();
    
    return $result->num_rows > 0;  // TRUE if restricted
}
?>
```

#### Testing Checklist:
- [ ] `.env` file updated with Kora credentials
- [ ] Encryption functions work correctly
- [ ] Kora API class instantiates without errors
- [ ] Rate limiter logs attempts
- [ ] Fraud detection rules trigger correctly
- [ ] No PHP syntax errors

#### Git Commit:
```bash
git add backend/.env backend/includes/encryption.php backend/includes/kora_api.php backend/includes/security.php
git commit -m "Stage 2: Add Kora API integration, encryption, and security utilities"
git push origin main
```

---

### **STAGE 3: Identity Verification - Backend**

#### Tasks:
1. Create BVN verification endpoint
2. Create NIN verification endpoint
3. Create verification status check endpoint
4. Add verification attempt logging

#### Files to Create:
- `backend/api/marketplace/identity/verify_bvn.php`
- `backend/api/marketplace/identity/verify_nin.php`
- `backend/api/marketplace/identity/check_status.php`
- `backend/api/marketplace/identity/get_attempts.php`

#### Testing Checklist:
- [ ] BVN verification endpoint works
- [ ] NIN verification endpoint works
- [ ] Data encrypted before storage
- [ ] Verification attempts logged
- [ ] Rate limiting applied (max 3 attempts per hour)
- [ ] User consent validated
- [ ] Kora API called successfully
- [ ] Facial matching works (if selfie provided)
- [ ] Error handling works

#### Git Commit:
```bash
git add backend/api/marketplace/identity/
git commit -m "Stage 3: Implement identity verification endpoints (BVN/NIN)"
git push origin main
```

---

*[Document continues with Stages 4-15...]*

**Due to length constraints, I'll provide the remaining stages in a summary format. Would you like me to continue with the complete detailed breakdown of all 15 stages, or would you prefer I create a condensed version with all stages outlined?**

The complete plan will include:
- Stage 4: Marketplace Profile Creation
- Stage 5: Wallet System Backend
- Stage 6: Listing Management
- Stage 7: Messaging System
- Stage 8: Order & Escrow Flow
- Stage 9: Kora Payment Integration (Pay-in)
- Stage 10: Kora Payout Integration (Withdrawal)
- Stage 11: Auction System
- Stage 12: Reviews & Ratings
- Stage 13: SuperAdmin Moderation Tools
- Stage 14: Frontend Implementation
- Stage 15: Testing & Security Audit

Let me know how you'd like to proceed!
