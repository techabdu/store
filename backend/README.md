# PRHUB Backend

## Overview
This is the PHP/MySQL backend for the PRHUB Phone Retailer Management System.
It uses a multi-tenant architecture to support multiple shops.

## Security
This project follows strict security guidelines:
- **Tenant Isolation**: Data is separated by `tenant_id` at the database level.
- **Secure Auth**: Modern hashing (bcrypt), generic error messages, and robust session management.
- **Validation**: Strict input validation and sanitization.

See [api/SECURITY.md](api/SECURITY.md) for detailed API security information.

## Setup
To set up the database:
1. Import `sql/database_schema.sql`.
2. Admin credentials should be generated securely (see legacy setup scripts if available).

## Directory Structure
- `api/`: REST API endpoints.
- `classes/`: PHP classes (SecurityMonitor, etc.).
- `config/`: Configuration files (database, headers).
- `helpers/`: Utility functions (sanitize, validate, csrf).
- `middleware/`: Auth and role checks.
- `logs/`: Application logs (if configured).
