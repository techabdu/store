# SuperAdmin API Documentation - Tenant Management System

This document outlines the API endpoints available for the SuperAdmin Tenant Management module.

## Base URL
`/backend/api/superadmin/`

## Authentication
All endpoints require a valid SuperAdmin session. Authentication is verified via `PHPSESSID` cookie. Standard middleware `checkAuth()` and `checkRole(['superadmin'])` are applied to all endpoints.

---

## 1. Tenants Listing (`tenants.php`)
Manages the global list of tenants in the system.

### `GET /tenants.php`
Fetches a paginated list of all tenants.
- **Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `search`: Search by shop name or email (optional)
  - `status`: Filter by status (`active`, `trial`, `suspended`, `pending`) (optional)
- **Response:**
  - `tenants`: Array of tenant objects
  - `pagination`: Metadata (`total`, `page`, `limit`, `pages`)

### `PUT /tenants.php`
Updates tenant status or plan.
- **Body:** `{ "id": 1, "status": "active", "plan_type": "premium" }`

### `DELETE /tenants.php`
Permanently deletes a tenant and all related data.
- **Body:** `{ "id": 1 }`

---

## 2. Tenant Details (`tenant_details.php`)
Comprehensive view of a specific tenant.

### `GET /tenant_details.php?action=overview&tenant_id={id}`
Returns tenant summary, quick stats, and recent activity timeline.

### `GET /tenant_details.php?action=timeline&tenant_id={id}`
Returns paginated activity logs for the tenant.
- **Parameters:** `page`, `limit`.

---

## 3. User Management (`tenant_users.php`)
Manage users within a tenant.

### `GET /tenant_users.php?action=list&tenant_id={id}`
- **Parameters:** `page`, `limit`, `search`, `role`.

### `POST /tenant_users.php?action=suspend_user`
- **Body:** `{ "user_id": 123, "reason": "Policy violation" }`

---

## 4. Subscriptions (`tenant_subscription.php`)
Manage plans, trial extensions, and billing.

### `POST /tenant_subscription.php?action=upgrade`
- **Body:** `{ "tenant_id": 1, "new_plan": "premium", "mrr": 49.99, "notes": "Upgrade request" }`

### `POST /tenant_subscription.php?action=extend_trial`
- **Body:** `{ "tenant_id": 1, "days": 14, "reason": "Testing period extension" }`

---

## 5. Support & Communications (`tenant_support.php`)
Manage tickets and internal notes.

### `GET /tenant_support.php?action=tickets&tenant_id={id}`
Paginated list of support tickets.

### `POST /tenant_support.php?action=add_note`
Add internal SuperAdmin note.
- **Body:** `{ "tenant_id": 1, "content": "Follow up next week", "note_type": "general" }`

---

## 6. Advanced Settings (`tenant_settings.php`)
Control features and administrative actions.

### `GET /tenant_settings.php?action=get_features&tenant_id={id}`
Returns feature flags and limits for the tenant.

### `POST /tenant_settings.php?action=toggle_feature`
- **Body:** `{ "tenant_id": 1, "feature_key": "inventory_management", "is_enabled": 0 }`

### `POST /tenant_settings.php?action=verify_email`
Manually verify a tenant's email address.
- **Body:** `{ "tenant_id": 1 }`

---

## 7. Platform Monitoring

### `GET /system_insights.php?tab={tab}`
System health, resource usage, and security alerts.
- **Tabs:** `security`, `database`, `resources`, `performance`, `audit`, `vulnerabilities`, `overview`.

### `GET /platform_metrics.php?type={type}&period={period}`
Aggregation of business and performance metrics.
- **Types:** `growth`, `inventory`, `transactions`, `usage`.

### `GET /health_scores.php`
Comparative health scoring for all tenants or historical view for a specific tenant.
- **Parameters:** `tenant_id` (optional), `category` (optional).

---

## 8. Impersonation (`impersonate.php`)
**Security Warning:** All impersonations are logged and audited.

### `POST /impersonate.php?action=start`
Starts an impersonation session.
- **Body:** `{ "user_id": 123, "reason": "Debugging order issue #456" }`
- **Security:**
  - Original session is stored.
  - Mandatory reason.
  - Cannot impersonate other SuperAdmins.

### `POST /impersonate.php?action=end`
Ends impersonation and restores the original SuperAdmin session.
