# GitHub Secrets Setup Guide

Your GitHub Actions workflow now automatically creates the production `.env` file during deployment. You need to add the following secrets to your GitHub repository.

## Required Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

### Database Credentials (Production - Hostinger)
1. **`DB_HOST`**
   - Value: `localhost`

2. **`DB_USER`**
   - Value: `u464722139_salsabeel`

3. **`DB_PASS`**
   - Value: `Aa@store123`

4. **`DB_NAME`**
   - Value: `u464722139_store`

### FTP Credentials (Already Set)
These should already be configured:
- `FTP_HOST`
- `FTP_USERNAME`
- `FTP_PASSWORD`

## How It Works

1. **Local Development**: Uses `backend/.env` file (gitignored, not pushed to GitHub)
2. **Production**: GitHub Actions creates `backend/.env` from secrets during deployment
3. **Security**: Production credentials never appear in your code or git history

## Verification

After setting up the secrets and pushing to GitHub:
1. Check the Actions tab in your repository
2. The workflow should complete successfully
3. Your production site should connect to the database correctly

---

**Note**: The local `.env` file is already set up for your XAMPP development environment and is excluded from git commits.
