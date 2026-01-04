import { UserCog, LogOut, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './ImpersonationBanner.css';

const ImpersonationBanner = () => {
    const { user, isAuthenticated } = useAuth();

    // Check if user is logged in (useAuth handles this, but safe check)
    if (!isAuthenticated || !user) return null;

    // Check if impersonating based on session data from AuthContext
    const isImpersonating = user.impersonating === true;

    if (!isImpersonating) return null;

    const handleExit = async () => {
        if (!window.confirm('Stop impersonating and return to your admin account?')) return;

        try {
            const response = await api.post('/superadmin/impersonate.php?action=stop');
            if (response.data.success) {
                // Force a full reload to clear all states and restore admin session
                window.location.href = '/superadmin/dashboard';
            }
        } catch (err) {
            alert('Failed to stop impersonation');
        }
    };

    return (
        <div className="impersonation-banner">
            <div className="banner-content">
                <div className="banner-left">
                    <UserCog size={18} className="pulse-icon" />
                    <span>
                        IMPERSONATING: <strong>{user.username}</strong> ({user.role})
                    </span>
                    <div className="banner-warning">
                        <AlertCircle size={14} />
                        <span>All actions are being logged to the audit trail</span>
                    </div>
                </div>
                <button className="exit-button" onClick={handleExit}>
                    <LogOut size={16} /> Exit Impersonation
                </button>
            </div>
        </div>
    );
};

export default ImpersonationBanner;
