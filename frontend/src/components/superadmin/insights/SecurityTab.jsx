import React from 'react';
import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import './InsightsTabs.css';

const SecurityTab = ({ data }) => {
    if (!data) return <div>No security data available</div>;

    const { failed_logins, suspicious_activity, active_sessions, password_health, security_alerts } = data;

    return (
        <div className="insights-tab security-tab">
            <div className="tab-grid">
                {/* Security Alerts */}
                <div className="insight-card alert-card">
                    <h3>
                        <FaExclamationTriangle className="card-icon critical" />
                        Critical Security Alerts
                    </h3>
                    {security_alerts && security_alerts.length > 0 ? (
                        <div className="alerts-list">
                            {security_alerts.map((alert, index) => (
                                <div key={index} className={`alert-item ${alert.severity}`}>
                                    <div className="alert-header">
                                        <span className="alert-type">{alert.type}</span>
                                        <span className="alert-time">{new Date(alert.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="alert-message">{alert.message}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-alerts">
                            <FaCheckCircle className="success-icon" />
                            <p>No critical security alerts</p>
                        </div>
                    )}
                </div>

                {/* Failed Login Attempts */}
                <div className="insight-card">
                    <h3>
                        <FaExclamationTriangle className="card-icon warning" />
                        Failed Login Attempts (Last 10 min)
                    </h3>
                    {failed_logins && failed_logins.length > 0 ? (
                        <div className="table-container">
                            <table className="insights-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>IP Address</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {failed_logins.slice(0, 10).map((attempt, index) => (
                                        <tr key={index}>
                                            <td>{attempt.username}</td>
                                            <td>{attempt.ip_address}</td>
                                            <td>{new Date(attempt.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="no-data">
                            <FaCheckCircle className="success-icon" />
                            <p>No failed login attempts</p>
                        </div>
                    )}
                </div>

                {/* Active Sessions */}
                <div className="insight-card">
                    <h3>
                        <FaInfoCircle className="card-icon info" />
                        Active Sessions
                    </h3>
                    {active_sessions && active_sessions.length > 0 ? (
                        <div className="sessions-list">
                            <div className="session-count">
                                <strong>{active_sessions.length}</strong> active user(s)
                            </div>
                            <div className="table-container">
                                <table className="insights-table">
                                    <thead>
                                        <tr>
                                            <th>Username</th>
                                            <th>Role</th>
                                            <th>Last Activity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {active_sessions.slice(0, 10).map((session, index) => (
                                            <tr key={index}>
                                                <td>{session.username}</td>
                                                <td>
                                                    <span className={`role-badge ${session.role}`}>
                                                        {session.role}
                                                    </span>
                                                </td>
                                                <td>{new Date(session.last_activity).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">
                            <p>No active sessions</p>
                        </div>
                    )}
                </div>

                {/* Password Health */}
                <div className="insight-card">
                    <h3>
                        <FaInfoCircle className="card-icon info" />
                        Password Health
                    </h3>
                    {password_health ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Total Users</div>
                                <div className="metric-value">{password_health.total_users}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Old Passwords (90+ days)</div>
                                <div className="metric-value warning">
                                    {password_health.users_with_old_passwords}
                                </div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Health Status</div>
                                <div className="metric-value">
                                    {password_health.users_with_old_passwords === 0 ? (
                                        <span className="status-good">Good</span>
                                    ) : (
                                        <span className="status-warning">Needs Attention</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">
                            <p>No password health data</p>
                        </div>
                    )}
                </div>

                {/* Suspicious Activity */}
                {suspicious_activity && suspicious_activity.length > 0 && (
                    <div className="insight-card full-width">
                        <h3>
                            <FaExclamationTriangle className="card-icon warning" />
                            Suspicious Activity Detected
                        </h3>
                        <div className="suspicious-list">
                            {suspicious_activity.map((activity, index) => (
                                <div key={index} className="suspicious-item">
                                    <div className="suspicious-type">{activity.type.replace(/_/g, ' ')}</div>
                                    <div className="suspicious-details">
                                        {activity.username && <span>User: {activity.username}</span>}
                                        {activity.count && <span>Count: {activity.count}</span>}
                                        {activity.timestamp && <span>Time: {new Date(activity.timestamp).toLocaleString()}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SecurityTab;
