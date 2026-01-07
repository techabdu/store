import React from 'react';
import MetricCard from '../MetricCard';
import './HealthPillarCard.css';

const HealthPillarCard = ({ title, status, value, trend, trendDirection, metric, subtitle }) => {
    const statusIcons = {
        healthy: '🟢',
        warning: '🟡',
        critical: '🔴'
    };

    return (
        <div className="health-pillar-card">
            <div className={`status-indicator status-${status}`}>
                {statusIcons[status] || '⚪'}
            </div>
            <MetricCard
                title={title}
                value={value}
                trend={trend}
                trendDirection={trendDirection}
                subtitle={subtitle}
                className="health-pillar-metric"
            />
        </div>
    );
};

export default HealthPillarCard;
