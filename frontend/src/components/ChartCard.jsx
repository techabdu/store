import React from 'react';
import './ChartCard.css';

const ChartCard = ({ title, subtitle, children, footer }) => {
  return (
    <div className="dashboard-card chart-card">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {subtitle && <p className="chart-subtitle">{subtitle}</p>}
      </div>

      <div className="chart-content">
        {children}
      </div>

      {footer && (
        <div className="chart-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default ChartCard;
