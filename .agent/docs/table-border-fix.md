# Table Border Alignment - Best Practice

## Issue
When table cells have multi-line content, borders applied to individual `<td>` elements break and don't align properly across the row. This creates a visual inconsistency where the border line appears fragmented.

## Root Cause
- Borders are applied to each `<td>` cell individually
- When cells have different heights (due to multi-line text), each cell's border renders at different vertical positions
- The `vertical-align: middle` property on cells causes content to center, making the border misalignment more visible

## Solution
Apply borders to the table row (`<tr>`) instead of individual cells, and use `vertical-align: top` for consistent alignment.

### ❌ INCORRECT Approach
```css
.table td {
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
}

.table tr:last-child td {
    border-bottom: none;
}
```

### ✅ CORRECT Approach
```css
.table th {
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: top;
}

.table td {
    padding: 16px;
    vertical-align: top;
}

.table tbody tr {
    border-bottom: 1px solid var(--border-color);
}

.table tbody tr:last-child {
    border-bottom: none;
}
```

## Key Changes
1. **Remove border from `<td>` cells**: Don't apply `border-bottom` to individual cells
2. **Add border to `<tr>` rows**: Apply `border-bottom` to `tbody tr` elements
3. **Use `vertical-align: top`**: Align content to the top of cells for consistency
4. **Target last row correctly**: Use `tbody tr:last-child` instead of `tr:last-child td`

## Benefits
- ✅ Borders remain continuous across the entire row
- ✅ Multi-line content doesn't break border alignment
- ✅ Cleaner, more professional appearance
- ✅ Consistent with modern table design patterns

## Files Updated (2025-11-25)
- `/frontend/src/components/ActivityTable.css`
- `/frontend/src/pages/admin/AdminUserManagement.css`
- `/frontend/src/pages/superadmin/UserManagement.css`

## Future Reference
**Always apply this pattern when creating new tables:**
1. Border on `<tr>`, not `<td>`
2. `vertical-align: top` on both `<th>` and `<td>`
3. Target `tbody tr:last-child` to remove the last border
