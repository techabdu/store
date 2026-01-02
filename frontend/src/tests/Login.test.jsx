import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Login from '../pages/shared/Login';
import { BrowserRouter } from 'react-router-dom';

// Mock context providers
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ThemeProvider } from '../context/ThemeContext';

// Mock ParticlesBackground to avoid canvas issues
vi.mock('../components/landing/ParticlesBackground', () => ({
  default: () => <div data-testid="particles-mock" />
}));

const MockProviders = ({ children }) => (
    <ThemeProvider>
        <NotificationProvider>
            <AuthProvider>
                <BrowserRouter>
                    {children}
                </BrowserRouter>
            </AuthProvider>
        </NotificationProvider>
    </ThemeProvider>
);

describe('Login Component', () => {
    it('renders login form with inputs', () => {
        render(
            <MockProviders>
                <Login />
            </MockProviders>
        );

        // Check for common elements
        expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
        // The password placeholder is dots, so we should look by type or test id, but let's try strict match or just id
        // Actually, the placeholder is "••••••••••••"
        // Let's use getByPlaceholderText("••••••••••••")
        expect(screen.getByPlaceholderText("••••••••••••")).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
});
