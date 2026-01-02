import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Register from '../pages/shared/Register';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ThemeProvider } from '../context/ThemeContext';

// Mock ParticlesBackground
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

describe('Register Component', () => {
    it('renders plan selection first, then registration form', () => {
        render(
            <MockProviders>
                <Register />
            </MockProviders>
        );

        // Step 1: Plan Selection
        expect(screen.getByText(/Choose Your Plan/i)).toBeInTheDocument();
        const starterPlan = screen.getByText(/Starter/i).closest('.plan-card');
        expect(starterPlan).toBeInTheDocument();

        // Select Plan
        fireEvent.click(starterPlan);

        // Find Continue button (it should be enabled now)
        const continueBtn = screen.getByRole('button', { name: /Continue with Starter/i });
        fireEvent.click(continueBtn);

        // Step 2: Owner Info
        expect(screen.getByPlaceholderText(/Choose a username/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/your@email.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Create a strong password/i)).toBeInTheDocument();
    });
});
