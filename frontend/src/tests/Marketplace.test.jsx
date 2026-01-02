import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MarketplaceDashboard from '../pages/marketplace/MarketplaceDashboard';
import { BrowserRouter } from 'react-router-dom';
import { NotificationProvider } from '../context/NotificationContext';
import { ThemeProvider } from '../context/ThemeContext';

// Mock AuthContext
const mockUser = {
    id: 1,
    username: 'testuser',
    role: 'admin',
    shop_id: 1
};

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
    }),
    AuthProvider: ({ children }) => <div>{children}</div>
}));

// Mock API calls
vi.mock('../../utils/api', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({
            data: {
                success: true,
                stats: {
                    active_listings: 10,
                    total_views: 100,
                    total_sales: 5,
                    total_revenue: 50000
                },
                recent_listings: [],
                recent_orders: []
            }
        })),
        post: vi.fn(),
    }
}));

const MockProviders = ({ children }) => (
    <ThemeProvider>
        <NotificationProvider>
            <BrowserRouter>
                {children}
            </BrowserRouter>
        </NotificationProvider>
    </ThemeProvider>
);

describe('MarketplaceDashboard Component', () => {
    it('renders marketplace dashboard', async () => {
        render(
            <MockProviders>
                <MarketplaceDashboard />
            </MockProviders>
        );

        // Check for dashboard elements
        // The component likely has "Marketplace Overview" or similar header
        // Or check for "Active Listings" stat card
        // Let's check for "Active Listings" text which usually appears in stats
        expect(await screen.findByText(/Active Listings/i)).toBeInTheDocument();
    });
});
