import React from 'react';
import { MousePointer2 } from 'lucide-react';
import './EmptyState.css';

const EmptyState = ({ icon: Icon, title, description, action }) => {
    return (
        <div className="empty-state-container glass-card">
            <div className="empty-state-icon">
                {Icon ? <Icon size={48} /> : <MousePointer2 size={48} />}
            </div>
            <h3 className="empty-state-title">{title || 'No data available'}</h3>
            <p className="empty-state-description">
                {description || 'There are no records to display at this moment.'}
            </p>
            {action && (
                <div className="empty-state-action">
                    {action}
                </div>
            )}
        </div>
    );
};

export default EmptyState;
