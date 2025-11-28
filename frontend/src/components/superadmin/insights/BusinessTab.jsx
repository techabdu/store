import React from 'react';
import { FaChartLine, FaUsers, FaBox, FaDollarSign, FaUserSlash } from 'react-icons/fa';
import './InsightsTabs.css';

const BusinessTab = ({ data }) => {
    if (!data) return <div>No business data available</div>;

    const { user_stats, inactive_users, transaction_volume_7day, transaction_volume_30day, inventory_status, revenue_trends_7day, revenue_trends_30day } = data;

    return (
        <div className="insights-tab business-tab">
            <div className="tab-grid">
                {/* User Statistics */}
                <div className="insight-card">
                    <h3>
                        <FaUsers className="card-icon info" />
                        User Statistics
                    </h3>
                    {user_stats ? (
                        <div className="metrics-grid">
                            <div className="metric-item large">
                                <div className="metric-label">Total Users</div>
                                <div className="metric-value large">{user_stats.total_users}</div>
                            </div>
                            {user_stats.by_role && (
                                <div className="role-breakdown full-width">
                                    <div className="breakdown-label">By Role:</div>
                                    {Object.entries(user_stats.by_role).map(([role, count]) => (
                                        <div key={role} className="role-stat">
                                            <span className={`role-badge ${role}`}>{role}</span>
                                            <span className="role-count">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No user stats</div>
                    )}
                </div>

                {/* Inactive Users */}
                <div className="insight-card">
                    <h3>
                        <FaUserSlash className="card-icon warning" />
                        Inactive Users (30 days)
                    </h3>
                    {inactive_users ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Inactive Count</div>
                                <div className="metric-value warning">{inactive_users.inactive_count}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Inactive %</div>
                                <div className="metric-value">{inactive_users.inactive_percentage}%</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Total Users</div>
                                <div className="metric-value">{inactive_users.total_users}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No inactive user data</div>
                    )}
                </div>

                {/* Inventory Status */}
                <div className="insight-card">
                    <h3>
                        <FaBox className="card-icon info" />
                        Inventory Status
                    </h3>
                    {inventory_status ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Total Items</div>
                                <div className="metric-value">{inventory_status.total_items}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Total Quantity</div>
                                <div className="metric-value">{inventory_status.total_quantity?.toLocaleString()}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Total Value</div>
                                <div className="metric-value success">₦{inventory_status.total_value?.toLocaleString()}</div>
                            </div>
                            {inventory_status.stock_levels && (
                                <div className="stock-levels full-width">
                                    <div className="stock-item">
                                        <span className="stock-label">Out of Stock:</span>
                                        <span className="stock-value critical">{inventory_status.stock_levels.out_of_stock}</span>
                                    </div>
                                    <div className="stock-item">
                                        <span className="stock-label">Low Stock:</span>
                                        <span className="stock-value warning">{inventory_status.stock_levels.low_stock}</span>
                                    </div>
                                    <div className="stock-item">
                                        <span className="stock-label">In Stock:</span>
                                        <span className="stock-value success">{inventory_status.stock_levels.in_stock}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No inventory data</div>
                    )}
                </div>

                {/* Revenue Trends - 7 Day */}
                <div className="insight-card">
                    <h3>
                        <FaDollarSign className="card-icon success" />
                        Revenue (7 Days)
                    </h3>
                    {revenue_trends_7day ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Total Revenue</div>
                                <div className="metric-value success">₦{revenue_trends_7day.total_revenue?.toLocaleString()}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Total Expenses</div>
                                <div className="metric-value critical">₦{revenue_trends_7day.total_expenses?.toLocaleString()}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Net Profit</div>
                                <div className={`metric-value ${revenue_trends_7day.net_profit >= 0 ? 'success' : 'critical'}`}>
                                    ₦{revenue_trends_7day.net_profit?.toLocaleString()}
                                </div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Avg Daily Revenue</div>
                                <div className="metric-value">₦{revenue_trends_7day.avg_daily_revenue?.toLocaleString()}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No revenue data</div>
                    )}
                </div>

                {/* Transaction Volume - 7 Day */}
                <div className="insight-card full-width">
                    <h3>
                        <FaChartLine className="card-icon info" />
                        Transaction Volume (7 Days)
                    </h3>
                    {transaction_volume_7day && transaction_volume_7day.daily_data ? (
                        <div>
                            <div className="summary-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Total Transactions:</span>
                                    <span className="stat-value">{transaction_volume_7day.total_transactions}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Total Revenue:</span>
                                    <span className="stat-value">₦{transaction_volume_7day.total_revenue?.toLocaleString()}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Avg Daily:</span>
                                    <span className="stat-value">{transaction_volume_7day.avg_daily_transactions?.toFixed(1)}</span>
                                </div>
                            </div>
                            <div className="transaction-chart">
                                {transaction_volume_7day.daily_data.map((day, index) => (
                                    <div key={index} className="transaction-bar">
                                        <div className="bar-label">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                        <div className="bar-container">
                                            <div
                                                className="bar-fill"
                                                style={{
                                                    height: `${(day.transaction_count / Math.max(...transaction_volume_7day.daily_data.map(d => d.transaction_count))) * 100}%`
                                                }}
                                            ></div>
                                        </div>
                                        <div className="bar-value">{day.transaction_count}</div>
                                        <div className="bar-revenue">₦{day.daily_revenue?.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No transaction data</div>
                    )}
                </div>

                {/* Revenue Trends - 30 Day */}
                <div className="insight-card">
                    <h3>
                        <FaDollarSign className="card-icon success" />
                        Revenue (30 Days)
                    </h3>
                    {revenue_trends_30day ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Total Revenue</div>
                                <div className="metric-value success">₦{revenue_trends_30day.total_revenue?.toLocaleString()}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Net Profit</div>
                                <div className={`metric-value ${revenue_trends_30day.net_profit >= 0 ? 'success' : 'critical'}`}>
                                    ₦{revenue_trends_30day.net_profit?.toLocaleString()}
                                </div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Max Daily</div>
                                <div className="metric-value">₦{revenue_trends_30day.max_daily_revenue?.toLocaleString()}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Min Daily</div>
                                <div className="metric-value">₦{revenue_trends_30day.min_daily_revenue?.toLocaleString()}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No 30-day revenue data</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BusinessTab;
