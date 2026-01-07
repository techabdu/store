import './ComingSoonBadge.css';

/**
 * ComingSoonBadge
 * 
 * Badge indicating a feature is under development (Coming Soon).
 * Used on sidebar nav items and feature buttons.
 */
const ComingSoonBadge = ({ size = 'small', className = '' }) => {
    return (
        <span className={`coming-soon-badge coming-soon-badge-${size} ${className}`}>
            SOON
        </span>
    );
};

export default ComingSoonBadge;
