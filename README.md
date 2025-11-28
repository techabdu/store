# Phone Retailer Management System

A complete web-based management system for phone retail businesses with role-based access control, inventory tracking, point-of-sale, and financial reporting.

## What It Does

This application helps phone retailers manage their entire business operations:

- **User Management**: Three-tier role system (SuperAdmin, Admin, User) with secure authentication
- **Inventory Management**: Track phones with IMEI, brand, model, storage, color, condition, and pricing
- **Point of Sale (POS)**: Process sales transactions with customer details and multiple payment methods
- **Sales Tracking**: View sales history, generate receipts, and track customer purchases
- **Financial Management**: Track expenses, monitor profits, and generate financial reports
- **Activity Logging**: Audit trail of all user actions and system events
- **System Insights**: Monitor security, database health, performance, and business metrics (SuperAdmin)
- **Shop Settings**: Configure shop information (name, address, phone, email, business capital)

## Tech Stack

- **Frontend**: React (Vite), React Router, Axios
- **Backend**: PHP (OOP), RESTful APIs
- **Database**: MySQL

## Quick Start

### 1. Database Setup
```bash
# Start XAMPP (Apache + MySQL)
# Open phpMyAdmin at http://localhost/phpmyadmin
# Create database named 'store'
# Import all SQL files from backend/sql/ directory
```

### 2. Backend
```bash
# Ensure project is in htdocs/store
# Verify backend/config/database.php credentials (default: root/no password)
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Login
- **URL**: http://localhost:5173
- **Username**: `it support`
- **Password**: `superadmin123`
- **Role**: SuperAdmin

## Features by Role

### SuperAdmin
- Full system access and control
- User management (create/edit/delete admins and users)
- System insights and monitoring
- All admin and user features

### Admin
- User management (create/edit/delete users only)
- Inventory management
- Sales and POS access
- Financial reports and expense tracking
- Customer management
- Shop settings configuration

### User
- Inventory management
- Point of Sale (POS)
- Sales history
- Personal profile settings

## Project Structure

```
store/
├── backend/
│   ├── api/          # RESTful API endpoints
│   ├── classes/      # PHP OOP classes
│   ├── config/       # Database configuration
│   ├── middleware/   # Authentication & authorization
│   └── sql/          # Database schemas
└── frontend/
    └── src/
        ├── pages/    # React components (admin, user, superadmin)
        ├── context/  # Auth context
        └── utils/    # API configuration
```

## License

All rights reserved
