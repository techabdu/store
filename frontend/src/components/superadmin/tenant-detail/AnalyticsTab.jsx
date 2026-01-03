import { useState, useEffect } from 'react';
import {
    TrendingUp, DollarSign, ShoppingCart, Package,
    Users, AlertCircle, TrendingDown, Activity
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import SkeletonLoader from './SkeletonLoader';
import api from '../../../utils/api';
import './AnalyticsTab.css';

const AnalyticsTab = ({ tenantId }) => {
    const [salesMetrics, setSalesMetrics] = useState(null);
    const [inventoryHealth, setInventoryHealth] = useState(null);
    const [growthIndicators, setGrowthIndicators] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (tenantId) {
            fetchAnalytics();
        }
    }, [tenantId]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const [salesRes, inventoryRes, growthRes] = await Promise.all([
                api.get(`/superadmin/tenant_analytics.php?action=sales_metrics&tenant_id=${tenantId}`),
                api.get(`/superadmin/tenant_analytics.php?action=inventory_health&tenant_id=${tenantId}`),
                api.get(`/superadmin/tenant_analytics.php?action=growth_indicators&tenant_id=${tenantId}`)
            ]);

            if (salesRes.data.success) {
                setSalesMetrics(salesRes.data);
            }

            if (inventoryRes.data.success) {
                setInventoryHealth(inventoryRes.data);
            }

            if (growthRes.data.success) {
                setGrowthIndicators(growthRes.data);
            }

        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.response?.data?.error || 'Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value || 0);
    };

    const formatNumber = (value) => {
        return new Intl.NumberFormat('en-US').format(value || 0);
    };

    const formatPercentage = (value) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value?.toFixed(1)}%`;
    };

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading analytics data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-state">
                <AlertCircle size={48} />
                <h3>Error Loading Analytics</h3>
                <p>{error}</p>
                <button onClick={fetchAnalytics} className="btn-retry">Retry</button>
            </div>
        );
    }

    return (
        <div className="analytics-tab">
            {/* Sales Metrics Section */}
            <div className="analytics-section">
                <h3 className="section-title">
                    <DollarSign size={24} />
                    Sales Performance (30 Days)
                </h3>

                <div className="metrics-grid">
                    <div className="metric-card total-sales">
                        <div className="metric-icon">
                            <DollarSign size={32} />
                        </div>
                        <div className="metric-content">
                            <label>Total Sales</label>
                            <span className="metric-value">
                                {formatCurrency(salesMetrics?.total_sales)}
                            </span>
                            {salesMetrics?.sales_growth !== undefined && (
                                <span className={`metric-change ${salesMetrics.sales_growth >= 0 ? 'positive' : 'negative'}`}>
                                    {salesMetrics.sales_growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    {formatPercentage(salesMetrics.sales_growth)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="metric-card avg-order">
                        <div className="metric-icon">
                            <ShoppingCart size={32} />
                        </div>
                        <div className="metric-content">
                            <label>Average Order Value</label>
                            <span className="metric-value">
                                {formatCurrency(salesMetrics?.avg_order_value)}
                            </span>
                        </div>
                    </div>

                    <div className="metric-card transactions">
                        <div className="metric-icon">
                            <Activity size={32} />
                        </div>
                        <div className="metric-content">
                            <label>Total Transactions</label>
                            <span className="metric-value">
                                {formatNumber(salesMetrics?.total_transactions)}
                            </span>
                        </div>
                    </div>

                    <div className="metric-card conversion">
                        <div className="metric-icon">
                            <TrendingUp size={32} />
                        </div>
                        <div className="metric-content">
                            <label>Conversion Rate</label>
                            <span className="metric-value">
                                {salesMetrics?.conversion_rate?.toFixed(1) || '0.0'}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Revenue Trend Chart */}
            {salesMetrics?.revenue_trend && salesMetrics.revenue_trend.length > 0 && (
                <div className="chart-section">
                    <h3 className="section-title">
                        <TrendingUp size={24} />
                        Revenue Trend (30 Days)
                    </h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={salesMetrics.revenue_trend}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--text-secondary)"
                                    style={{ fontSize: '0.875rem' }}
                                />
                                <YAxis
                                    stroke="var(--text-secondary)"
                                    style={{ fontSize: '0.875rem' }}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(31, 41, 55, 0.95)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        padding: '12px'
                                    }}
                                    labelStyle={{ color: 'var(--text-primary)' }}
                                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#a78bfa"
                                    strokeWidth={2}
                                    fill="url(#revenueGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Top Selling Items & Inventory */}
            <div className="two-column-section">
                {/* Top Selling Items */}
                <div className="top-items-section">
                    <h3 className="section-title">
                        <Package size={24} />
                        Top Selling Items
                    </h3>
                    {salesMetrics?.top_items && salesMetrics.top_items.length > 0 ? (
                        <div className="top-items-list">
                            {salesMetrics.top_items.slice(0, 10).map((item, index) => (
                                <div key={index} className="top-item">
                                    <div className="item-rank">#{index + 1}</div>
                                    <div className="item-info">
                                        <span className="item-name">{item.item_name || item.name}</span>
                                        <div className="item-stats">
                                            <span className="item-quantity">{formatNumber(item.quantity_sold)} sold</span>
                                            <span className="item-revenue">{formatCurrency(item.revenue)}</span>
                                        </div>
                                    </div>
                                    <div className="item-bar">
                                        <div
                                            className="item-bar-fill"
                                            style={{
                                                width: `${(item.quantity_sold / salesMetrics.top_items[0].quantity_sold) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Package}
                            title="No Sales Data"
                            description="There are no top selling items to display for the last 30 days."
                        />
                    )}
                </div>

                {/* Inventory Health */}
                <div className="inventory-section">
                    <h3 className="section-title">
                        <Package size={24} />
                        Inventory Health
                    </h3>
                    <div className="inventory-stats">
                        <div className="inventory-card">
                            <label>Total Products</label>
                            <span className="big-number">{formatNumber(inventoryHealth?.total_products)}</span>
                        </div>
                        <div className="inventory-card">
                            <label>In Stock</label>
                            <span className="big-number success">{formatNumber(inventoryHealth?.in_stock)}</span>
                        </div>
                        <div className="inventory-card">
                            <label>Low Stock</label>
                            <span className="big-number warning">{formatNumber(inventoryHealth?.low_stock)}</span>
                        </div>
                        <div className="inventory-card">
                            <label>Out of Stock</label>
                            <span className="big-number error">{formatNumber(inventoryHealth?.out_of_stock)}</span>
                        </div>
                        <div className="inventory-card full-width">
                            <label>Inventory Turnover Rate</label>
                            <span className="big-number">{inventoryHealth?.turnover_rate?.toFixed(2) || '0.00'}x</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Growth Chart */}
            {growthIndicators?.user_growth && growthIndicators.user_growth.length > 0 && (
                <div className="chart-section">
                    <h3 className="section-title">
                        <Users size={24} />
                        User Growth (6 Months)
                    </h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={growthIndicators.user_growth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="month"
                                    stroke="var(--text-secondary)"
                                    style={{ fontSize: '0.875rem' }}
                                />
                                <YAxis
                                    stroke="var(--text-secondary)"
                                    style={{ fontSize: '0.875rem' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(31, 41, 55, 0.95)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        padding: '12px'
                                    }}
                                    labelStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Legend />
                                <Bar dataKey="new_users" fill="#34d399" name="New Users" />
                                <Bar dataKey="total_users" fill="#a78bfa" name="Total Users" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsTab;
