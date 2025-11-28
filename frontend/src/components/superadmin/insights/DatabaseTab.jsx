import React from 'react';
import { FaDatabase, FaTable, FaCheckCircle, FaExclamationTriangle, FaChartLine } from 'react-icons/fa';
import './InsightsTabs.css';

const DatabaseTab = ({ data }) => {
    if (!data) return <div>No database data available</div>;

    const { size, table_statistics, integrity, growth_trend_7day, growth_trend_30day } = data;

    return (
        <div className="insights-tab database-tab">
            <div className="tab-grid">
                {/* Database Size */}
                <div className="insight-card">
                    <h3>
                        <FaDatabase className="card-icon info" />
                        Database Size
                    </h3>
                    {size ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Current Size</div>
                                <div className="metric-value">{size.size_mb} MB</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Allocated Space</div>
                                <div className="metric-value">{size.allocated_mb} MB</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Usage</div>
                                <div className={`metric-value ${size.usage_percentage > 50 ? 'warning' : 'success'}`}>
                                    {size.usage_percentage}%
                                </div>
                            </div>
                            <div className="progress-bar-container full-width">
                                <div className="progress-label">Storage Usage</div>
                                <div className="progress-bar">
                                    <div
                                        className={`progress-fill ${size.usage_percentage > 50 ? 'warning' : 'success'}`}
                                        style={{ width: `${size.usage_percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No size data</div>
                    )}
                </div>

                {/* Data Integrity */}
                <div className="insight-card">
                    <h3>
                        {integrity?.status === 'healthy' ? (
                            <FaCheckCircle className="card-icon success" />
                        ) : (
                            <FaExclamationTriangle className="card-icon warning" />
                        )}
                        Data Integrity
                    </h3>
                    {integrity ? (
                        <div>
                            <div className="status-badge-large">
                                <span className={`status ${integrity.status}`}>
                                    {integrity.status === 'healthy' ? 'Healthy' : 'Issues Found'}
                                </span>
                            </div>
                            {integrity.issues && integrity.issues.length > 0 ? (
                                <div className="issues-list">
                                    {integrity.issues.map((issue, index) => (
                                        <div key={index} className="issue-item">
                                            <div className="issue-table">{issue.table}</div>
                                            <div className="issue-desc">{issue.description}</div>
                                            <div className="issue-count">{issue.count} records</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-issues">
                                    <FaCheckCircle className="success-icon" />
                                    <p>No integrity issues detected</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No integrity data</div>
                    )}
                </div>

                {/* Table Statistics */}
                <div className="insight-card full-width">
                    <h3>
                        <FaTable className="card-icon info" />
                        Table Statistics
                    </h3>
                    {table_statistics && table_statistics.length > 0 ? (
                        <div className="table-container">
                            <table className="insights-table">
                                <thead>
                                    <tr>
                                        <th>Table Name</th>
                                        <th>Rows</th>
                                        <th>Size (MB)</th>
                                        <th>Data (MB)</th>
                                        <th>Index (MB)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {table_statistics.slice(0, 15).map((table, index) => (
                                        <tr key={index}>
                                            <td className="table-name">{table.table_name}</td>
                                            <td>{table.table_rows?.toLocaleString()}</td>
                                            <td>{table.size_mb}</td>
                                            <td>{table.data_mb}</td>
                                            <td>{table.index_mb}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="no-data">No table statistics</div>
                    )}
                </div>

                {/* Growth Trends */}
                <div className="insight-card">
                    <h3>
                        <FaChartLine className="card-icon info" />
                        7-Day Growth Trend
                    </h3>
                    {growth_trend_7day ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Current Size</div>
                                <div className="metric-value">{growth_trend_7day.current_size_mb} MB</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Est. Daily Growth</div>
                                <div className="metric-value">{growth_trend_7day.estimated_growth_mb_per_day} MB/day</div>
                            </div>
                            {growth_trend_7day.daily_activity && growth_trend_7day.daily_activity.length > 0 && (
                                <div className="activity-chart full-width">
                                    <div className="chart-label">Daily Transaction Activity</div>
                                    <div className="simple-bar-chart">
                                        {growth_trend_7day.daily_activity.map((day, index) => (
                                            <div key={index} className="bar-item">
                                                <div className="bar-label">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                                <div className="bar-container">
                                                    <div
                                                        className="bar-fill"
                                                        style={{
                                                            height: `${(day.transactions / Math.max(...growth_trend_7day.daily_activity.map(d => d.transactions))) * 100}%`
                                                        }}
                                                    ></div>
                                                </div>
                                                <div className="bar-value">{day.transactions}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No growth trend data</div>
                    )}
                </div>

                <div className="insight-card">
                    <h3>
                        <FaChartLine className="card-icon info" />
                        30-Day Growth Trend
                    </h3>
                    {growth_trend_30day ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Period</div>
                                <div className="metric-value">{growth_trend_30day.period_days} days</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Total Activity</div>
                                <div className="metric-value">
                                    {growth_trend_30day.daily_activity?.reduce((sum, day) => sum + day.transactions, 0).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No 30-day trend data</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatabaseTab;
