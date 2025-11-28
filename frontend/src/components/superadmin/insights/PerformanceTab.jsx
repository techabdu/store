import React from 'react';
import { FaTachometerAlt, FaUsers, FaExclamationCircle, FaClock } from 'react-icons/fa';
import './InsightsTabs.css';

const PerformanceTab = ({ data }) => {
    if (!data) return <div>No performance data available</div>;

    const { api_response_times, error_rate, active_users, peak_usage_7day, peak_usage_30day } = data;

    return (
        <div className="insights-tab performance-tab">
            <div className="tab-grid">
                {/* API Response Times */}
                <div className="insight-card">
                    <h3>
                        <FaTachometerAlt className="card-icon info" />
                        API Response Times (24h)
                    </h3>
                    {api_response_times ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Avg Response Time</div>
                                <div className={`metric-value ${api_response_times.status === 'excellent' ? 'success' : api_response_times.status === 'good' ? 'info' : 'warning'}`}>
                                    {api_response_times.avg_response_time_ms} ms
                                </div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Total Requests</div>
                                <div className="metric-value">{api_response_times.total_requests?.toLocaleString()}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Unique Users</div>
                                <div className="metric-value">{api_response_times.unique_users}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Status</div>
                                <div className="metric-value">
                                    <span className={`status-badge ${api_response_times.status}`}>
                                        {api_response_times.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No response time data</div>
                    )}
                </div>

                {/* Error Rate */}
                <div className="insight-card">
                    <h3>
                        <FaExclamationCircle className="card-icon warning" />
                        Error Rate (24h)
                    </h3>
                    {error_rate ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Error Rate</div>
                                <div className={`metric-value ${error_rate.status === 'healthy' ? 'success' : error_rate.status === 'warning' ? 'warning' : 'critical'}`}>
                                    {error_rate.error_rate_percentage}%
                                </div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Total Errors</div>
                                <div className="metric-value">{error_rate.error_count}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Total Requests</div>
                                <div className="metric-value">{error_rate.total_requests?.toLocaleString()}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Status</div>
                                <div className="metric-value">
                                    <span className={`status-badge ${error_rate.status}`}>
                                        {error_rate.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No error rate data</div>
                    )}
                </div>

                {/* Active Users */}
                <div className="insight-card">
                    <h3>
                        <FaUsers className="card-icon info" />
                        Active Users (30 min)
                    </h3>
                    {active_users ? (
                        <div className="metrics-grid">
                            <div className="metric-item large">
                                <div className="metric-label">Currently Active</div>
                                <div className="metric-value large">{active_users.active_count}</div>
                            </div>
                            {active_users.by_role && Object.keys(active_users.by_role).length > 0 && (
                                <div className="role-breakdown full-width">
                                    <div className="breakdown-label">By Role:</div>
                                    <div className="role-grid">
                                        {Object.entries(active_users.by_role).map(([role, count]) => (
                                            <div key={role} className="role-item">
                                                <span className={`role-badge ${role}`}>{role}</span>
                                                <span className="role-count">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No active user data</div>
                    )}
                </div>

                {/* Peak Usage Times - 7 Day */}
                <div className="insight-card full-width">
                    <h3>
                        <FaClock className="card-icon info" />
                        Peak Usage Times (7 Days)
                    </h3>
                    {peak_usage_7day && peak_usage_7day.hourly_activity ? (
                        <div>
                            <div className="peak-info">
                                <strong>Peak Hour:</strong> {peak_usage_7day.peak_hour_formatted || 'N/A'}
                            </div>
                            <div className="hourly-chart">
                                {peak_usage_7day.hourly_activity.slice(0, 12).map((hour, index) => (
                                    <div key={index} className="hour-bar">
                                        <div className="hour-label">{hour.hour}:00</div>
                                        <div className="bar-container">
                                            <div
                                                className="bar-fill"
                                                style={{
                                                    height: `${(hour.activity_count / Math.max(...peak_usage_7day.hourly_activity.map(h => h.activity_count))) * 100}%`
                                                }}
                                                title={`${hour.activity_count} activities`}
                                            ></div>
                                        </div>
                                        <div className="hour-count">{hour.activity_count}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No peak usage data</div>
                    )}
                </div>

                {/* Daily Activity - 7 Day */}
                {peak_usage_7day && peak_usage_7day.daily_activity && (
                    <div className="insight-card full-width">
                        <h3>
                            <FaClock className="card-icon info" />
                            Daily Activity (7 Days)
                        </h3>
                        <div className="daily-chart">
                            {peak_usage_7day.daily_activity.map((day, index) => (
                                <div key={index} className="day-bar">
                                    <div className="day-label">{day.day_name}</div>
                                    <div className="bar-container">
                                        <div
                                            className="bar-fill"
                                            style={{
                                                height: `${(day.activity_count / Math.max(...peak_usage_7day.daily_activity.map(d => d.activity_count))) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                    <div className="day-count">{day.activity_count?.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerformanceTab;
