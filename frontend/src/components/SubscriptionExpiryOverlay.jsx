import { useNavigate } from 'react-router-dom';
import { Lock, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './SubscriptionExpiryOverlay.css';

/**
 * SubscriptionExpiryOverlay
 * 
 * Full-page blocking overlay displayed when the trial has expired.
 * Prevents all interaction with the app until user subscribes or logs out.
 */
const SubscriptionExpiryOverlay = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleViewPlans = () => {
        navigate('/subscribe');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="subscription-overlay">
            <div className="subscription-overlay-backdrop" />
            <div className="subscription-overlay-card">
                <div className="overlay-icon">
                    <Lock size={48} />
                </div>

                <h1 className="overlay-title">Subscription Required</h1>

                <p className="overlay-message">
                    Your 14-day free trial has ended. To continue using PRHub
                    and access all your data, please subscribe to a plan.
                </p>

                <div className="overlay-features">
                    <h3>With a subscription, you get:</h3>
                    <ul>
                        <li>Full access to all features</li>
                        <li>Unlimited sales history</li>
                        <li>Advanced analytics & insights</li>
                        <li>Priority support</li>
                    </ul>
                </div>

                <div className="overlay-actions">
                    <button
                        className="btn-view-plans"
                        onClick={handleViewPlans}
                    >
                        <CreditCard size={20} />
                        View Plans
                    </button>

                    <button
                        className="btn-logout"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>

                <p className="overlay-contact">
                    Need help? Contact us at{' '}
                    <a href="mailto:support@prhub.shop">support@prhub.shop</a>
                </p>
            </div>
        </div>
    );
};

export default SubscriptionExpiryOverlay;
