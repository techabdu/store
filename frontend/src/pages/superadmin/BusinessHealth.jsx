import React, { useState, useEffect } from 'react';
import MetricCard from '../../components/MetricCard';
import { LineChart, BarChart, PieChart } from '../../components/Charts';
import DataTable from '../../components/Tables/DataTable';
import ConnectionIndicator from '../../components/ConnectionIndicator';
import { DollarSign, ShoppingCart, TrendingUp, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import api from '../../utils/api';
import './BusinessHealth.css';

const BusinessHealth = () => {
    const [businessData, setBusinessData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    /**
     * Fetch business health data from the backend API
     * Retrieves real-time metrics including:
     * - Daily revenue and transaction counts
     * - GMV and average transaction values
     * - Revenue trends, top selling devices, payment method distribution
     * - Recent transactions across all tenants
     */
    const fetchBusinessHealth = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/superadmin/business_health.php');

            if (response.data.success) {
                const data = response.data.data;

                // Transform API response to match component expectations
                const transformedData = {
                    daily_revenue: data.daily_revenue || 0,
                    total_transactions: data.total_transactions || 0,
                    gmv: data.gmv || 0,
                    avg_transaction_value: data.avg_transaction_value || 0,
                    revenue_trend: data.revenue_trend || 0,
                    transaction_trend: data.transaction_trend || 0,
                    charts: {
                        revenue_trend: data.charts?.revenue_trend || { data: [], labels: [] },
                        top_devices: data.charts?.top_devices || { data: [], labels: [] },
                        payment_methods: data.charts?.payment_methods || { data: [], labels: [] }
                    },
                    recent_transactions: data.recent_transactions || []
                };

                setBusinessData(transformedData);
                setIsConnected(true);
                setLastUpdated(data.last_updated || new Date().toISOString());
            } else {
                throw new Error(response.data.error || 'Failed to fetch business health data');
            }
        } catch (err) {
            console.error('Failed to fetch business health:', err);
            setError(err.message || 'Failed to load business health data');
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and auto-refresh every 60 seconds
    useEffect(() => {
        fetchBusinessHealth();

        // Refresh every 60 seconds for real-time updates
        const interval = setInterval(fetchBusinessHealth, 60000);
        return () => clearInterval(interval);
    }, []);

    // Table columns configuration
    const transactionColumns = [
        {
            key: 'tenant',
            label: 'Tenant',
            sortable: true
        },
        {
            key: 'device',
            label: 'Device',
            sortable: true
        },
        {
            key: 'amount',
            label: 'Amount',
            sortable: true,
            render: (val) => `₦${val.toFixed(2)}`
        },
        {
            key: 'payment_method',
            label: 'Payment Method',
            sortable: true,
            render: (val) => (
                <span className={`payment-badge payment-${val.toLowerCase().replace(' ', '-')}`}>
                    {val}
                </span>
            )
        },
        {
            key: 'timestamp',
            label: 'Time',
            sortable: true,
            render: (val) => new Date(val).toLocaleTimeString()
        }
    ];

    return (
        <SuperAdminLayout
            title="Business Health"
            subtitle="Monitor revenue, transactions, and business metrics"
            loading={loading}
            headerActions={
                <button
                    className="refresh-btn"
                    onClick={fetchBusinessHealth}
                    disabled={loading}
                    title="Refresh data"
                >
                    <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                </button>
            }
        >
            <ConnectionIndicator isConnected={isConnected} />

            {/* Error State */}
            {error && !businessData && (
                <div className="error-state glass-card">
                    <AlertCircle size={48} />
                    <h3>Failed to Load Business Health Data</h3>
                    <p>{error}</p>
                    <button className="retry-btn" onClick={fetchBusinessHealth}>
                        <RefreshCw size={16} />
                        Retry
                    </button>
                </div>
            )}

            {businessData && (
                <>
                    {/* Last Updated Indicator */}
                    {lastUpdated && (
                        <div className="last-updated">
                            Last updated: {new Date(lastUpdated).toLocaleString()}
                        </div>
                    )}

                    {/* Metric Cards Grid */}
                    <div className="metrics-grid">
                        {/* Daily Revenue */}
                        <MetricCard
                            title="Daily Revenue"
                            value={`₦${businessData.daily_revenue.toLocaleString()}`}
                            icon={DollarSign}
                            trend={businessData.revenue_trend !== 0 ? `${businessData.revenue_trend > 0 ? '+' : ''}${businessData.revenue_trend}%` : null}
                            trendDirection={businessData.revenue_trend >= 0 ? 'up' : 'down'}
                            subtitle="vs yesterday"
                            color="success"
                        />

                        {/* Total Transactions */}
                        <MetricCard
                            title="Total Transactions"
                            value={businessData.total_transactions.toLocaleString()}
                            icon={ShoppingCart}
                            trend={businessData.transaction_trend !== 0 ? `${businessData.transaction_trend > 0 ? '+' : ''}${businessData.transaction_trend}%` : null}
                            trendDirection={businessData.transaction_trend >= 0 ? 'up' : 'down'}
                            subtitle="today"
                            color="primary"
                        />

                        {/* GMV (Gross Merchandise Value) */}
                        <MetricCard
                            title="GMV"
                            value={`₦${businessData.gmv.toLocaleString()}`}
                            icon={TrendingUp}
                            subtitle="this month"
                            color="info"
                        />

                        {/* Average Transaction Value */}
                        <MetricCard
                            title="Avg Transaction"
                            value={`₦${businessData.avg_transaction_value.toFixed(2)}`}
                            icon={CreditCard}
                            subtitle="per transaction"
                            color="warning"
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="charts-section">
                        {/* Revenue Trend */}
                        <div className="chart-full-width">
                            <LineChart
                                data={businessData.charts.revenue_trend.data}
                                labels={businessData.charts.revenue_trend.labels}
                                title="Revenue Trend (Last 12 Months)"
                                height={300}
                            />
                        </div>

                        <div className="charts-grid mt-24">
                            {/* Top Selling Devices */}
                            <BarChart
                                data={businessData.charts.top_devices.data}
                                labels={businessData.charts.top_devices.labels}
                                title="Top Selling Devices"
                                height={300}
                            />

                            {/* Payment Method Breakdown */}
                            <PieChart
                                data={businessData.charts.payment_methods.data}
                                labels={businessData.charts.payment_methods.labels}
                                title="Payment Method Distribution"
                                height={300}
                            />
                        </div>
                    </div>

                    {/* Recent Transactions Table */}
                    <div className="transactions-table-section glass-card">
                        <h3>Recent Transactions</h3>
                        <DataTable
                            columns={transactionColumns}
                            data={businessData.recent_transactions}
                            pageSize={10}
                        />
                    </div>
                </>
            )}
        </SuperAdminLayout>
    );
};

export default BusinessHealth;

