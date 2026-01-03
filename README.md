# Phone Retailer Management System (Multi-Tenant)

A complete SaaS-ready management system for phone retail businesses. Supports multiple independent shops (tenants) with isolated data, role-based access control, inventory tracking, point-of-sale, and financial reporting.

## Key Features

### Multi-Tenancy
- **Data Isolation**: Each shop has its own completely isolated database of users, inventory, and sales.
- **Self-Registration**: New shops can register, select a plan, and verify email to get started instantly.
- **Subscription Plans**: Supports Free Trial, Basic, Premium, and Enterprise plans.
- **Tenant Management**: SuperAdmin tools to monitor, suspend, or activate shop accounts.

### Core Functionality
- **User Management**: Role-based access (Admin, User) within each shop.
- **Inventory Management**: Track phones with IMEI, brand, model, storage, color, condition, and pricing.
- **Point of Sale (POS)**: Process sales and trade-ins with automatic inventory updates.
- **Financials**: Track expenses, sales history, and generate profit/loss reports.
- **Support System**: Robust internal helpdesk with role-based ticket management.
- **Platform Monitoring**: Real-time health tracking for system, users, errors, and business metrics.
- **Reporting Wizard**: Context-aware 3-step reporting for disputes and technical issues.
- **Security**: Email verification, secure authentication, and detailed activity audit logs.

## Tech Stack

- **Frontend**: React (Vite), React Router, Axios, Tailwind-like CSS
- **Backend**: PHP (OOP), RESTful APIs, MySQL
- **Security**: JWT-like session management, BCrypt password hashing, CSRF protection

## Documentation
- **User Guide**: [Support & Monitoring User Guide](./MONITORING_USER_GUIDE.md)
- **Admin Guide**: [Technical Infrastructure & Monitoring Admin Guide](./MONITORING_ADMIN_GUIDE.md)

## Quick Start

### 1. Database Setup
```bash
# Start XAMPP (Apache + MySQL)
# Open phpMyAdmin at http://localhost/phpmyadmin
# Create database named 'store'
# Import SQL files from backend/sql/ in order:
# 1. 00_init.sql (if exists)
# 2. 01_multi_tenancy.sql
```

### 2. Backend Configuration
```bash
# Rename backend/.env.example to backend/.env
# Update SMTP settings for email verification:
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USERNAME=your_username
SMTP_PASSWORD=your_password
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Accessing the System

**Register a New Shop:**
- **URL**: http://localhost:5173/register
- Follow the steps to create your own isolated shop environment.

**SuperAdmin Access:**
- **URL**: http://localhost:5173/login
- **Username**: `superadmin` (or as configured in database)
- **Password**: `SuperAdmin123!@#`

## Features by Role

### SuperAdmin
- **Tenant Management**: View all shops, suspend/activate accounts, monitor trial status.
- **System Insights**: Global metrics on system usage, active tenants, and revenue.
- **User Management**: View all system users across tenants.

### Shop Admin (Tenant Owner)
- **Full Shop Control**: Manage inventory, users, and settings for YOUR shop only.
- **Financial Reports**: View profits, expenses, and sales data.
- **User Management**: Create staff accounts (User role) for your shop.

### Shop User (Staff)
- **POS**: Process sales and trade-ins.
- **Inventory**: View and search stock.
- **Sales History**: View past transactions.

## Project Structure

```
store/
├── backend/
│   ├── api/          # Tenant-aware RESTful endpoints
│   ├── classes/      # Core logic (Auth, Tenant, Inventory)
│   ├── config/       # Database & Env config
│   ├── helpers/      # Email & Utility helpers
│   └── sql/          # Migration scripts
└── frontend/
    └── src/
        ├── pages/
        │   ├── superadmin/  # Global management views
        │   ├── admin/       # Shop owner views
        │   ├── user/        # Staff views
        │   └── shared/      # Common views (Login, Register)
        └── components/      # Reusable UI components
```

## License

All rights reserved.
