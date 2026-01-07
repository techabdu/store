import React from 'react';
import { FaChartLine, FaUsers, FaBox, FaDollarSign, FaUserSlash, FaBuilding, FaClock, FaCreditCard, FaTrophy, FaUserPlus } from 'react-icons/fa';
import './InsightsTabs.css';

const BusinessTab = ({ data }) => {
    if (!data) return <div>No business data available</div>;

    const {
        user_stats,
        inactive_users,
        transaction_volume_7day,
        inventory_status,
        revenue_trends_7day,
        revenue_trends_30day,
        tenant_health,
        expiring_trials,
        payment_status,
        top_tenants,
        user_growth
    } = data;

    return (
        <div className="insights-tab business-tab">
            <div className="tab-grid">
                {/* Tenant Health Summary */}
                <div className="insight-card">
                    <h3>
                        <FaBuilding className="card-icon info" />
                        Tenant Health
                    </h3>
                    {tenant_health ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Total Tenants</div>
                                <div className="metric-value large">{tenant_health.total}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Active</div>
                                <div className="metric-value success">{tenant_health.active}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Trial</div>
                                <div className="metric-value info">{tenant_health.trial}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Suspended</div>
                                <div className="metric-value critical">{tenant_health.suspended}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Pending</div>
                                <div className="metric-value warning">{tenant_health.pending}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No tenant health data</div>
                    )}
                </div>

                {/* Payment Status */}
                <div className="insight-card">
                    <h3>
                        <FaCreditCard className="card-icon success" />
                        Payment Status
                    </h3>
                    {payment_status ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">30-Day Revenue</div>
                                <div className="metric-value success large">₦{payment_status.total_revenue_30d?.toLocaleString()}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Successful</div>
                                <div className="metric-value success">{payment_status.successful}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Failed</div>
                                <div className="metric-value critical">{payment_status.failed}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Pending</div>
                                <div className="metric-value warning">{payment_status.pending}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No payment data</div>
                    )}
                </div>

                {/* Expiring Trials */}
                <div className="insight-card">
                    <h3>
                        <FaClock className="card-icon warning" />
                        Expiring Trials (Next 7 Days)
                    </h3>
                    {expiring_trials && expiring_trials.length > 0 ? (
                        <div className="table-container">
                            <table className="insights-table">
                                <thead>
                                    <tr>
                                        <th>Business</th>
                                        <th>Days Left</th>
                                        <th>Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expiring_trials.slice(0, 5).map((trial, index) => (
                                        <tr key={index}>
                                            <td>{trial.business_name}</td>
                                            <td>
                                                <span className={`status-badge ${trial.days_remaining <= 2 ? 'critical' : 'warning'}`}>
                                                    {trial.days_remaining} day(s)
                                                </span>
                                            </td>
                                            <td className="email-cell">{trial.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="no-issues">
                            <p>No trials expiring soon</p>
                        </div>
                    )}
                </div>

                {/* User Growth Chart */}
                <div className="insight-card">
                    <h3>
                        <FaUserPlus className="card-icon info" />
                        User Growth (7 Days)
                    </h3>
                    {user_growth && user_growth.length > 0 ? (
                        <div className="simple-bar-chart">
                            {user_growth.map((day, index) => (
                                <div key={index} className="bar-item">
                                    <div className="bar-label">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                    <div className="bar-container">
                                        <div
                                            className="bar-fill success"
                                            style={{
                                                height: `${(day.new_users / Math.max(...user_growth.map(d => d.new_users), 1)) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                    <div className="bar-value">+{day.new_users}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-data">No user growth data</div>
                    )}
                </div>

                {/* Top Tenants */}
                <div className="insight-card">
                    <h3>
                        <FaTrophy className="card-icon success" />
                        Top Tenants (by Users)
                    </h3>
                    {top_tenants && top_tenants.length > 0 ? (
                        <div className="table-container">
                            <table className="insights-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Business</th>
                                        <th>Status</th>
                                        <th>Users</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {top_tenants.slice(0, 5).map((tenant, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{tenant.business_name}</td>
                                            <td>
                                                <span className={`status-badge ${tenant.status}`}>
                                                    {tenant.status}
                                                </span>
                                            </td>
                                            <td>{tenant.user_count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="no-data">No tenant data</div>
                    )}
                </div>

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
                                                    height: `${(day.transaction_count / Math.max(...transaction_volume_7day.daily_data.map(d => d.transaction_count), 1)) * 100}%`
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

