import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './MetricCard.css';

const MetricCard = ({ title, value, icon: Icon, trend, trendDirection, subtitle, color, className = '' }) => {
  return (
    <div className={`dashboard-card metric-card ${className}`}>
      <div className="metric-header">
        <div className="metric-info">
          <h3 className="metric-title">{title}</h3>
          <div className="metric-value">{value}</div>
        </div>
        {Icon && (
          <div className={`metric-icon-wrapper metric-bg-${color}`}>
            <Icon size={24} className={`metric-text-${color}`} />
          </div>
        )}
      </div>

      <div className="metric-footer">
        {trend && (
          <div className={`trend-indicator ${trendDirection === 'up' ? 'trend-up' : 'trend-down'}`}>
            {trendDirection === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{trend}</span>
          </div>
        )}
        <span className="metric-subtitle">{subtitle}</span>
      </div>
    </div>
  );
};

export default MetricCard;
