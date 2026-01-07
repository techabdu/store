import { useNavigate } from 'react-router-dom';
import { Zap, ArrowUpRight } from 'lucide-react';
import './TrialStatusBar.css';

/**
 * TrialStatusBar
 * 
 * Slim horizontal bar displayed at the top of the admin dashboard
 * showing trial status and remaining days for Starter plan users.
 */
const TrialStatusBar = ({ daysRemaining, planName = 'Starter', totalDays = 14 }) => {
    const navigate = useNavigate();

    // Calculate progress percentage (inverse - shows time used)
    const daysUsed = totalDays - daysRemaining;
    const progressPercent = Math.min(100, Math.max(0, (daysUsed / totalDays) * 100));

    // Determine urgency level for styling
    const getUrgencyClass = () => {
        if (daysRemaining <= 1) return 'urgency-critical';
        if (daysRemaining <= 3) return 'urgency-warning';
        if (daysRemaining <= 7) return 'urgency-attention';
        return '';
    };

    const handleUpgrade = () => {
        navigate('/subscribe');
    };

    return (
        <div className={`trial-status-bar ${getUrgencyClass()}`}>
            <div className="trial-bar-content">
                <div className="trial-left">
                    <span className="plan-badge">
                        <Zap size={12} />
                        {planName}
                    </span>

                    <div className="trial-progress-container">
                        <div className="trial-progress-bar">
                            <div
                                className="trial-progress-fill"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="trial-right">
                    <span className="days-remaining">
                        {daysRemaining === 0
                            ? 'Trial ends today!'
                            : daysRemaining === 1
                                ? '1 day remaining'
                                : `${daysRemaining} days remaining`
                        }
                    </span>

                    <button
                        className="btn-upgrade"
                        onClick={handleUpgrade}
                    >
                        Upgrade
                        <ArrowUpRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrialStatusBar;
