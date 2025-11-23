# Phone Retailer Management System

A full-stack web application for managing a phone retail business, featuring role-based authentication, inventory management, and sales tracking.

## Tech Stack
- **Frontend**: React (Vite), React Router, Axios, CSS Modules
- **Backend**: PHP (Vanilla), MySQL
- **Database**: MySQL (XAMPP)

## Features
- **Authentication**: Secure login/logout with PHP sessions (48h timeout).
- **RBAC**: Three-tier role system (SuperAdmin, Admin, User).
- **Protected Routes**: Frontend route guards based on authentication and roles.
- **Dashboards**: Dedicated dashboards for each user role.

## Setup Instructions

### 1. Database Setup
1. Start Apache and MySQL in XAMPP.
2. Open phpMyAdmin (`http://localhost/phpmyadmin`).
3. Create a new database named `store`.
4. Import `backend/sql/setup.sql` to create tables and seed the SuperAdmin user.

### 2. Backend Setup
1. Ensure the project is located in `htdocs/store`.
2. Verify `backend/config/database.php` matches your MySQL credentials (default: root/empty).

### 3. Frontend Setup
1. Navigate to `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage
### Default Credentials
- **Username**: `it support`
- **Password**: `superadmin123`
- **Role**: SuperAdmin

## API Structure
- `POST /api/auth/login.php`: Authenticate user.
- `POST /api/auth/logout.php`: Destroy session.
- `GET /api/auth/check-session.php`: Validate current session.

## Testing
Refer to `tests/auth_test_suite.md` for manual testing scenarios.
