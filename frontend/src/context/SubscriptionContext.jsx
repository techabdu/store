import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

export const SubscriptionContext = createContext(null);

/**
 * SubscriptionProvider
 * 
 * Global subscription state management for trial status and feature access control.
 * Provides subscription info to all components without blocking initial render.
 */
export const SubscriptionProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch subscription status
    const fetchSubscription = useCallback(async () => {
        if (!isAuthenticated || !user) {
            setSubscription(null);
            setIsLoading(false);
            return;
        }

        // SuperAdmin bypasses subscription checks
        if (user.role === 'superadmin') {
            setSubscription({
                plan: 'superadmin',
                display_name: 'SuperAdmin',
                is_trial_active: false,
                is_trial_expired: false,
                days_remaining: 0,
                limits: {
                    max_inventory_items: -1,
                    max_sales_history_display: -1,
                    max_users: -1,
                    restricted_pages: []
                }
            });
            setIsLoading(false);
            return;
        }

        try {
            const response = await api.get('/subscription/status.php');
            if (response.data.success) {
                setSubscription(response.data.subscription);
            } else {
                setError(response.data.error);
            }
        } catch (err) {
            console.error('Failed to fetch subscription:', err);
            setError('Unable to verify subscription status');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, user]);

    // Fetch on mount and when auth changes
    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    /**
     * Check if the trial has expired (only for basic plan)
     */
    const isTrialExpired = useCallback(() => {
        if (!subscription) return false;
        return subscription.is_trial_expired === true;
    }, [subscription]);

    /**
     * Check if the trial is currently active
     */
    const isTrialActive = useCallback(() => {
        if (!subscription) return false;
        return subscription.is_trial_active === true;
    }, [subscription]);

    /**
     * Get remaining trial days
     */
    const getTrialDaysRemaining = useCallback(() => {
        if (!subscription) return 0;
        return subscription.days_remaining || 0;
    }, [subscription]);

    /**
     * Check if user can access a specific page/feature
     * @param {string} pageName - Page identifier (e.g., 'budgeting', 'customers')
     */
    const canAccessPage = useCallback((pageName) => {
        if (!subscription) return true; // Allow access while loading

        // SuperAdmin can access everything
        if (subscription.plan === 'superadmin') return true;

        // Marketplace is temporarily restricted (Coming Soon)
        if (pageName === 'marketplace') {
            const allow = localStorage.getItem('allow_marketplace') === 'true';
            if (!allow) return false;
        }

        // If trial expired, block all access
        if (subscription.is_trial_expired) return false;

        const restrictedPages = subscription.limits?.restricted_pages || [];
        return !restrictedPages.includes(pageName);
    }, [subscription]);

    /**
     * Check if a page is restricted on the current plan (for UI display)
     * Returns true if the page shows a PRO badge (or Coming Soon)
     */
    const isPageRestricted = useCallback((pageName) => {
        if (!subscription) return false;

        // SuperAdmin has no restrictions
        if (subscription.plan === 'superadmin') return false;

        // Marketplace is temporarily restricted
        if (pageName === 'marketplace') {
            const allow = localStorage.getItem('allow_marketplace') === 'true';
            if (!allow) return true;
        }

        const restrictedPages = subscription.limits?.restricted_pages || [];
        return restrictedPages.includes(pageName);
    }, [subscription]);

    /**
     * Get the current plan name
     */
    const getPlanName = useCallback(() => {
        if (!subscription) return 'basic';
        return subscription.plan || 'basic';
    }, [subscription]);

    /**
     * Get plan limits
     */
    const getPlanLimits = useCallback(() => {
        if (!subscription) return null;
        return subscription.limits || null;
    }, [subscription]);

    /**
     * Refresh subscription data
     */
    const refreshSubscription = useCallback(() => {
        setIsLoading(true);
        return fetchSubscription();
    }, [fetchSubscription]);

    return (
        <SubscriptionContext.Provider
            value={{
                subscription,
                isLoading,
                error,
                // Status checks
                isTrialExpired,
                isTrialActive,
                getTrialDaysRemaining,
                // Access control
                canAccessPage,
                isPageRestricted,
                // Plan info
                getPlanName,
                getPlanLimits,
                // Actions
                refreshSubscription
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
};

/**
 * Hook to use subscription context
 */
export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};

export default SubscriptionContext;
