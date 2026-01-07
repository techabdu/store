import React from 'react';
import './AlertBadge.css';

const AlertBadge = ({ count, severity = 'info', isNew = false }) => {
    if (count === 0 || count === null || count === undefined) return null;

    const severityClasses = {
        critical: 'alert-badge-critical',
        warning: 'alert-badge-warning',
        info: 'alert-badge-info'
    };

    return (
        <span className={`alert-badge ${severityClasses[severity]} ${isNew ? 'new' : ''}`}>
            {count}
        </span>
    );
};

export default AlertBadge;
