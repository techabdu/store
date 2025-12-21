# GitHub Secrets Setup Guide

Your GitHub Actions workflow now automatically creates the production `.env` file during deployment. You need to add the following secrets to your GitHub repository.

## Required Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

### Database Credentials (Production - Hostinger)
1. **`DB_HOST`**
   - Value: `localhost`

2. **`DB_USER`**
   - Value: `your_production_db_user`

3. **`DB_PASS`**
   - Value: `your_production_db_password`

4. **`DB_NAME`**
   - Value: `your_production_db_name`

### SMTP Credentials (Email Functionality)
5. **`SMTP_HOST`**
   - Value: Your SMTP server (e.g., `smtp.gmail.com`)

6. **`SMTP_USERNAME`**
   - Value: Your email address

7. **`SMTP_PASSWORD`**
   - Value: Your email password or app-specific password

8. **`SMTP_PORT`**
   - Value: `587` (for TLS) or `465` (for SSL)

9. **`SMTP_FROM_EMAIL`**
   - Value: Your sender email address

10. **`SMTP_FROM_NAME`**
    - Value: Your application name (e.g., "Phone Store")

### Kora API Credentials (Identity Verification)
11. **`KORA_SECRET_KEY`**
    - Value: Your Kora Secret Key (Live or Test)

12. **`KORA_PUBLIC_KEY`**
    - Value: Your Kora Public Key

13. **`KORA_API_URL`**
    - Value: `https://api.korapay.com/merchant/api/v1`

14. **`KORA_ENVIRONMENT`**
    - Value: `live` or `test`

### FTP Credentials (Hostinger Deployment)
15. **`FTP_HOST`**
    - Value: Your Hostinger FTP hostname (e.g., `ftp.yoursite.com` or IP address)
    - Find in: Hostinger → Files → FTP Accounts

12. **`FTP_USERNAME`**
    - Value: Your FTP username
    - Find in: Hostinger → Files → FTP Accounts

13. **`FTP_PASSWORD`**
    - Value: Your FTP password
    - Find in: Hostinger → Files → FTP Accounts

## How to Find FTP Credentials in Hostinger

1. Log in to your Hostinger control panel (hPanel)
2. Go to **Files** → **FTP Accounts**
3. You'll see your FTP credentials:
   - **Hostname**: This is your `FTP_HOST` (e.g., `ftp.yoursite.com`)
   - **Username**: This is your `FTP_USERNAME`
   - **Password**: Click "Change Password" if you need to reset it
   - **Port**: Should be `21` (already configured in workflow)

## Important Notes

### FTP vs FTPS
- The workflow is configured to use standard **FTP** (port 21)
- If your Hostinger account requires secure FTP, the workflow will automatically handle it
- No additional configuration needed

### Server Directory
- Frontend deploys to root: `./`
- Backend deploys to: `./backend/`
- These paths are relative to your FTP account's home directory

## How It Works

1. **Local Development**: Uses `backend/.env` file (gitignored, not pushed to GitHub)
2. **Production**: GitHub Actions creates `backend/.env` from secrets during deployment
3. **Security**: Production credentials never appear in your code or git history
4. **Deployment**: Uses FTP for file transfer to Hostinger

## Verification

After setting up the secrets and pushing to GitHub:
1. Check the Actions tab in your repository
2. The workflow should complete successfully
3. Your production site should connect to the database correctly

## Troubleshooting

### If deployment fails with timeout:
1. Verify `FTP_HOST` is correct (check Hostinger FTP Accounts)
2. Verify `FTP_USERNAME` and `FTP_PASSWORD` are correct
3. Check if your Hostinger account has FTP enabled
4. See `DEPLOYMENT_FIX.md` for detailed troubleshooting

### Common FTP Host Formats:
- `ftp.yoursite.com`
- `yoursite.com`
- IP address (e.g., `123.45.67.89`)

---

**Note**: The local `.env` file is already set up for your XAMPP development environment and is excluded from git commits.


