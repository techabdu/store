import { useState, useEffect } from 'react';
import { UserCog, LogOut, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import './ImpersonationBanner.css';

const ImpersonationBanner = () => {
    const [impersonating, setImpersonating] = useState(false);
    const [targetUser, setTargetUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkImpersonationStatus();
    }, []);

    const checkImpersonationStatus = async () => {
        try {
            // We can use check-session or a specific impersonation status endpoint
            const response = await api.get('/auth/check-session.php');
            if (response.data.success && response.data.user.impersonating) {
                setImpersonating(true);
                setTargetUser(response.data.user);
            } else {
                setImpersonating(false);
            }
        } catch (err) {
            console.error('Error checking impersonation status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExit = async () => {
        if (!window.confirm('Stop impersonating and return to your admin account?')) return;

        try {
            const response = await api.post('/superadmin/impersonate.php?action=stop');
            if (response.data.success) {
                window.location.href = '/superadmin/dashboard';
            }
        } catch (err) {
            alert('Failed to stop impersonation');
        }
    };

    if (loading || !impersonating) return null;

    return (
        <div className="impersonation-banner">
            <div className="banner-content">
                <div className="banner-left">
                    <UserCog size={18} className="pulse-icon" />
                    <span>
                        IMPERSONATING: <strong>{targetUser?.username}</strong> ({targetUser?.role})
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
