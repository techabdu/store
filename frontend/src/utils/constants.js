/**
 * Application Constants
 */

// User Roles
export const ROLES = {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    USER: 'user',
};

// Listing Statuses
export const LISTING_STATUS = {
    ACTIVE: 'active',
    PENDING: 'pending',
    SOLD: 'sold',
    DELETED: 'deleted',
};

// Order Statuses
export const ORDER_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Wallet Transaction Types
export const TRANS_TYPE = {
    DEPOSIT: 'pay_in',
    WITHDRAWAL: 'withdraw',
    SALE_PENDING: 'sale_pending',
    SALE_RELEASED: 'sale_released',
    REFUND: 'refund',
};

// Wallet Transaction Statuses
export const TRANS_STATUS = {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
};
