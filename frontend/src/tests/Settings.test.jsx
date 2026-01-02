import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminSettings from '../pages/admin/AdminSettings';
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

// Mock API
vi.mock('../../utils/api', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({
            data: {
                success: true,
                settings: {
                    vip_min_spend: 5000000,
                    loyal_min_spend: 2000000
                },
                roles: [],
                branches: []
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

describe('AdminSettings Component', () => {
    it('renders settings page', async () => {
        render(
            <MockProviders>
                <AdminSettings />
            </MockProviders>
        );

        expect(screen.getByText(/Settings & Configuration/i)).toBeInTheDocument();
        expect(await screen.findByText(/Customer Segmentation/i)).toBeInTheDocument();
    });
});
