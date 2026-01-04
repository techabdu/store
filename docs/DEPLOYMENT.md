# Deployment Plan - Phone Retailer Management System

This document outlines the steps required to deploy the system to a production environment.

## 📋 Prerequisites
- **Server**: Linux (Ubuntu 22.04 recommended) or macOS.
- **Web Server**: Apache or Nginx.
- **PHP**: Version 8.1 or higher with `mysqli`, `json`, `session`, `openssl` extensions.
- **Database**: MySQL 8.0 or MariaDB.
- **Tools**: Composer (for Ratchet WebSocket), Node.js (for frontend build).

---

## 🚀 Deployment Steps

### 1. Database Setup
1. Create a fresh database: `CREATE DATABASE prhub_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. Import the base schema: `mysql -u root -p prhub_store < backend/sql/database_schema.sql`
3. Run migrations: `php backend/scripts/migrate.php`

### 2. Backend Configuration
1. Copy `.env.example` to `.env`.
2. Update the following variables in `.env`:
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
   - `APP_ENV=production`
   - `API_BASE_URL=https://your-domain.com/api`
3. Configure `.htaccess` for Apache or set up equivalent Nginx routing to `backend/api/`.

### 3. Frontend Build
1. Navigate to `frontend/`.
2. Run `npm install`.
3. Create `.env` for frontend with `VITE_API_URL=https://your-domain.com/api`.
4. Run `npm run build`.
5. Deploy the `dist/` folder to your static hosting or point your web server to it.

### 4. WebSocket Server (Optional but Recommended)
1. Navigate to `backend/`.
2. Run `composer install` to install Ratchet.
3. Start the WebSocket server: `php backend/websocket/server.php`
4. Use a process manager like **PM2** or **Supervisor** to keep the server running:
   ```bash
   pm2 start "php backend/websocket/server.php" --name "prhub-ws"
   ```

### 5. Background Workers (Cron Jobs)
Set up the following cron jobs for maintenance and auditing:
- **Metrics Aggregation**: Every hour.
- **Report Generation**: Every midnight.
- **Health Checks**: Every 5 minutes.
See `backend/workers/CRON_SETUP.md` for specific command entries.

---

## 🛡️ Post-Deployment Security Audit
1. Verify that `.env` is NOT publicly accessible.
2. Verify that `cors_allow_origin` in `config.php` is restricted to your production domain.
3. Check `logs/security.log` for any suspicious activity during initial launch.
4. Ensure SSL/TLS is enabled for both HTTPS and WSS (WebSocket Secure).

---

## 🔄 Rollback Procedure
1. Keep a backup of the previous database state.
2. If critical errors occur, revert the `frontend/dist` and point back to the previous stable release.
3. Restore the database if migrations introduced breaking changes.
