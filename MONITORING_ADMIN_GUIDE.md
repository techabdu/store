# MONITORING SYSTEM - ADMIN & TECHNICAL GUIDE

This guide provides technical details for SuperAdmins and System Engineers on how to manage the background workers, database, and monitoring infrastructure.

---

## 🏗 System Architecture

The monitoring system consists of three layers:
1.  **Ingestion**: API middleware and manual reports (Report Wizard) logging data.
2.  **Processing**: Background workers (PHP CLI) aggregating data and calculating scores.
3.  **Visualization**: React-based dashboards with real-time WebSocket updates.

---

## ⚙️ Background Workers

The system relies on several cron-scheduled workers (`backend/workers/`):

| Worker | Frequency | Purpose |
| :--- | :--- | :--- |
| `MetricsAggregator.php` | Every 5 mins | Aggregates logs into hourly/daily metrics for charts. |
| `AlertProcessor.php` | Every 1 min | Checks metrics against thresholds and generates system alerts. |
| `HealthScoreCalculator.php` | Daily (3 AM) | Calculates 0-100 scores for each tenant. |
| `StorageCalculator.php` | Daily (4 AM) | Measures database and file usage per tenant. |
| `LogCleaner.php` | Daily (2 AM) | Rotates and purges old diagnostic data. |

### Manual Execution
To run a worker manually for debugging:
```bash
php backend/workers/MetricsAggregator.php
```

---

## 🔌 WebSocket Server

Real-time updates are handled by a Ratchet-based WebSocket server.
- **Path**: `backend/websocket/server.php`
- **Port**: 8080 (Configurable)
- **Channels**: `metrics`, `alerts`, `activity`, `errors`.

### Managing the Server
It's recommended to run the server via a process manager like **Supervisor**:
```bash
# Configuration example
[program:websocket-server]
command=php /path/to/backend/websocket/server.php
autostart=true
autorestart=true
user=www-data
```

---

## 📊 Database Schema

Key tables in the monitoring module:
- `system_metrics`: Raw time-series data for CPU, Memory, Latency.
- `tenant_health_scores`: Daily historical scores for business monitoring.
- `support_tickets`: Core table for the helpdesk system.
- `application_errors`: Centralized error log for all tenants.

---

## 📈 Troubleshooting

### No data in charts?
1. Check if the `MetricsAggregator` cron job is running.
2. Verify the `system_metrics` table has recent entries.
3. Check PHP error logs for database connection issues.

### WebSocket "Reconnecting" loop?
1. Ensure port 8080 is open in your firewall.
2. Check if the server is running: `ps aux | grep websocket`.
3. If using SSL, ensure `wss://` is configured in the frontend `.env`.

### Support emails not sending?
1. Verify SMTP settings in `backend/.env`.
2. Check `backend/helpers/EmailNotifier.php` logs.

---

## 🚀 Deployment Checklist
1. Run migrations in `backend/sql/migrations/`.
2. Setup Crontab entries (see `backend/workers/CRON_SETUP.md`).
3. Start the WebSocket server.
4. Verify `VITE_WS_URL` in production environment variables.
