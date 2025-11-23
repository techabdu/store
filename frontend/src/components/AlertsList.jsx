import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import './AlertsList.css';

const AlertsList = ({ title, subtitle, alerts, emptyState }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={20} className="alert-icon-warning" />;
      case 'error': return <AlertCircle size={20} className="alert-icon-error" />;
      case 'success': return <CheckCircle size={20} className="alert-icon-success" />;
      default: return <Info size={20} className="alert-icon-info" />;
    }
  };

  return (
    <div className="dashboard-card alerts-card">
      <div className="alerts-header">
        <h3 className="alerts-title">{title}</h3>
        {subtitle && <p className="alerts-subtitle">{subtitle}</p>}
      </div>

      <div className="alerts-content">
        {alerts && alerts.length > 0 ? (
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <div key={index} className="alert-item">
                <div className="alert-icon">
                  {getIcon(alert.color)}
                </div>
                <div className="alert-details">
                  <h4 className="alert-item-title">{alert.title}</h4>
                  <p className="alert-description">{alert.description}</p>
                  <span className="alert-timestamp">{alert.timestamp}</span>
                </div>
                {alert.action && (
                  <button className="alert-action-btn">{alert.action}</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <CheckCircle size={48} className="empty-icon" />
            <p>{emptyState.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsList;
