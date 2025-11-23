---
trigger: always_on
---

## CRITICAL RULES - NEVER VIOLATE

These rules are **ABSOLUTE** and must be followed without exception:

### Rule 1: Security is Non-Negotiable
- ❌ **NEVER** store passwords in plain text
- ❌ **NEVER** use direct SQL queries without prepared statements
- ❌ **NEVER** trust user input without validation
- ❌ **NEVER** expose sensitive information in error messages
- ❌ **NEVER** hardcode credentials or API keys in code
- ✅ **ALWAYS** use `password_hash()` and `password_verify()` for passwords
- ✅ **ALWAYS** use prepared statements with parameter binding
- ✅ **ALWAYS** validate and sanitize all user inputs
- ✅ **ALWAYS** use proper session security settings

### Rule 2: Follow the Plan Exactly
- ❌ **NEVER** skip stages or combine stages without explicit approval
- ❌ **NEVER** implement features not mentioned in the requirements
- ❌ **NEVER** make assumptions about ambiguous requirements
- ✅ **ALWAYS** complete stages sequentially (Stage 1 → Stage 2 → ... → Stage 10)
- ✅ **ALWAYS** ask for clarification when requirements are unclear
- ✅ **ALWAYS** confirm understanding before starting implementation
- ✅ **ALWAYS** complete all tasks in a stage before moving to the next

### Rule 3: Code Quality is Mandatory
- ❌ **NEVER** write placeholder code or TODO comments
- ❌ **NEVER** leave debugging code (console.log, var_dump) in production files
- ❌ **NEVER** use vague or unclear variable/function names
- ❌ **NEVER** write undocumented complex logic
- ✅ **ALWAYS** write production-ready, complete code
- ✅ **ALWAYS** add explanatory comments for functions and complex logic
- ✅ **ALWAYS** use meaningful, descriptive names
- ✅ **ALWAYS** handle errors gracefully

### Rule 4: Testing is Required
- ❌ **NEVER** mark a stage complete without testing
- ❌ **NEVER** commit untested code
- ❌ **NEVER** ignore test failures
- ❌ **NEVER** skip items in the testing checklist
- ✅ **ALWAYS** complete all testing checklist items for each stage
- ✅ **ALWAYS** verify code works before committing
- ✅ **ALWAYS** test edge cases and error scenarios
- ✅ **ALWAYS** check for console errors and PHP warnings

### Rule 5: Version Control Discipline
- ❌ **NEVER** commit without a clear, descriptive message
- ❌ **NEVER** combine multiple unrelated changes in one commit
- ❌ **NEVER** forget to push after committing
- ❌ **NEVER** commit broken or incomplete code
- ✅ **ALWAYS** commit after completing each stage
- ✅ **ALWAYS** use the exact commit message format specified in authplanning.md
- ✅ **ALWAYS** push to GitHub after each commit
- ✅ **ALWAYS** ensure code is working before committing

---

## CODING RULES

### Database Rules

#### Rule 6: MySQL Query Security
- ✅ **ALWAYS** use prepared statements with mysqli
- ✅ **ALWAYS** bind parameters using `bind_param()`
- ✅ **ALWAYS** use placeholders (?) in SQL queries
- ❌ **NEVER** concatenate user input into SQL strings
- ❌ **NEVER** use `mysql_*` functions (deprecated)

**Example of CORRECT approach:**
```php
$stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
```

**Example of WRONG approach:**
```php
$query = "SELECT * FROM users WHERE username = '$username'"; // NEVER DO THIS
```

#### Rule 7: Database Schema
- ✅ **ALWAYS** use utf8mb4 charset for full Unicode support
- ✅ **ALWAYS** create indexes on frequently queried columns
- ✅ **ALWAYS** use foreign keys with appropriate CASCADE rules
- ✅ **ALWAYS** use ENUM for fixed value fields (role, status)
- ✅ **ALWAYS** add created_at and updated_at timestamps
- ❌ **NEVER** use VARCHAR for large text (use TEXT instead)
- ❌ **NEVER** forget to define primary keys

#### Rule 8: Database Connections
- ✅ **ALWAYS** check connection success before executing queries
- ✅ **ALWAYS** close prepared statements after use
- ✅ **ALWAYS** return JSON error if connection fails
- ❌ **NEVER** expose database credentials in error messages
- ❌ **NEVER** use root user without password in production

### PHP Backend Rules

#### Rule 9: API Endpoint Structure
- ✅ **ALWAYS** set proper HTTP status codes (200, 401, 403, 404, 500)
- ✅ **ALWAYS** return consistent JSON format: `{success: bool, ...}`
- ✅ **ALWAYS** set Content-Type header to application/json
- ✅ **ALWAYS** set CORS headers for frontend origin
- ✅ **ALWAYS** validate HTTP method (POST, GET, etc.)
- ❌ **NEVER** return HTML from API endpoints
- ❌ **NEVER** expose stack traces or detailed errors to frontend

**Example of CORRECT response:**
```php
http_response_code(200);
echo json_encode([
    'success' => true,
    'user' => ['id' => 1, 'username' => 'john']
]);
```

#### Rule 10: Session Management
- ✅ **ALWAYS** configure session timeout (172800 seconds for 48 hours)
- ✅ **ALWAYS** regenerate session ID on login (`session_regenerate_id(true)`)
- ✅ **ALWAYS** set HTTPOnly and Secure cookie flags
- ✅ **ALWAYS** update last_activity timestamp
- ✅ **ALWAYS** destroy session completely on logout
- ❌ **NEVER** store sensitive data in sessions
- ❌ **NEVER** use predictable session IDs

#### Rule 11: Input Validation
- ✅ **ALWAYS** validate input exists and is not empty
- ✅ **ALWAYS** trim whitespace from user input
- ✅ **ALWAYS** check data types match expectations
- ✅ **ALWAYS** validate on both frontend AND backend
- ❌ **NEVER** trust frontend validation alone
- ❌ **NEVER** skip validation even for "trusted" inputs

#### Rule 12: Password Handling
- ✅ **ALWAYS** use `password_hash($password, PASSWORD_BCRYPT)`
- ✅ **ALWAYS** use `password_verify($input, $hash)` for checking
- ✅ **ALWAYS** store only the hash, never the plain password
- ❌ **NEVER** use MD5 or SHA1 for passwords
- ❌ **NEVER** decrypt passwords (they should be one-way hashed)
- ❌ **NEVER** log or display password hashes

#### Rule 13: Error Handling
- ✅ **ALWAYS** use try-catch for operations that might fail
- ✅ **ALWAYS** log errors to PHP error log
- ✅ **ALWAYS** return user-friendly error messages
- ✅ **ALWAYS** use appropriate HTTP status codes
- ❌ **NEVER** expose internal error details to users
- ❌ **NEVER** ignore errors or suppress warnings

### React Frontend Rules

#### Rule 14: Component Structure
- ✅ **ALWAYS** use functional components with hooks
- ✅ **ALWAYS** use PascalCase for component names
- ✅ **ALWAYS** destructure props for clarity
- ✅ **ALWAYS** add PropTypes or TypeScript types (if used)
- ❌ **NEVER** use class components
- ❌ **NEVER** create components with side effects at render time

#### Rule 15: State Management
- ✅ **ALWAYS** use Context API for global auth state
- ✅ **ALWAYS** use useState for component-local state
- ✅ **ALWAYS** use useEffect for side effects
- ✅ **ALWAYS** clean up effects (return cleanup function)
- ❌ **NEVER** mutate state directly
- ❌ **NEVER** use global variables for state
- ❌ **NEVER** pass down props through more than 3 levels (use Context)

#### Rule 16: API Calls
- ✅ **ALWAYS** use the configured axios instance from utils/api.js
- ✅ **ALWAYS** set `withCredentials: true` for cookie-based auth
- ✅ **ALWAYS** handle loading states
- ✅ **ALWAYS** handle errors gracefully
- ✅ **ALWAYS** use async/await or .then/.catch
- ❌ **NEVER** make API calls without error handling
- ❌ **NEVER** ignore network errors

#### Rule 17: Routing
- ✅ **ALWAYS** use React Router v6 syntax
- ✅ **ALWAYS** protect routes with ProtectedRoute component
- ✅ **ALWAYS** use `<Navigate replace />` for redirects
- ✅ **ALWAYS** show loading state during auth check
- ❌ **NEVER** use window.location for navigation
- ❌ **NEVER** create unprotected routes for sensitive pages

#### Rule 18: Forms
- ✅ **ALWAYS** prevent default form submission
- ✅ **ALWAYS** validate input before submission
- ✅ **ALWAYS** disable inputs during loading
- ✅ **ALWAYS** show clear error messages
- ✅ **ALWAYS** use autoComplete attributes for accessibility
- ❌ **NEVER** submit forms without validation
- ❌ **NEVER** show generic "Error occurred" without details

### Code Style Rules

#### Rule 19: Naming Conventions
- ✅ **PHP Functions**: `snake_case` or `camelCase` (be consistent)
- ✅ **PHP Variables**: `$camelCase` or `$snake_case` (be consistent)
- ✅ **JavaScript Functions**: `camelCase`
- ✅ **JavaScript Variables**: `camelCase`
- ✅ **React Components**: `PascalCase`
- ✅ **Constants**: `UPPER_SNAKE_CASE`
- ✅ **SQL Tables**: `snake_case` (plural, e.g., users, activity_logs)
- ✅ **SQL Columns**: `snake_case`
- ❌ **NEVER** use single-letter variables except for loops (i, j, k)
- ❌ **NEVER** abbreviate names cryptically (use `user` not `usr`)

#### Rule 20: Comments and Documentation
- ✅ **ALWAYS** add function-level comments explaining purpose, parameters, and return values
- ✅ **ALWAYS** add inline comments for complex logic
- ✅ **ALWAYS** explain WHY, not just WHAT the code does
- ✅ **ALWAYS** update comments when code changes
- ❌ **NEVER** leave commented-out code in production
- ❌ **NEVER** write obvious comments (e.g., "// increment i" for `i++`)

**Example of GOOD comments:**
```php
/**
 * Verify user has valid session and required role
 * 
 * @param array $allowedRoles Array of role strings (e.g., ['admin', 'superadmin'])
 * @return void Returns 403 JSON and exits if unauthorized
 */
function checkRole($allowedRoles) {
    // Check if user's role matches any allowed roles
    // This prevents privilege escalation attacks
    if (!in_array($_SESSION['role'], $allowedRoles)) {
        // Return 403 because user is authenticated but lacks permission
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden']);
        exit;
    }
}
```

#### Rule 21: Code Formatting
- ✅ **PHP**: 4 spaces indentation (or 2 if that's project standard)
- ✅ **JavaScript**: 2 spaces indentation
- ✅ **SQL**: Uppercase keywords, lowercase table/column names
- ✅ **Always** use consistent brace placement
- ✅ **Always** add blank lines between logical blocks
- ❌ **NEVER** mix tabs and spaces
- ❌ **NEVER** exceed 120 characters per line (wrap long lines)

#### Rule 22: File Organization
- ✅ **ALWAYS** place files in correct directories per project structure
- ✅ **ALWAYS** use .jsx extension for React components
- ✅ **ALWAYS** use .php extension for PHP files
- ✅ **ALWAYS** use .sql extension for SQL scripts
- ✅ **ALWAYS** start PHP files with `<?php` (never short tags)
- ❌ **NEVER** mix frontend and backend code in same file
- ❌ **NEVER** create files in wrong directories

### Testing Rules

#### Rule 23: Testing Requirements
- ✅ **ALWAYS** complete entire testing checklist before marking stage complete
- ✅ **ALWAYS** test both success and failure scenarios
- ✅ **ALWAYS** test edge cases (empty inputs, special characters, etc.)
- ✅ **ALWAYS** verify no console errors or PHP warnings
- ✅ **ALWAYS** test with different user roles
- ❌ **NEVER** skip testing because "it should work"
- ❌ **NEVER** mark stage complete with known bugs

#### Rule 24: Manual Testing Process
- ✅ **ALWAYS** test in browser (Chrome DevTools)
- ✅ **ALWAYS** check Network tab for API calls
- ✅ **ALWAYS** check Console for JavaScript errors
- ✅ **ALWAYS** verify database changes directly
- ✅ **ALWAYS** test session persistence (refresh page)
- ❌ **NEVER** assume code works without testing
- ❌ **NEVER** test only happy path (test errors too)

### Git and Version Control Rules

#### Rule 25: Commit Guidelines
- ✅ **ALWAYS** use format: `"Stage X: Brief description"`
- ✅ **ALWAYS** commit after completing each stage
- ✅ **ALWAYS** ensure code is tested and working before commit
- ✅ **ALWAYS** include only related changes in one commit
- ❌ **NEVER** commit multiple stages in one commit
- ❌ **NEVER** commit broken code
- ❌ **NEVER** use vague commit messages like "fix" or "update"

#### Rule 26: Push Discipline
- ✅ **ALWAYS** push to GitHub after each commit
- ✅ **ALWAYS** verify push was successful
- ✅ **ALWAYS** push from correct branch
- ❌ **NEVER** forget to 