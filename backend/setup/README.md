# Secure Setup Guide

This directory contains scripts for securely setting up the initial application state.

## Superadmin Creation

The `create_superadmin.php` script is used to generate the initial SuperAdmin account with improved security compared to hardcoding credentials.

### Usage

1. **Run via Command Line (Recommended):**
   Open your terminal, navigate to this directory, and run:
   ```bash
   php create_superadmin.php
   ```

2. **Run via Browser (Not Recommended):**
   If you must run it via browser, ensure the file is deleted immediately after use.

### Security Notes

- The script generates a random, strong password.
- It will NOT overwrite an existing superadmin account.
- **Copy the credentials immediately** as they are shown only once.
- **Delete this script** (`backend/setup/create_superadmin.php`) after you have successfully created your admin account to prevent any potential misuse.
