# SuperAdmin Tenant Management Guide 🚀

Welcome to the SuperAdmin Panel. This guide explains how to manage tenants, monitor system health, and use administrative tools responsibly.

---

## 📋 Tenant Management
The **Tenant Management** page gives you a bird's-eye view of all shops registered on the platform.
- **Search & Filter:** Use the search bar to find shops by name or email. Filter by status to see who is on Trial or Suspended.
- **Paginated Lists:** Large datasets are paginated to ensure fast load times. Use the controls at the bottom of the table.
- **Quick Stats:** View global counts of total, active, and trial tenants at the top of the dashboard.

## 🕵️ Impersonation (Troubleshooting)
If a tenant reports an issue you can't see, you can "Impersonate" a user.
1. Go to **Tenant Details** → **Users & Activity**.
2. Click the **Impersonate** icon next to a user.
3. Provide a valid reason (this is logged for audit).
4. You will be logged into their account exactly as they see it.
5. A purple banner will remind you that you are impersonating.
6. Click **Exit Impersonation** to return to your SuperAdmin dashboard.

**Rules:**
- Never use impersonation without a clear technical reason.
- All actions performed during impersonation are logged as part of the audit trail.
- Do not perform sensitive actions unless explicitly requested by the tenant.

## 💳 Subscription Control
Manage plans and trials from the **Subscription** tab of any tenant.
- **Plan Upgrade:** Manually move a tenant to Basic, Premium, or Enterprise.
- **Extend Trial:** If a user needs more time to test, you can add days to their trial period.
- **History:** View the subscription history and changes for forensic billing analysis.

## ⚙️ Advanced Settings
From the **Settings** tab, you have granular control:
- **Feature Access:** Enable or disable specific modules (e.g., Inventory, Messaging) for specific tenants.
- **Usage Limits:** Set custom caps on items, users, or branches independent of plan defaults.
- **Manual Verification:** Manually verify email addresses if a tenant fails to receive the verification link.
- **Shop Deletion:** Permanently remove a tenant and all associated data. **Warning: This cannot be undone.**

## 📊 Analytics & Health
- **Overview Tab:** Quick summary of stats, current plan, and recent activity timeline.
- **Analytics Tab:** Deep dive into sales trends, revenue growth, and inventory turnover.
- **System Health:** Monitor system errors, storage usage, and API call frequency.

## 🛡️ Platform Insights
Stay informed about the global state of the platform:
- **Security Alerts:** Monitor failed logins and suspicious activities across all tenants.
- **Database Health:** View table sizes, growth trends, and fragmentation reports.
- **Resource Usage:** Monitor PHP settings, disk space, and server uptime.
- **Audit Logs:** Global stream of all administrative actions for transparency and compliance.

---

## 🆘 Critical Support
For platform-level issues (e.g., server down, database lag), use the **System Insights** dashboard to identify bottlenecks before they affect tenants.
