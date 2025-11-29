# Phase 2: Backend Authentication & API Updates - TEST INSTRUCTIONS

## ✅ What's New in Phase 2

I've updated the entire backend to support multi-tenancy. Here's what changed:

1. **Authentication**: Login now checks tenant status (active/trial/suspended)
2. **Registration**: New endpoint to register shop owners
3. **API Filtering**: All APIs now filter data by `tenant_id`
   - Users, Inventory, Transactions, Expenses, Customers, Shop Settings

## 🧪 How to Test

Since we haven't built the frontend registration page yet (Phase 6), you'll need to test the backend using **Postman** or **curl**, or by checking your existing application.

### Test 1: Verify Existing Application (Regression Test)
1. Open your application: http://localhost:5173
2. Login with your existing admin account
3. Navigate to:
   - **Dashboard**: Check if data loads
   - **Inventory**: Check if your items are visible
   - **Sales**: Check if transactions load
   - **Settings**: Check if shop settings load
4. **Expected Result**: Everything should work EXACTLY as before. You are now "Tenant 1".

### Test 2: Test Registration Endpoint (New Feature)
You can test the new registration API using `curl` in your terminal:

```bash
curl -X POST http://localhost/store/backend/api/auth/register.php \
-H "Content-Type: application/json" \
-d '{
    "shop_name": "Test Shop 2",
    "owner_username": "shop2admin",
    "owner_email": "admin@shop2.com",
    "password": "password123",
    "shop_phone": "555-0102",
    "shop_address": "456 Market St"
}'
```

**Expected Result**:
```json
{
    "success": true,
    "message": "Shop registered successfully! You can now login.",
    "shop_name": "Test Shop 2",
    "trial_ends_at": "2025-12-24 23:00:00"
}
```

### Test 3: Verify Data Isolation (Database Check)
After registering "Test Shop 2", check the database:

1. **Check Tenants**:
   ```sql
   SELECT * FROM tenants;
   ```
   *Should see 2 rows: "Main Shop" and "Test Shop 2"*

2. **Check Users**:
   ```sql
   SELECT id, username, tenant_id FROM users;
   ```
   *Should see your old admin (tenant_id=1) and "shop2admin" (tenant_id=2)*

### Test 4: Verify API Isolation
1. Login as your original admin
2. You should **NOT** see "Test Shop 2" data
3. You should **ONLY** see "Main Shop" data

## ⚠️ Important Notes

- **Email Verification**: I haven't implemented email verification yet (Phase 3).
- **Frontend**: You won't see a registration page yet (Phase 6).
- **SuperAdmin**: We haven't set up the SuperAdmin UI yet (Phase 8).

## Next Steps

If these tests pass, we are ready for **Phase 3: Email Configuration**.

1. Run the tests above
2. Let me know if everything works!
