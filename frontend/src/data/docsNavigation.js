export const docsNavigation = [
    {
        title: 'Home',
        path: '/intro',
        file: 'introduction.md'
    },
    {
        title: 'Getting Started',
        path: '/getting-started',
        file: 'getting-started.md'
    },
    {
        title: 'User Guide',
        children: [
            { title: 'POS System', path: '/user/pos', file: 'user/pos.md' },
            { title: 'Inventory', path: '/user/inventory', file: 'user/inventory.md' },
            { title: 'Sales History', path: '/user/sales-history', file: 'user/sales-history.md' },
            { title: 'Expenses', path: '/user/expenses', file: 'user/expenses.md' },
            { title: 'Profile', path: '/user/profile', file: 'user/profile.md' }
        ]
    },
    {
        title: 'Admin Guide',
        children: [
            { title: 'Inventory Management', path: '/admin/inventory', file: 'admin/inventory.md' },
            { title: 'Sales Reports', path: '/admin/sales-reports', file: 'admin/sales-reports.md' },
            { title: 'Financial Reports', path: '/admin/financial-reports', file: 'admin/financial-reports.md' },
            { title: 'Expenses', path: '/admin/expenses', file: 'admin/expenses.md' },
            { title: 'Customers', path: '/admin/customers', file: 'admin/customers.md' },
            { title: 'User Management', path: '/admin/users', file: 'admin/users.md' },
            { title: 'Settings', path: '/admin/settings', file: 'admin/settings.md' }
        ]
    }
];
