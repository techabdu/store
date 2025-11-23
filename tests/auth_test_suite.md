# Authentication System - Manual Test Suite

## 1. Login Functionality
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Valid Login (SuperAdmin)** | 1. Go to `/login`<br>2. Enter `it support` / `superadmin123`<br>3. Click "Sign In" | Redirect to `/superadmin/dashboard` | [ ] |
| **Invalid Password** | 1. Go to `/login`<br>2. Enter `it support` / `wrongpass`<br>3. Click "Sign In" | Show error "Invalid username or password" | [ ] |
| **Invalid Username** | 1. Go to `/login`<br>2. Enter `wronguser` / `anypass`<br>3. Click "Sign In" | Show error "Invalid username or password" | [ ] |
| **Empty Fields** | 1. Go to `/login`<br>2. Leave fields empty<br>3. Click "Sign In" | Show error "Please enter both username and password" | [ ] |

## 2. Session Management
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Session Persistence** | 1. Login successfully<br>2. Refresh the page | Stay on Dashboard (do not redirect to login) | [ ] |
| **Logout** | 1. Login successfully<br>2. Click "Logout" button | Redirect to `/login` | [ ] |
| **Access after Logout** | 1. Logout<br>2. Try to access `/superadmin/dashboard` | Redirect to `/login` | [ ] |

## 3. Role-Based Access Control (RBAC)
*Note: Requires creating users with 'admin' and 'user' roles in database.*

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **SuperAdmin Access** | 1. Login as SuperAdmin<br>2. Access `/superadmin/dashboard` | Access Granted | [ ] |
| **SuperAdmin vs Admin Page** | 1. Login as SuperAdmin<br>2. Access `/admin/dashboard` | Redirect to `/access-denied` | [ ] |
| **Admin Access** | 1. Login as Admin<br>2. Access `/admin/dashboard` | Access Granted | [ ] |
| **Admin vs SuperAdmin Page** | 1. Login as Admin<br>2. Access `/superadmin/dashboard` | Redirect to `/access-denied` | [ ] |
| **User Access** | 1. Login as User<br>2. Access `/user/dashboard` | Access Granted | [ ] |

## 4. Security Checks
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Direct URL Access** | 1. Ensure logged out<br>2. Paste `/superadmin/dashboard` in URL bar | Redirect to `/login` | [ ] |
| **SQL Injection (Basic)** | 1. Enter `' OR '1'='1` as username | Login failed (handled by prepared statements) | [ ] |
