import React from 'react';
import { FaClipboardList, FaExchangeAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import './InsightsTabs.css';

const AuditTab = ({ data }) => {
    if (!data) return <div>No audit data available</div>;

    const { recent_activities, role_change_history, data_integrity, compliance_alerts, audit_summary_7day, audit_summary_30day } = data;

    return (
        <div className="insights-tab audit-tab">
            <div className="tab-grid">
                {/* Audit Summary - 7 Day */}
                <div className="insight-card">
                    <h3>
                        <FaClipboardList className="card-icon info" />
                        Audit Summary (7 Days)
                    </h3>
                    {audit_summary_7day ? (
                        <div className="metrics-grid">
                            <div className="metric-item large">
                                <div className="metric-label">Total Activities</div>
                                <div className="metric-value large">{audit_summary_7day.total_activities?.toLocaleString()}</div>
                            </div>
                            {audit_summary_7day.activities_by_role && (
                                <div className="role-breakdown full-width">
                                    <div className="breakdown-label">Activities by Role:</div>
                                    {Object.entries(audit_summary_7day.activities_by_role).map(([role, count]) => (
                                        <div key={role} className="role-stat">
                                            <span className={`role-badge ${role}`}>{role}</span>
                                            <span className="role-count">{count?.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No audit summary</div>
                    )}
                </div>

                {/* Data Integrity */}
                <div className="insight-card">
                    <h3>
                        {data_integrity?.status === 'healthy' ? (
                            <FaCheckCircle className="card-icon success" />
                        ) : (
                            <FaExclamationTriangle className="card-icon warning" />
                        )}
                        Data Integrity
                    </h3>
                    {data_integrity ? (
                        <div>
                            <div className="status-badge-large">
                                <span className={`status ${data_integrity.status}`}>
                                    {data_integrity.status === 'healthy' ? 'Healthy' : 'Issues Found'}
                                </span>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Total Issues</div>
                                <div className="metric-value">{data_integrity.total_issues || 0}</div>
                            </div>
                            {data_integrity.issues && data_integrity.issues.length > 0 && (
                                <div className="issues-list">
                                    {data_integrity.issues.map((issue, index) => (
                                        <div key={index} className={`issue-item ${issue.severity}`}>
                                            <div className="issue-table">{issue.table}</div>
                                            <div className="issue-type">{issue.issue_type}</div>
                                            <div className="issue-count">{issue.count} records</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No integrity data</div>
                    )}
                </div>

                {/* Compliance Alerts */}
                <div className="insight-card">
                    <h3>
                        <FaExclamationTriangle className="card-icon warning" />
                        Compliance Alerts
                    </h3>
                    {compliance_alerts ? (
                        <div>
                            <div className="metric-item">
                                <div className="metric-label">Total Alerts</div>
                                <div className="metric-value">{compliance_alerts.total_alerts || 0}</div>
                            </div>
                            {compliance_alerts.alerts && compliance_alerts.alerts.length > 0 ? (
                                <div className="alerts-list">
                                    {compliance_alerts.alerts.map((alert, index) => (
                                        <div key={index} className={`alert-item ${alert.severity}`}>
                                            <div className="alert-type">{alert.type}</div>
                                            <div className="alert-message">{alert.message}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-issues">
                                    <FaCheckCircle className="success-icon" />
                                    <p>No compliance alerts</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No compliance data</div>
                    )}
                </div>

                {/* Role Change History */}
                <div className="insight-card">
                    <h3>
                        <FaExchangeAlt className="card-icon info" />
                        Role Changes (30 Days)
                    </h3>
                    {role_change_history ? (
                        <div>
                            <div className="metric-item">
                                <div className="metric-label">Total Changes</div>
                                <div className="metric-value">{role_change_history.total_changes}</div>
                            </div>
                            {role_change_history.changes && role_change_history.changes.length > 0 ? (
                                <div className="table-container">
                                    <table className="insights-table">
                                        <thead>
                                            <tr>
                                                <th>Username</th>
                                                <th>Current Role</th>
                                                <th>Action</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {role_change_history.changes.slice(0, 10).map((change, index) => (
                                                <tr key={index}>
                                                    <td>{change.username}</td>
                                                    <td>
                                                        <span className={`role-badge ${change.current_role}`}>
                                                            {change.current_role}
                                                        </span>
                                                    </td>
                                                    <td className="action-cell">{change.action}</td>
                                                    <td>{new Date(change.created_at).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="no-data">No role changes</div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No role change data</div>
                    )}
                </div>

                {/* Recent Activities */}
                <div className="insight-card full-width">
                    <h3>
                        <FaClipboardList className="card-icon info" />
                        Recent Activities (Last 100)
                    </h3>
                    {recent_activities && recent_activities.length > 0 ? (
                        <div className="table-container scrollable">
                            <table className="insights-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Action</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent_activities.slice(0, 50).map((activity, index) => (
                                        <tr key={index}>
                                            <td>{activity.username}</td>
                                            <td>
                                                <span className={`role-badge ${activity.role}`}>
                                                    {activity.role}
                                                </span>
                                            </td>
                                            <td className="action-cell">{activity.action}</td>
                                            <td>{new Date(activity.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="no-data">No recent activities</div>
                    )}
                </div>

                {/* 30-Day Summary */}
                {audit_summary_30day && (
                    <div className="insight-card">
                        <h3>
                            <FaClipboardList className="card-icon info" />
                            30-Day Summary
                        </h3>
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Total Activities</div>
                                <div className="metric-value">{audit_summary_30day.total_activities?.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditTab;
