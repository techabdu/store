-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Dec 20, 2025 at 08:52 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `store`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT 1,
  `shop_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT 1,
  `shop_id` int(11) DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `amount` decimal(20,2) NOT NULL,
  `category` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  KEY `idx_expenses_date` (`date`),
  KEY `idx_expenses_shop_date` (`shop_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expense_records`
--

CREATE TABLE `expense_records` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL COMMENT 'Which shop this expense record belongs to',
  `shop_id` int(11) DEFAULT NULL,
  `date` date NOT NULL COMMENT 'Date of the expense record',
  `daily_expenses` decimal(20,2) NOT NULL DEFAULT 0.00 COMMENT 'Total expenses for this day',
  `expense_count` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of expenses this day',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fraud_alerts`
--

CREATE TABLE `fraud_alerts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `transaction_type` varchar(50) DEFAULT NULL,
  `amount` decimal(20,2) DEFAULT NULL,
  `flags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`flags`)),
  `status` enum('pending_review','cleared','confirmed_fraud') DEFAULT 'pending_review',
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT 1,
  `shop_id` int(11) NOT NULL,
  `brand` varchar(50) NOT NULL,
  `model` varchar(100) NOT NULL,
  `imei` varchar(20) NOT NULL,
  `vendor` varchar(100) DEFAULT NULL COMMENT 'Supplier/vendor name',
  `color` varchar(30) NOT NULL,
  `storage` varchar(20) NOT NULL,
  `condition_status` varchar(50) NOT NULL DEFAULT 'New',
  `price` decimal(20,2) NOT NULL,
  `cost_price` decimal(20,2) NOT NULL,
  `status` enum('in_stock','sold','returned','in_transit') NOT NULL DEFAULT 'in_stock',
  `is_listed` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `kora_payment_references`
--

CREATE TABLE `kora_payment_references` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `wallet_transaction_id` int(11) DEFAULT NULL,
  `kora_reference` varchar(100) NOT NULL,
  `kora_transaction_id` varchar(100) DEFAULT NULL,
  `transaction_type` enum('pay_in','payout') NOT NULL,
  `amount` decimal(20,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'NGN',
  `status` enum('pending','processing','success','failed','cancelled') DEFAULT 'pending',
  `payment_method` varchar(50) DEFAULT NULL,
  `bank_code` varchar(10) DEFAULT NULL,
  `account_number` varchar(20) DEFAULT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `webhook_received_at` timestamp NULL DEFAULT NULL,
  `webhook_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`webhook_data`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_auction_bids`
--

CREATE TABLE `marketplace_auction_bids` (
  `id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `bidder_id` int(11) NOT NULL,
  `bid_amount` decimal(20,2) NOT NULL,
  `is_winning` tinyint(1) DEFAULT 0,
  `is_auto_bid` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_conversations`
--

CREATE TABLE `marketplace_conversations` (
  `id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `buyer_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `is_archived_by_buyer` tinyint(1) DEFAULT 0,
  `is_archived_by_seller` tinyint(1) DEFAULT 0,
  `last_message_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_favorites`
--

CREATE TABLE `marketplace_favorites` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_identity_verifications`
--

CREATE TABLE `marketplace_identity_verifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `verification_level` enum('none','basic','advanced') DEFAULT 'none',
  `verification_type` enum('bvn','nin','vnin','passport','voters_card') NOT NULL,
  `kora_verification_id` varchar(100) DEFAULT NULL,
  `kora_reference` varchar(100) DEFAULT NULL,
  `id_number` varchar(255) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `verification_status` enum('pending','success','failed','expired') DEFAULT 'pending',
  `match_score` decimal(5,2) DEFAULT NULL,
  `verification_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`verification_data`)),
  `selfie_image_path` varchar(500) DEFAULT NULL,
  `facial_match_performed` tinyint(1) DEFAULT 0,
  `facial_match_score` decimal(5,2) DEFAULT NULL,
  `user_consent_given` tinyint(1) DEFAULT 0,
  `consent_timestamp` timestamp NULL DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_interests`
--

CREATE TABLE `marketplace_interests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_listings`
--

CREATE TABLE `marketplace_listings` (
  `id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `inventory_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `listing_type` enum('fixed_price','auction') NOT NULL DEFAULT 'fixed_price',
  `price` decimal(20,2) NOT NULL,
  `original_price` decimal(20,2) DEFAULT NULL,
  `min_offer_price` decimal(20,2) DEFAULT NULL,
  `auction_start_price` decimal(20,2) DEFAULT NULL,
  `auction_reserve_price` decimal(20,2) DEFAULT NULL,
  `auction_ends_at` timestamp NULL DEFAULT NULL,
  `current_bid` decimal(20,2) DEFAULT NULL,
  `highest_bidder_id` int(11) DEFAULT NULL,
  `phone_model` varchar(255) DEFAULT NULL,
  `phone_brand` varchar(100) DEFAULT NULL,
  `phone_condition` varchar(50) NOT NULL DEFAULT 'New',
  `phone_storage` varchar(50) DEFAULT NULL,
  `phone_color` varchar(50) DEFAULT NULL,
  `status` enum('active','sold','pending','expired','removed','suspended') DEFAULT 'active',
  `is_featured` tinyint(1) DEFAULT 0,
  `views_count` int(11) DEFAULT 0,
  `inquiries_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  `sold_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_listing_images`
--

CREATE TABLE `marketplace_listing_images` (
  `id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `display_order` int(11) DEFAULT 0,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_listing_views`
--

CREATE TABLE `marketplace_listing_views` (
  `id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `viewed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_messages`
--

CREATE TABLE `marketplace_messages` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_offer` tinyint(1) DEFAULT 0,
  `offer_amount` decimal(20,2) DEFAULT NULL,
  `offer_status` enum('pending','accepted','rejected','expired') DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_orders`
--

CREATE TABLE `marketplace_orders` (
  `id` int(11) NOT NULL,
  `order_number` varchar(50) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `seller_shop_id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `buyer_shop_id` int(11) NOT NULL,
  `phone_model` varchar(255) DEFAULT NULL,
  `agreed_price` decimal(20,2) NOT NULL,
  `escrow_status` enum('pending_payment','funds_held','funds_released','refunded','disputed') DEFAULT 'pending_payment',
  `order_status` enum('pending','paid','shipped','delivered','completed','cancelled','disputed') DEFAULT 'pending',
  `delivery_status` enum('pending','shipped','received') DEFAULT 'pending',
  `shipping_method` varchar(100) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `delivery_address` text DEFAULT NULL,
  `delivery_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `paid_at` timestamp NULL DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_order_history`
--

CREATE TABLE `marketplace_order_history` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `status_from` varchar(50) DEFAULT NULL,
  `status_to` varchar(50) NOT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_profiles`
--

CREATE TABLE `marketplace_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `shop_id` int(11) DEFAULT NULL,
  `display_name` varchar(100) NOT NULL,
  `bio` text DEFAULT NULL,
  `profile_image` varchar(500) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `verification_level` enum('none','basic','advanced') DEFAULT 'none',
  `total_listings` int(11) DEFAULT 0,
  `total_sales` int(11) DEFAULT 0,
  `total_purchases` int(11) DEFAULT 0,
  `average_rating` decimal(3,2) DEFAULT 0.00,
  `total_reviews` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `is_restricted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_reports`
--

CREATE TABLE `marketplace_reports` (
  `id` int(11) NOT NULL,
  `reported_by` int(11) NOT NULL,
  `report_type` enum('listing','user','message') NOT NULL,
  `listing_id` int(11) DEFAULT NULL,
  `reported_user_id` int(11) DEFAULT NULL,
  `message_id` int(11) DEFAULT NULL,
  `reason` enum('scam','inappropriate','fake_listing','harassment','other') NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pending','reviewing','resolved','dismissed') DEFAULT 'pending',
  `reviewed_by` int(11) DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  `action_taken` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_restrictions`
--

CREATE TABLE `marketplace_restrictions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `restricted_by` int(11) NOT NULL,
  `restriction_type` enum('listing_banned','buying_banned','messaging_banned','full_ban') NOT NULL,
  `reason` text NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `starts_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `lifted_at` timestamp NULL DEFAULT NULL,
  `lifted_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_reviews`
--

CREATE TABLE `marketplace_reviews` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `reviewer_id` int(11) NOT NULL,
  `reviewed_user_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` between 1 and 5),
  `review_text` text DEFAULT NULL,
  `seller_response` text DEFAULT NULL,
  `seller_responded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_verification_attempts`
--

CREATE TABLE `marketplace_verification_attempts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `verification_type` enum('bvn','nin','vnin','passport','voters_card') NOT NULL,
  `attempt_status` enum('success','failed','error') NOT NULL,
  `kora_reference` varchar(100) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `response_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response_data`)),
  `verification_cost` decimal(20,2) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_wallets`
--

CREATE TABLE `marketplace_wallets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `available_balance` decimal(20,2) DEFAULT 0.00,
  `pending_balance` decimal(20,2) DEFAULT 0.00,
  `held_balance` decimal(20,2) DEFAULT 0.00,
  `total_funded` decimal(20,2) DEFAULT 0.00,
  `total_withdrawn` decimal(20,2) DEFAULT 0.00,
  `total_sales` decimal(20,2) DEFAULT 0.00,
  `total_purchases` decimal(20,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_wallet_transactions`
--

CREATE TABLE `marketplace_wallet_transactions` (
  `id` int(11) NOT NULL,
  `wallet_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `transaction_type` enum('fund','withdraw','purchase_hold','purchase_release','sale_pending','sale_complete','refund','purchase_refund','sale_cancelled') DEFAULT NULL,
  `amount` decimal(20,2) NOT NULL,
  `available_balance_after` decimal(20,2) NOT NULL,
  `pending_balance_after` decimal(20,2) NOT NULL,
  `held_balance_after` decimal(20,2) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `reference_number` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketplace_withdrawal_requests`
--

CREATE TABLE `marketplace_withdrawal_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `wallet_id` int(11) NOT NULL,
  `kora_payment_id` int(11) DEFAULT NULL,
  `amount` decimal(20,2) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `bank_code` varchar(10) NOT NULL,
  `account_number` varchar(20) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `status` enum('pending','processing','completed','failed','cancelled') DEFAULT 'pending',
  `requires_approval` tinyint(1) DEFAULT 0,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `retry_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_disputes`
--

CREATE TABLE `order_disputes` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `reporter_id` int(11) NOT NULL,
  `reported_id` int(11) NOT NULL,
  `issue_type` enum('not_shipped','wrong_item','damaged','not_as_described','payment_issue','other') NOT NULL,
  `description` text NOT NULL,
  `status` enum('open','under_review','resolved','closed') DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `profit_records`
--

CREATE TABLE `profit_records` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL COMMENT 'Which shop this profit record belongs to',
  `shop_id` int(11) DEFAULT NULL,
  `date` date NOT NULL COMMENT 'Date of the profit record',
  `daily_profit` decimal(20,2) NOT NULL DEFAULT 0.00 COMMENT 'Total profit for this day',
  `transaction_count` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of transactions this day',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rate_limit_log`
--

CREATE TABLE `rate_limit_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT 1,
  `shop_id` int(11) DEFAULT NULL,
  `expense_start_date` date DEFAULT NULL,
  `expense_end_date` date DEFAULT NULL,
  `generated_by` int(11) NOT NULL,
  `inventory_value` decimal(20,2) NOT NULL DEFAULT 0.00,
  `total_sales` decimal(20,2) NOT NULL DEFAULT 0.00,
  `total_cogs` decimal(20,2) NOT NULL DEFAULT 0.00,
  `total_expenses` decimal(20,2) NOT NULL DEFAULT 0.00,
  `business_capital` decimal(20,2) NOT NULL DEFAULT 0.00,
  `cash_in_hand` decimal(20,2) NOT NULL DEFAULT 0.00,
  `total_debt` decimal(20,2) NOT NULL DEFAULT 0.00,
  `gross_profit` decimal(20,2) NOT NULL DEFAULT 0.00,
  `operating_profit` decimal(20,2) NOT NULL DEFAULT 0.00,
  `net_profit` decimal(20,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `budgets`
--

CREATE TABLE IF NOT EXISTS `budgets` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `tenant_id` int(11) NOT NULL,
    `shop_id` int(11) NOT NULL,
    `budget_month` varchar(7) NOT NULL COMMENT 'Format: YYYY-MM',
    `target_sales` decimal(15,2) DEFAULT 0.00,
    `target_profit` decimal(15,2) DEFAULT 0.00,
    `max_expenses` decimal(15,2) DEFAULT 0.00,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_shop_month` (`shop_id`, `budget_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_analytics`
--

CREATE TABLE IF NOT EXISTS `customer_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL DEFAULT 1,
  `shop_id` int(11) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `segment` varchar(50) DEFAULT 'occasional',
  `first_purchase_date` date DEFAULT NULL,
  `last_purchase_date` date DEFAULT NULL,
  `days_since_last_purchase` int(11) DEFAULT 0,
  `total_transactions` int(11) DEFAULT 0,
  `total_spent` decimal(20,2) DEFAULT 0.00,
  `average_purchase_value` decimal(20,2) DEFAULT 0.00,
  `lifetime_value` decimal(20,2) DEFAULT 0.00,
  `purchase_frequency_days` decimal(10,2) DEFAULT 0.00,
  `total_debt_created` decimal(20,2) DEFAULT 0.00,
  `total_debt_paid` decimal(20,2) DEFAULT 0.00,
  `current_outstanding_debt` decimal(20,2) DEFAULT 0.00,
  `last_debt_payment_date` date DEFAULT NULL,
  `payment_reliability_score` decimal(5,4) DEFAULT 1.0000,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_customer_shop` (`shop_id`,`customer_phone`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_segment` (`segment`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `security_logs`
--

CREATE TABLE `security_logs` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) DEFAULT NULL COMMENT 'Which shop this security event relates to (NULL for unknown users)',
  `event_type` enum('failed_login','suspicious_activity','session_hijack','brute_force','unauthorized_access') NOT NULL,
  `username` varchar(100) DEFAULT NULL COMMENT 'Username involved in the event',
  `user_id` int(11) DEFAULT NULL COMMENT 'User ID if authenticated',
  `ip_address` varchar(45) NOT NULL COMMENT 'IPv4 or IPv6 address',
  `user_agent` text DEFAULT NULL COMMENT 'Browser/client information',
  `details` text DEFAULT NULL COMMENT 'Additional event details in JSON format',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT 1,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shops`
--

CREATE TABLE `shops` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL COMMENT 'Parent business/tenant that owns this branch',
  `shop_name` varchar(100) NOT NULL COMMENT 'Branch name (e.g., Lagos Main Branch)',
  `shop_address` text DEFAULT NULL COMMENT 'Physical address of this branch',
  `shop_phone` varchar(20) DEFAULT NULL COMMENT 'Branch contact phone number',
  `shop_email` varchar(100) DEFAULT NULL COMMENT 'Branch email (optional, can differ from tenant email)',
  `business_capital` decimal(20,2) DEFAULT 0.00 COMMENT 'Capital allocated to this branch',
  `low_stock_threshold` int(11) DEFAULT 5,
  `status` enum('active','suspended') DEFAULT 'active' COMMENT 'Branch operational status',
  `is_main_branch` tinyint(1) DEFAULT 0 COMMENT '1 if this is the primary/first branch',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Physical branch locations under each tenant (business owner)';

-- --------------------------------------------------------

--
-- Table structure for table `shop_settings`
--

CREATE TABLE IF NOT EXISTS `shop_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shop_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `vip_min_spend` decimal(20,2) DEFAULT 5000000.00,
  `vip_min_transactions` int(11) DEFAULT 10,
  `loyal_min_spend` decimal(20,2) DEFAULT 2000000.00,
  `loyal_min_transactions` int(11) DEFAULT 5,
  `at_risk_days` int(11) DEFAULT 60,
  `lost_days` int(11) DEFAULT 180,
  `currency_symbol` varchar(10) DEFAULT '₦',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_shop_settings` (`shop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_alerts`
--

CREATE TABLE `system_alerts` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `type` varchar(50) NOT NULL COMMENT 'Alert category: security, database, performance, business',
  `severity` enum('critical','warning','info') NOT NULL DEFAULT 'info',
  `message` varchar(255) NOT NULL COMMENT 'Brief alert description',
  `details` text DEFAULT NULL COMMENT 'Additional alert information in JSON format',
  `resolved` tinyint(1) DEFAULT 0 COMMENT 'Whether alert has been addressed',
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL COMMENT 'User ID who resolved the alert',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_metrics`
--

CREATE TABLE `system_metrics` (
  `id` int(11) NOT NULL,
  `metric_type` varchar(100) NOT NULL COMMENT 'Type of metric: db_size, table_stats, api_performance, etc.',
  `metric_data` text NOT NULL COMMENT 'Metric values in JSON format',
  `cached_at` datetime DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL COMMENT 'Cache expiration time (5 minutes from cached_at)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tenants`
--

CREATE TABLE `tenants` (
  `id` int(11) NOT NULL,
  `shop_name` varchar(100) NOT NULL,
  `shop_address` text DEFAULT NULL,
  `shop_phone` varchar(20) NOT NULL,
  `shop_email` varchar(100) NOT NULL,
  `business_capital` decimal(20,2) DEFAULT 0.00,
  `status` enum('active','suspended','pending','trial') DEFAULT 'trial',
  `plan_type` enum('free_trial','basic','premium','enterprise') DEFAULT 'free_trial',
  `trial_ends_at` timestamp NULL DEFAULT NULL,
  `subscription_ends_at` timestamp NULL DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT 0,
  `verification_token` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT 1,
  `shop_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `total_amount` decimal(20,2) NOT NULL,
  `total_cogs` decimal(20,2) DEFAULT 0.00,
  `gross_profit` decimal(20,2) DEFAULT 0.00,
  `payment_method` enum('cash','card','transfer','mixed') NOT NULL,
  `transaction_type` enum('sale','debt_payment') DEFAULT 'sale',
  `debt_payment_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transaction_items`
--

CREATE TABLE `transaction_items` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT 1,
  `shop_id` int(11) DEFAULT NULL,
  `transaction_id` int(11) NOT NULL,
  `inventory_id` int(11) NOT NULL,
  `price` decimal(20,2) NOT NULL,
  `type` enum('sale','trade_in') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT 1,
  `shop_id` int(11) DEFAULT NULL COMMENT 'Branch assignment: NULL=Owner (all branches), Non-NULL=Specific branch only',
  `username` varchar(50) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `avatar_color` varchar(7) NOT NULL DEFAULT '#3b82f6',
  `password_hash` varchar(255) NOT NULL,
  `role` enum('superadmin','admin','user') NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `username_last_changed` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `reset_token` varchar(64) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `debts`
--

CREATE TABLE IF NOT EXISTS `debts` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `transaction_id` int(11) DEFAULT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `customer_address` text DEFAULT NULL,
  `total_amount` decimal(20,2) NOT NULL,
  `paid_amount` decimal(20,2) NOT NULL DEFAULT 0.00,
  `remaining_balance` decimal(20,2) NOT NULL,
  `status` enum('unpaid','partially_paid','fully_paid','written_off') DEFAULT 'unpaid',
  `recorded_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `debt_payments`
--

CREATE TABLE IF NOT EXISTS `debt_payments` (
  `id` int(11) NOT NULL,
  `debt_id` int(11) NOT NULL,
  `amount_paid` decimal(20,2) NOT NULL,
  `recorded_by` int(11) NOT NULL,
  `payment_method` enum('cash','card','transfer','mixed') DEFAULT 'cash',
  `notes` text DEFAULT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_activity_logs_tenant_id` (`tenant_id`),
  ADD KEY `idx_activity_logs_shop` (`shop_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_expenses_shop` (`shop_id`);

--
-- Indexes for table `expense_records`
--
ALTER TABLE `expense_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_tenant_date` (`tenant_id`,`date`) COMMENT 'One expense record per tenant per day',
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_expense_records_tenant_date` (`tenant_id`,`date`),
  ADD KEY `idx_expense_records_shop` (`shop_id`);

--
-- Indexes for table `fraud_alerts`
--
ALTER TABLE `fraud_alerts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_imei` (`imei`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_brand_model` (`brand`,`model`),
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_shop_id` (`shop_id`),
  ADD KEY `idx_inventory_shop_status` (`shop_id`,`status`) COMMENT 'Composite for shop inventory queries',
  ADD KEY `idx_vendor` (`vendor`);

--
-- Indexes for table `kora_payment_references`
--
ALTER TABLE `kora_payment_references`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kora_reference` (`kora_reference`),
  ADD UNIQUE KEY `kora_transaction_id` (`kora_transaction_id`),
  ADD KEY `wallet_transaction_id` (`wallet_transaction_id`),
  ADD KEY `idx_kora_reference` (`kora_reference`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `marketplace_auction_bids`
--
ALTER TABLE `marketplace_auction_bids`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_listing` (`listing_id`),
  ADD KEY `idx_bidder` (`bidder_id`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `marketplace_conversations`
--
ALTER TABLE `marketplace_conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_conversation` (`listing_id`,`buyer_id`),
  ADD KEY `idx_buyer` (`buyer_id`),
  ADD KEY `idx_seller` (`seller_id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `marketplace_favorites`
--
ALTER TABLE `marketplace_favorites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_favorite` (`user_id`,`listing_id`),
  ADD KEY `listing_id` (`listing_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `marketplace_identity_verifications`
--
ALTER TABLE `marketplace_identity_verifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `kora_verification_id` (`kora_verification_id`),
  ADD UNIQUE KEY `kora_reference` (`kora_reference`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_status` (`verification_status`),
  ADD KEY `idx_verified` (`is_verified`);

--
-- Indexes for table `marketplace_interests`
--
ALTER TABLE `marketplace_interests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`,`listing_id`),
  ADD KEY `listing_id` (`listing_id`);

--
-- Indexes for table `marketplace_listings`
--
ALTER TABLE `marketplace_listings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `inventory_id` (`inventory_id`),
  ADD KEY `highest_bidder_id` (`highest_bidder_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_shop` (`shop_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_listing_type` (`listing_type`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `idx_price` (`price`);

--
-- Indexes for table `marketplace_listing_images`
--
ALTER TABLE `marketplace_listing_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_listing` (`listing_id`);

--
-- Indexes for table `marketplace_listing_views`
--
ALTER TABLE `marketplace_listing_views`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_listing` (`listing_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `marketplace_messages`
--
ALTER TABLE `marketplace_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `idx_conversation` (`conversation_id`),
  ADD KEY `idx_receiver_unread` (`receiver_id`,`is_read`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `marketplace_orders`
--
ALTER TABLE `marketplace_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `listing_id` (`listing_id`),
  ADD KEY `seller_shop_id` (`seller_shop_id`),
  ADD KEY `buyer_shop_id` (`buyer_shop_id`),
  ADD KEY `cancelled_by` (`cancelled_by`),
  ADD KEY `idx_seller` (`seller_id`),
  ADD KEY `idx_buyer` (`buyer_id`),
  ADD KEY `idx_status` (`order_status`),
  ADD KEY `idx_escrow` (`escrow_status`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `marketplace_order_history`
--
ALTER TABLE `marketplace_order_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `changed_by` (`changed_by`),
  ADD KEY `idx_order` (`order_id`);

--
-- Indexes for table `marketplace_profiles`
--
ALTER TABLE `marketplace_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_shop_unique` (`shop_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_shop` (`shop_id`),
  ADD KEY `idx_verified` (`is_verified`);

--
-- Indexes for table `marketplace_reports`
--
ALTER TABLE `marketplace_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reported_by` (`reported_by`),
  ADD KEY `listing_id` (`listing_id`),
  ADD KEY `reported_user_id` (`reported_user_id`),
  ADD KEY `message_id` (`message_id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_type` (`report_type`);

--
-- Indexes for table `marketplace_restrictions`
--
ALTER TABLE `marketplace_restrictions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `restricted_by` (`restricted_by`),
  ADD KEY `lifted_by` (`lifted_by`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `marketplace_reviews`
--
ALTER TABLE `marketplace_reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD KEY `listing_id` (`listing_id`),
  ADD KEY `reviewer_id` (`reviewer_id`),
  ADD KEY `idx_reviewed_user` (`reviewed_user_id`),
  ADD KEY `idx_rating` (`rating`);

--
-- Indexes for table `marketplace_verification_attempts`
--
ALTER TABLE `marketplace_verification_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `marketplace_wallets`
--
ALTER TABLE `marketplace_wallets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `marketplace_wallet_transactions`
--
ALTER TABLE `marketplace_wallet_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference_number` (`reference_number`),
  ADD KEY `idx_wallet` (`wallet_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_type` (`transaction_type`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `marketplace_withdrawal_requests`
--
ALTER TABLE `marketplace_withdrawal_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `wallet_id` (`wallet_id`),
  ADD KEY `kora_payment_id` (`kora_payment_id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `order_disputes`
--
ALTER TABLE `order_disputes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_reporter_id` (`reporter_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `reported_id` (`reported_id`);

--
-- Indexes for table `profit_records`
--
ALTER TABLE `profit_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_tenant_date` (`tenant_id`,`date`) COMMENT 'One profit record per tenant per day',
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_profit_records_tenant_date` (`tenant_id`,`date`),
  ADD KEY `idx_profit_records_shop` (`shop_id`);

--
-- Indexes for table `rate_limit_log`
--
ALTER TABLE `rate_limit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_action` (`user_id`,`action`,`created_at`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `generated_by` (`generated_by`),
  ADD KEY `idx_tenant_id` (`tenant_id`);

--
-- Indexes for table `security_logs`
--
ALTER TABLE `security_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_event_type` (`event_type`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_ip_address` (`ip_address`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_tenant_id` (`tenant_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_last_activity` (`last_activity`),
  ADD KEY `idx_tenant_id` (`tenant_id`);

--
-- Indexes for table `shops`
--
ALTER TABLE `shops`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_is_main_branch` (`is_main_branch`),
  ADD KEY `idx_shops_tenant_status` (`tenant_id`,`status`) COMMENT 'Composite index for active shops lookup';

--
-- Indexes for table `system_alerts`
--
ALTER TABLE `system_alerts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_severity` (`severity`),
  ADD KEY `idx_resolved` (`resolved`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `resolved_by` (`resolved_by`),
  ADD KEY `idx_tenant_id` (`tenant_id`);

--
-- Indexes for table `system_metrics`
--
ALTER TABLE `system_metrics`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_metric_type` (`metric_type`),
  ADD KEY `idx_metric_type` (`metric_type`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `tenants`
--
ALTER TABLE `tenants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `shop_email` (`shop_email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_plan_type` (`plan_type`),
  ADD KEY `idx_trial_ends_at` (`trial_ends_at`),
  ADD KEY `idx_email_verified` (`email_verified`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_transactions_shop` (`shop_id`);

--
-- Indexes for table `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `inventory_id` (`inventory_id`),
  ADD KEY `idx_transaction_id` (`transaction_id`),
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_transaction_items_shop` (`shop_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_reset_token` (`reset_token`),
  ADD KEY `idx_users_username` (`username`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_shop_id` (`shop_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expense_records`
--
ALTER TABLE `expense_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fraud_alerts`
--
ALTER TABLE `fraud_alerts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `kora_payment_references`
--
ALTER TABLE `kora_payment_references`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_auction_bids`
--
ALTER TABLE `marketplace_auction_bids`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_conversations`
--
ALTER TABLE `marketplace_conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_favorites`
--
ALTER TABLE `marketplace_favorites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_identity_verifications`
--
ALTER TABLE `marketplace_identity_verifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_interests`
--
ALTER TABLE `marketplace_interests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_listings`
--
ALTER TABLE `marketplace_listings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_listing_images`
--
ALTER TABLE `marketplace_listing_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_listing_views`
--
ALTER TABLE `marketplace_listing_views`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_messages`
--
ALTER TABLE `marketplace_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_orders`
--
ALTER TABLE `marketplace_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_order_history`
--
ALTER TABLE `marketplace_order_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_profiles`
--
ALTER TABLE `marketplace_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_reports`
--
ALTER TABLE `marketplace_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_restrictions`
--
ALTER TABLE `marketplace_restrictions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_reviews`
--
ALTER TABLE `marketplace_reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_verification_attempts`
--
ALTER TABLE `marketplace_verification_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_wallets`
--
ALTER TABLE `marketplace_wallets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_wallet_transactions`
--
ALTER TABLE `marketplace_wallet_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketplace_withdrawal_requests`
--
ALTER TABLE `marketplace_withdrawal_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_disputes`
--
ALTER TABLE `order_disputes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `profit_records`
--
ALTER TABLE `profit_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rate_limit_log`
--
ALTER TABLE `rate_limit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `security_logs`
--
ALTER TABLE `security_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sessions`
--
ALTER TABLE `sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shops`
--
ALTER TABLE `shops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_alerts`
--
ALTER TABLE `system_alerts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_metrics`
--
ALTER TABLE `system_metrics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transaction_items`
--
ALTER TABLE `transaction_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_activity_logs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_expenses_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_expenses_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `expense_records`
--
ALTER TABLE `expense_records`
  ADD CONSTRAINT `expense_records_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `fraud_alerts`
--
ALTER TABLE `fraud_alerts`
  ADD CONSTRAINT `fraud_alerts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fraud_alerts_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `inventory`
--
ALTER TABLE `inventory`
  ADD CONSTRAINT `fk_inventory_shop_id` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inventory_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `kora_payment_references`
--
ALTER TABLE `kora_payment_references`
  ADD CONSTRAINT `kora_payment_references_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kora_payment_references_ibfk_2` FOREIGN KEY (`wallet_transaction_id`) REFERENCES `marketplace_wallet_transactions` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `marketplace_auction_bids`
--
ALTER TABLE `marketplace_auction_bids`
  ADD CONSTRAINT `marketplace_auction_bids_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_auction_bids_ibfk_2` FOREIGN KEY (`bidder_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_conversations`
--
ALTER TABLE `marketplace_conversations`
  ADD CONSTRAINT `marketplace_conversations_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_conversations_ibfk_2` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_conversations_ibfk_3` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_conversations_ibfk_4` FOREIGN KEY (`order_id`) REFERENCES `marketplace_orders` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `marketplace_favorites`
--
ALTER TABLE `marketplace_favorites`
  ADD CONSTRAINT `marketplace_favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_favorites_ibfk_2` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_identity_verifications`
--
ALTER TABLE `marketplace_identity_verifications`
  ADD CONSTRAINT `marketplace_identity_verifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_interests`
--
ALTER TABLE `marketplace_interests`
  ADD CONSTRAINT `marketplace_interests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_interests_ibfk_2` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_listings`
--
ALTER TABLE `marketplace_listings`
  ADD CONSTRAINT `marketplace_listings_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_listings_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_listings_ibfk_3` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_listings_ibfk_4` FOREIGN KEY (`highest_bidder_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `marketplace_listing_images`
--
ALTER TABLE `marketplace_listing_images`
  ADD CONSTRAINT `marketplace_listing_images_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_listing_views`
--
ALTER TABLE `marketplace_listing_views`
  ADD CONSTRAINT `marketplace_listing_views_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_listing_views_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `marketplace_messages`
--
ALTER TABLE `marketplace_messages`
  ADD CONSTRAINT `marketplace_messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `marketplace_conversations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_messages_ibfk_3` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_orders`
--
ALTER TABLE `marketplace_orders`
  ADD CONSTRAINT `marketplace_orders_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_orders_ibfk_2` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_orders_ibfk_3` FOREIGN KEY (`seller_shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_orders_ibfk_4` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_orders_ibfk_5` FOREIGN KEY (`buyer_shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_orders_ibfk_6` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `marketplace_order_history`
--
ALTER TABLE `marketplace_order_history`
  ADD CONSTRAINT `marketplace_order_history_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `marketplace_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_order_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `marketplace_profiles`
--
ALTER TABLE `marketplace_profiles`
  ADD CONSTRAINT `marketplace_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_profiles_ibfk_2` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_reports`
--
ALTER TABLE `marketplace_reports`
  ADD CONSTRAINT `marketplace_reports_ibfk_1` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_reports_ibfk_2` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `marketplace_reports_ibfk_3` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `marketplace_reports_ibfk_4` FOREIGN KEY (`message_id`) REFERENCES `marketplace_messages` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `marketplace_reports_ibfk_5` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `marketplace_restrictions`
--
ALTER TABLE `marketplace_restrictions`
  ADD CONSTRAINT `marketplace_restrictions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_restrictions_ibfk_2` FOREIGN KEY (`restricted_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_restrictions_ibfk_3` FOREIGN KEY (`lifted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `marketplace_reviews`
--
ALTER TABLE `marketplace_reviews`
  ADD CONSTRAINT `marketplace_reviews_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `marketplace_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_reviews_ibfk_2` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_reviews_ibfk_3` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_reviews_ibfk_4` FOREIGN KEY (`reviewed_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_verification_attempts`
--
ALTER TABLE `marketplace_verification_attempts`
  ADD CONSTRAINT `marketplace_verification_attempts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_wallets`
--
ALTER TABLE `marketplace_wallets`
  ADD CONSTRAINT `marketplace_wallets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_wallet_transactions`
--
ALTER TABLE `marketplace_wallet_transactions`
  ADD CONSTRAINT `marketplace_wallet_transactions_ibfk_1` FOREIGN KEY (`wallet_id`) REFERENCES `marketplace_wallets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_wallet_transactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `marketplace_withdrawal_requests`
--
ALTER TABLE `marketplace_withdrawal_requests`
  ADD CONSTRAINT `marketplace_withdrawal_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_withdrawal_requests_ibfk_2` FOREIGN KEY (`wallet_id`) REFERENCES `marketplace_wallets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketplace_withdrawal_requests_ibfk_3` FOREIGN KEY (`kora_payment_id`) REFERENCES `kora_payment_references` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `marketplace_withdrawal_requests_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `order_disputes`
--
ALTER TABLE `order_disputes`
  ADD CONSTRAINT `order_disputes_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `marketplace_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_disputes_ibfk_2` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_disputes_ibfk_3` FOREIGN KEY (`reported_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `profit_records`
--
ALTER TABLE `profit_records`
  ADD CONSTRAINT `profit_records_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `fk_reports_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `security_logs`
--
ALTER TABLE `security_logs`
  ADD CONSTRAINT `fk_security_logs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `security_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `fk_sessions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `shops`
--
ALTER TABLE `shops`
  ADD CONSTRAINT `shops_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `system_alerts`
--
ALTER TABLE `system_alerts`
  ADD CONSTRAINT `fk_system_alerts_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `system_alerts_ibfk_1` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transactions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD CONSTRAINT `fk_transaction_items_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transaction_items_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `transaction_items_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `transaction_items_ibfk_2` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_shop_id` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON UPDATE CASCADE;

--
-- Indexes for table `debts`
--
ALTER TABLE `debts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_shop_id` (`shop_id`),
  ADD KEY `idx_transaction_id` (`transaction_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `recorded_by` (`recorded_by`);

--
-- Indexes for table `debt_payments`
--
ALTER TABLE `debt_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_debt_id` (`debt_id`),
  ADD KEY `recorded_by` (`recorded_by`);

--
-- AUTO_INCREMENT for table `debts`
--
ALTER TABLE `debts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `debt_payments`
--
ALTER TABLE `debt_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for table `debts`
--
ALTER TABLE `debts`
  ADD CONSTRAINT `fk_debts_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_debts_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `debt_payments`
--
ALTER TABLE `debt_payments`
  ADD CONSTRAINT `fk_payments_debt` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payments_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD KEY `idx_transaction_type` (`transaction_type`),
  ADD KEY `idx_debt_payment_id` (`debt_payment_id`);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
