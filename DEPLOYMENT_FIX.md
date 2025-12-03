# FTP Deployment Timeout Fix

## Problem
GitHub Actions deployment failing with:
```
Error: Timeout (control socket)
```

## Root Cause
The FTP connection was timing out due to missing protocol and port configuration.

## Solution Applied ✅

Added explicit FTP configuration to the deployment workflow:
- ✅ **Protocol**: Set to `ftp` (standard FTP)
- ✅ **Port**: Set to `21` (default FTP port)
- ✅ **Timeout**: Increased to 300000ms (5 minutes)
- ✅ **Log Level**: Set to `verbose` for better debugging

## What Changed

### Before:
```yaml
- uses: SamKirkland/FTP-Deploy-Action@v4.3.5
  with:
    server: ${{ secrets.FTP_HOST }}
    username: ${{ secrets.FTP_USERNAME }}
    password: ${{ secrets.FTP_PASSWORD }}
    local-dir: ./frontend/dist/
    server-dir: ./
```

### After:
```yaml
- uses: SamKirkland/FTP-Deploy-Action@v4.3.5
  with:
    server: ${{ secrets.FTP_HOST }}
    username: ${{ secrets.FTP_USERNAME }}
    password: ${{ secrets.FTP_PASSWORD }}
    protocol: ftp          # ← Added
    port: 21               # ← Added
    timeout: 300000        # ← Added (5 minutes)
    log-level: verbose     # ← Added for debugging
    local-dir: ./frontend/dist/
    server-dir: ./
```

## Next Steps

### 1. Verify Your GitHub Secrets

Make sure these secrets are correctly set in GitHub:

**Go to**: GitHub Repository → Settings → Secrets and variables → Actions

| Secret Name | Example Value | Where to Find |
|------------|---------------|---------------|
| `FTP_HOST` | `ftp.yoursite.com` or `123.45.67.89` | Hostinger → Files → FTP Accounts |
| `FTP_USERNAME` | `u123456789` or `yoursite.com` | Hostinger → Files → FTP Accounts |
| `FTP_PASSWORD` | Your FTP password | Hostinger → Files → FTP Accounts |

### 2. How to Find FTP Credentials in Hostinger

1. Log in to **Hostinger hPanel**
2. Go to **Files** → **FTP Accounts**
3. You'll see:
   - **Hostname**: This is your `FTP_HOST`
   - **Username**: This is your `FTP_USERNAME`
   - **Port**: Should be `21` (we've set this in the workflow)
   - **Password**: Click "Change Password" if you forgot it

### 3. Test the Deployment

Commit and push these changes:

```bash
git add .
git commit -m "Fix: Add explicit FTP protocol and port configuration"
git push origin main
```

Then:
1. Go to GitHub → **Actions** tab
2. Watch the deployment workflow
3. The verbose logging will show detailed connection information

## If It Still Fails

### Try FTPS (Secure FTP)

If standard FTP doesn't work, Hostinger might require FTPS. Change the protocol:

```yaml
protocol: ftps  # Instead of ftp
port: 21        # FTPS typically uses port 21
```

### Check Hostinger FTP Settings

1. In Hostinger, go to **Files** → **FTP Accounts**
2. Check if there's any mention of:
   - **SSL/TLS** - If yes, use `protocol: ftps`
   - **Passive Mode** - Should work automatically
   - **IP Restrictions** - Make sure GitHub IPs aren't blocked

### Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" | Wrong hostname or port |
| "Authentication failed" | Wrong username/password |
| "Timeout" | Firewall blocking, wrong protocol |
| "Permission denied" | Wrong server directory path |

### Alternative: Check Server Directory

The `server-dir` might need adjustment:
- Try `./public_html/` instead of `./`
- Or `/public_html/` with absolute path
- Or `/domains/yoursite.com/public_html/`

Check your Hostinger file manager to see the exact directory structure.

## Debugging Tips

### View Detailed Logs
The workflow now has `log-level: verbose` which will show:
- Connection attempts
- Authentication steps
- File transfer progress
- Any errors with more context

### Test FTP Locally
You can test your FTP credentials locally:

```bash
# Using FTP command line
ftp ftp.yoursite.com
# Enter username and password when prompted

# Or using curl
curl -v ftp://ftp.yoursite.com --user username:password
```

## Protocol Options

If `protocol: ftp` doesn't work, try these in order:

1. **`ftps`** - FTP over SSL/TLS (most secure, port 21)
2. **`ftps-legacy`** - Legacy FTPS (port 990)
3. **`ftp`** - Standard FTP (port 21, less secure)

## Summary

✅ **Fixed**: Added explicit FTP configuration  
✅ **Timeout**: Increased to 5 minutes  
✅ **Logging**: Enabled verbose mode  
🔄 **Next**: Push changes and monitor deployment

---

**Status**: Configuration updated, ready to test  
**Action Required**: Verify GitHub secrets and push to trigger deployment
