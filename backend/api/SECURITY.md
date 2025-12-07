# API Security Documentation

## Authentication
The API uses session-based authentication with secure cookies.
- **Cookies**: `HttpOnly`, `Secure` (in HTTPS), `SameSite=Strict`.
- **Session Timeout**: 48 hours inactivity, 7 days absolute.

## CSRF Protection
All state-changing requests (POST, PUT, DELETE, PATCH) must include a CSRF token.
1. Fetch token from `GET /api/auth/csrf-token.php`.
2. Include it in the `X-CSRF-Token` header.

## Rate Limiting
- **Login**: 5 failed attempts per 10 minutes per IP/Username.
- **Registration**: 5 attempts per hour per IP.
- **Password Reset**: 3 requests per 15 minutes per IP/Identifier.

## Input Validation
All inputs are sanitized and validated.
- **XSS Prevention**: Inputs are escaped using `htmlspecialchars`.
- **SQL Injection**: Prepared statements are enforced globally.
- **Type Checking**: Strict validation for emails, numbers, etc.

## Headers
The following security headers are enforced:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-Request-ID`: Included in all responses for tracing.

## Error Handling
API errors are returned as JSON with generic messages to prevent information leakage.
Internal errors are logged server-side.
