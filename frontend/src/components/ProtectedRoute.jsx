import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import SubscriptionExpiryOverlay from './SubscriptionExpiryOverlay';
import '../styles/protected.css';

/**
 * ProtectedRoute
 * 
 * Guards routes based on authentication, role, and subscription status.
 * Shows expiry overlay if trial has expired for non-superadmin users.
 * Redirects to access-denied if feature is restricted on current plan.
 * 
 * @param {ReactNode} children - The protected component to render
 * @param {string[]} allowedRoles - Roles that can access this route
 * @param {string} requiredFeature - Optional feature name for subscription check
 */
const ProtectedRoute = ({ children, allowedRoles = [], requiredFeature = null }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const {
        isTrialExpired,
        canAccessPage,
        isLoading: subscriptionLoading
    } = useSubscription();
    const location = useLocation();

    // Show loading while auth or subscription is being checked
    if (isLoading || subscriptionLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role-based access
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/access-denied" replace />;
    }

    // SuperAdmin bypasses all subscription checks
    if (user.role === 'superadmin') {
        return children;
    }

    // Check if trial has expired (show overlay instead of redirect)
    if (isTrialExpired()) {
        return <SubscriptionExpiryOverlay />;
    }

    // Check feature access if specified
    if (requiredFeature && !canAccessPage(requiredFeature)) {
        return <Navigate to="/access-denied" replace />;
    }

    return children;
};

export default ProtectedRoute;
