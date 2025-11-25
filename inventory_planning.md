# User Inventory & POS System - Implementation Plan

## Goal Description
Implement a robust inventory management and Point of Sale (POS) system for the "User" and "Admin" roles. This includes:
1.  **Inventory Management**: CRUD operations for phone stock.
2.  **Point of Sale (POS)**: Interface for selling multiple phones in a single transaction.
3.  **Swap/Trade-In**: Functionality to accept used phones as part of a transaction, automatically adding them to inventory while selling new devices.

## User Review Required
> [!IMPORTANT]
> **Database Changes**: This plan requires creating new tables (`inventory`, `transactions`, `transaction_items`).
> **Business Logic**: "Swap" is defined as a transaction where a customer trades in a device (credit) for a new one (debit). The trade-in device is immediately added to inventory with status 'in_stock' and condition 'used'.

## Proposed Changes

### Database Schema
New SQL file `backend/sql/inventory_schema.sql` to create:

1.  **`inventory` table**:
    -   `id` (INT PK)
    -   `brand` (VARCHAR)
    -   `model` (VARCHAR)
    -   `imei` (VARCHAR UNIQUE) - Critical for tracking individual phones
    -   `color` (VARCHAR)
    -   `storage` (VARCHAR)
    -   `condition` (ENUM: 'new', 'used')
    -   `price` (DECIMAL) - Selling price
    -   `cost_price` (DECIMAL) - Cost to store
    -   `status` (ENUM: 'in_stock', 'sold', 'returned')
    -   `created_by` (INT FK users)
    -   `created_at`, `updated_at`

2.  **`transactions` table**:
    -   `id` (INT PK)
    -   `user_id` (INT FK users) - Employee who processed sale
    -   `customer_name` (VARCHAR)
    -   `customer_phone` (VARCHAR)
    -   `total_amount` (DECIMAL)
    -   `payment_method` (ENUM: 'cash', 'card', 'transfer', 'mixed')
    -   `created_at`

3.  **`transaction_items` table**:
    -   `id` (INT PK)
    -   `transaction_id` (INT FK transactions)
    -   `inventory_id` (INT FK inventory)
    -   `price` (DECIMAL) - Price at time of sale (or negative for trade-in credit)
    -   `type` (ENUM: 'sale', 'trade_in')

### Backend (PHP)

#### [NEW] `backend/api/inventory/`
-   `read.php`: GET list of phones (filters: status, search).
-   `create.php`: POST new phone (used for manual entry and trade-ins).
-   `update.php`: PUT update phone details.
-   `delete.php`: DELETE phone (Admin and SuperAdmin only).

#### [NEW] `backend/api/transactions/`
-   `create.php`: POST new transaction. Handles complex logic:
    -   Validates all items.
    -   Updates `inventory` status to 'sold' for sale items.
    -   Inserts `trade_in` items into `inventory` (if not already added via frontend flow, but better to handle as atomic transaction).
    -   Records transaction and items.

### Frontend (React)

#### [NEW] `frontend/src/pages/UserInventory.jsx`
-   Table view of current stock.
-   Search/Filter by IMEI, Model, Brand.
-   "Add Phone" modal for manual stock entry.

#### [NEW] `frontend/src/pages/POS.jsx`
-   **Product Search**: Quick search to add items to cart.
-   **Cart**: List of items to be sold.
-   **Trade-In Button**: Opens modal to enter details of customer's old phone.
    -   Adding a trade-in adds a negative value item to the cart (credit).
-   **Checkout**: Finalize sale, enter customer details, print receipt (future).

## Verification Plan

### Automated Tests
-   Test API endpoints using Postman/cURL.
-   Verify database state after Sale and Swap transactions.

### Manual Verification
1.  **Add Stock**: Manually add a "iPhone 13 - New".
2.  **Sell Stock**: Go to POS, search for the iPhone 13, complete sale. Verify status becomes 'sold'.
3.  **Swap**:
    -   Customer buys "Samsung S24" ($1000).
    -   Trades in "Samsung S21" ($200 credit).
    -   Cart Total: $800.
    -   Complete transaction.
    -   Verify: S24 is 'sold', S21 is 'in_stock' (used), Transaction total is $800.
