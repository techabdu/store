# GitHub Secrets Required for Deployment

This document lists all GitHub secrets that must be configured for the CI/CD pipeline to work correctly.

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

---

## Required Secrets

### FTP Deployment
- **`FTP_HOST`** - Hostinger FTP server (e.g., `ftp.prhub.shop`)
- **`FTP_USERNAME`** - FTP username
- **`FTP_PASSWORD`** - FTP password

### SSH Access (for migrations and service management)
- **`SSH_HOST`** - Production server hostname or IP
- **`SSH_USERNAME`** - SSH username (e.g., `u123456789`)
- **`SSH_PRIVATE_KEY`** - SSH private key content (entire key including `-----BEGIN` and `-----END` lines)
- **`SSH_PORT`** - SSH port (usually `22`)

### Database
- **`DB_HOST`** - Database host (usually `localhost` on shared hosting)
- **`DB_NAME`** - Database name (e.g., `store`)
- **`DB_USER`** - Database username
- **`DB_PASS`** - Database password

### Email (SMTP)
- **`SMTP_HOST`** - SMTP server (e.g., `smtp.hostinger.com`)
- **`SMTP_PORT`** - SMTP port (e.g., `465` for SSL)
- **`SMTP_USERNAME`** - Email username
- **`SMTP_PASSWORD`** - Email password
- **`SMTP_FROM_EMAIL`** - From email address (e.g., `noreply@prhub.shop`)
- **`SMTP_FROM_NAME`** - From name (e.g., `PR Hub`)

### Payment Gateway (Kora)
- **`KORA_SECRET_KEY`** - Kora secret key (starts with `sk_live_`)
- **`KORA_PUBLIC_KEY`** - Kora public key (starts with `pk_live_`)
- **`KORA_API_URL`** - Kora API URL (e.g., `https://api.korapay.com/merchant/api/v1`)
- **`KORA_ENVIRONMENT`** - Environment (`production`)

### Application
- **`APP_URL`** - Backend URL (e.g., `https://prhub.shop`)
- **`FRONTEND_URL`** - Frontend URL (e.g., `https://prhub.shop`)
- **`ENCRYPTION_KEY`** - 32-character random encryption key

---

## Verification Checklist

Before deploying, verify all secrets are set:

```bash
# You can't view secret values, but you can verify they exist in GitHub UI
# Go to Settings → Secrets → Actions and check all secrets listed above are present
```

Total secrets required: **22**
