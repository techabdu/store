import './ProBadge.css';

/**
 * ProBadge
 * 
 * Small pill badge indicating a feature requires Pro subscription.
 * Used on sidebar nav items and feature cards that are restricted on Basic plan.
 */
const ProBadge = ({ size = 'small', className = '' }) => {
    return (
        <span className={`pro-badge pro-badge-${size} ${className}`}>
            PRO
        </span>
    );
};

export default ProBadge;
