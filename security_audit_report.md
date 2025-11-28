# Security Audit Report

## 1. Executive Summary
A security audit was performed on the Phone Retailer Management System codebase. The application uses a PHP backend with a MySQL database and a React frontend. The authentication model is session-based. Several critical and medium-severity vulnerabilities were identified, primarily concerning credential management, error handling, and lack of rate limiting.

## 2. Answers to Specific Questions

### 1. Do these APIs have API keys?
**No.** The application uses **Session-based Authentication** (Cookies).
- It relies on PHP Sessions (`PHPSESSID` cookie).
- There is no evidence of API Key usage (e.g., `x-api-key` headers) in the internal API.
- This is standard for a first-party Single Page Application (SPA) but requires strict CSRF protection.

### 2. Vulnerabilities & Suggestions
(See Section 3 below for detailed breakdown)

### 3. Do the APIs have rate limiters?
**No.** There is no rate limiting implemented in the application code.
- **Risk**: The API is vulnerable to Brute Force attacks (on login) and Denial of Service (DoS) attacks.
- **Recommendation**: Implement a token bucket or sliding window rate limiter in middleware, or use a web server (Apache/Nginx) module or a firewall (Cloudflare) for rate limiting.

### 4. Overall Vulnerability Check
The application is functional but has significant security gaps for a production environment. The most critical issue is hardcoded database credentials.

---

## 3. Detailed Vulnerability Analysis

### 🔴 High Severity

#### 1. Hardcoded Database Credentials
**File**: `backend/config/database.php`
**Issue**: Production database username and password are hardcoded in the PHP file.
```php
$this->username = 'u464722139_salsabeel';
$this->password = 'Aa@store123';
```
**Risk**: If this file is leaked (e.g., via git or server misconfiguration), the entire database is compromised.
**Fix**: Use Environment Variables (`.env` file) or server environment variables.
**Action**:
1. Create a `.env` file (outside web root if possible).
2. Use `getenv()` or a library like `vlucas/phpdotenv` to load them.

#### 2. Verbose Error Messages (Information Disclosure)
**File**: `backend/api/customers.php` (and likely others)
**Issue**: API endpoints return raw exception messages to the client.
```php
echo json_encode(["message" => "Error fetching customers: " . $e->getMessage()]);
```
**Risk**: Database errors can reveal table structures, column names, or query logic (SQL Injection hints) to attackers.
**Fix**: Log the actual error server-side and return a generic error message to the user.
```php
error_log($e->getMessage()); // Log internal details
echo json_encode(["message" => "An internal error occurred."]); // Generic user message
```

### 🟠 Medium Severity

#### 3. Missing CSRF Protection
**Context**: Session-based auth is used without Anti-CSRF tokens.
**Issue**: While `SameSite` cookie attributes help, they are not a complete defense.
**Risk**: An attacker could trick a logged-in admin into performing actions (e.g., deleting users) by visiting a malicious site.
**Fix**: Implement a Double Submit Cookie pattern or use a synchronized token pattern.
1. Generate a CSRF token on login.
2. Send it in a custom header (e.g., `X-CSRF-Token`) for every mutating request (POST, PUT, DELETE).
3. Verify the token in middleware.

#### 4. Missing Rate Limiting
**Context**: No throttling on API calls.
**Risk**: Brute force attacks on `/login` or resource exhaustion.
**Fix**: Implement a simple rate limiter middleware using Redis or a database table to track request counts per IP.

### 🟡 Low Severity

#### 5. Secure Cookie Flags
**File**: `backend/middleware/auth.php`
**Issue**: `session.cookie_secure` is set to `0`.
```php
ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS
```
**Risk**: Cookies can be intercepted over non-HTTPS connections.
**Fix**: Ensure this is set to `1` in production.
```php
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
```

---

## 4. Immediate Action Plan

1.  **Sanitize Credentials**: Move DB credentials to a secure environment variable config immediately.
2.  **Generic Error Responses**: Update all `try-catch` blocks in API endpoints to hide raw error messages.
3.  **Enable HTTPS**: Ensure the production server forces HTTPS and update cookie settings.
4.  **Implement Rate Limiting**: Add a basic rate limiter for the `/login` endpoint at minimum.
