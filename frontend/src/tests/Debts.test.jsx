import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Debts from '../pages/shared/Debts';
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

// Mock API calls to avoid Network Error
vi.mock('../../utils/api', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: { success: true, settings: {}, debts: [], summary: { total_outstanding: '0.00' } } })),
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

describe('Debts Component', () => {
    it('renders debt management page', async () => {
        render(
            <MockProviders>
                <Debts />
            </MockProviders>
        );

        expect(await screen.findByText(/Debt Management/i)).toBeInTheDocument();
        expect(screen.getByText(/Log Manual Debt/i)).toBeInTheDocument();
    });
});
