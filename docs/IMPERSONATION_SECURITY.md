# Impersonation Security & Audit Documentation

The Impersonation feature allows SuperAdmins to view the system from the perspective of a specific tenant user for troubleshooting purposes. Due to its sensitive nature, multiple security layers have been implemented.

## 🔒 Security Measures

### 1. Mandatory Audit Log
Every impersonation session requires a **Reason** to be provided before starting. This is logged to the `activity_logs` table with the following details:
- **Action**: `impersonation_start`
- **SuperAdmin ID**: The actual user performing the action.
- **Target User ID**: The user being impersonated.
- **Reason**: The technical justification provided.
- **Timestamp & IP Address**: For forensics.

### 2. Session Segregation
The SuperAdmin's original session is **NOT** destroyed. Instead:
- The `original_admin_id` is stored in the session.
- The `user_id` is switched to the target user.
- This allows for a "Restore Session" functionality without re-authenticating.

### 3. Privilege Barriers
- **No Circular Impersonation**: A user cannot impersonate another SuperAdmin.
- **Restricted Actions**: While impersonating, certain sensitive actions (like changing the user's password or email) should be restricted or require secondary confirmation (Business logic level).
- **Banner Awareness**: A persistent, high-visibility banner is displayed in the frontend whenever an impersonation is active, preventing accidental misuse.

### 4. Automatic Expiry
Impersonation sessions are tied to the standard 48-hour session timeout but are intended for short-term use. SuperAdmins are encouraged to `Exit Impersonation` immediately after troubleshooting.

## 📝 Audit Query
To audit impersonation history, use the following SQL:
```sql
SELECT 
    al.created_at, 
    u1.username as superadmin, 
    u2.username as target_user, 
    al.details as reason
FROM activity_logs al
JOIN users u1 ON al.user_id = u1.id
JOIN users u2 ON CAST(al.entity_id AS UNSIGNED) = u2.id
WHERE al.action = 'impersonation_start'
ORDER BY al.created_at DESC;
```
