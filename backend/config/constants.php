<?php
/**
 * Application Constants
 * Unified definitions for statuses, roles, and types
 */

// User Roles
define('ROLE_SUPERADMIN', 'superadmin');
define('ROLE_ADMIN', 'admin');
define('ROLE_USER', 'user');

// Listing Statuses
define('LISTING_STATUS_ACTIVE', 'active');
define('LISTING_STATUS_PENDING', 'pending');
define('LISTING_STATUS_SOLD', 'sold');
define('LISTING_STATUS_DELETED', 'deleted');

// Order Statuses
define('ORDER_STATUS_PENDING', 'pending');
define('ORDER_STATUS_PAID', 'paid');
define('ORDER_STATUS_PROCESSING', 'processing');
define('ORDER_STATUS_SHIPPED', 'shipped');
define('ORDER_STATUS_DELIVERED', 'delivered');
define('ORDER_STATUS_COMPLETED', 'completed');
define('ORDER_STATUS_CANCELLED', 'cancelled');

// Wallet Transaction Types
define('TRANS_TYPE_DEPOSIT', 'pay_in');
define('TRANS_TYPE_WITHDRAWAL', 'withdraw');
define('TRANS_TYPE_SALE_PENDING', 'sale_pending');
define('TRANS_TYPE_SALE_RELEASED', 'sale_released');
define('TRANS_TYPE_REFUND', 'refund');

// Wallet Transaction Statuses
define('TRANS_STATUS_PENDING', 'pending');
define('TRANS_STATUS_SUCCESS', 'success');
define('TRANS_STATUS_FAILED', 'failed');
