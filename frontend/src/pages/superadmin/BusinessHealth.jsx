import React, { useState, useEffect } from 'react';
import MetricCard from '../../components/MetricCard';
import { LineChart, BarChart, PieChart } from '../../components/Charts';
import DataTable from '../../components/Tables/DataTable';
import ConnectionIndicator from '../../components/ConnectionIndicator';
import { DollarSign, ShoppingCart, TrendingUp, CreditCard } from 'lucide-react';
import './BusinessHealth.css';

const BusinessHealth = () => {
    const [businessData, setBusinessData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    // Fetch business health data
    useEffect(() => {
        const fetchBusinessHealth = async () => {
            try {
                setLoading(true);

                // TODO: Replace with actual API call
                // const response = await axios.get('/api/superadmin/business_health');
                // setBusinessData(response.data);

                // Mock data for now
                const mockData = {
                    daily_revenue: 12345,
                    total_transactions: 456,
                    gmv: 125000,
                    avg_transaction_value: 27.08,
                    charts: {
                        revenue_trend: {
                            data: [8500, 9200, 10100, 9800, 11200, 10500, 11800, 12100, 11500, 12800, 11900, 12345],
                            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                        },
                        top_devices: {
                            data: [450, 380, 320, 280, 220, 180, 150],
                            labels: ['iPhone 13', 'Samsung S21', 'iPhone 12', 'Pixel 6', 'OnePlus 9', 'Xiaomi Mi 11', 'Others']
                        },
                        payment_methods: {
                            data: [45, 30, 15, 10],
                            labels: ['Credit Card', 'Cash', 'Mobile Payment', 'Bank Transfer']
                        }
                    },
                    recent_transactions: [
                        {
                            id: 1,
                            tenant: 'Tech Store Alpha',
                            amount: 899.99,
                            device: 'iPhone 13 Pro',
                            payment_method: 'Credit Card',
                            timestamp: '2026-01-03T11:45:00Z'
                        },
                        {
                            id: 2,
                            tenant: 'Phone Hub Beta',
                            amount: 649.99,
                            device: 'Samsung Galaxy S21',
                            payment_method: 'Cash',
                            timestamp: '2026-01-03T11:30:00Z'
                        },
                        {
                            id: 3,
                            tenant: 'Mobile World Gamma',
                            amount: 499.99,
                            device: 'Google Pixel 6',
                            payment_method: 'Mobile Payment',
                            timestamp: '2026-01-03T11:15:00Z'
                        },
                        {
                            id: 4,
                            tenant: 'Device Shop Delta',
                            amount: 799.99,
                            device: 'iPhone 12',
                            payment_method: 'Credit Card',
                            timestamp: '2026-01-03T11:00:00Z'
                        },
                        {
                            id: 5,
                            tenant: 'Gadget Store Epsilon',
                            amount: 549.99,
                            device: 'OnePlus 9 Pro',
                            payment_method: 'Bank Transfer',
                            timestamp: '2026-01-03T10:45:00Z'
                        },
                        {
                            id: 6,
                            tenant: 'Smart Phones Zeta',
                            amount: 699.99,
                            device: 'Xiaomi Mi 11',
                            payment_method: 'Credit Card',
                            timestamp: '2026-01-03T10:30:00Z'
                        },
                        {
                            id: 7,
                            tenant: 'Tech Retail Eta',
                            amount: 449.99,
                            device: 'Samsung A52',
                            payment_method: 'Cash',
                            timestamp: '2026-01-03T10:15:00Z'
                        },
                        {
                            id: 8,
                            tenant: 'Mobile Plus Theta',
                            amount: 999.99,
                            device: 'iPhone 13 Pro Max',
                            payment_method: 'Credit Card',
                            timestamp: '2026-01-03T10:00:00Z'
                        }
                    ]
                };

                setBusinessData(mockData);
                setIsConnected(true);
            } catch (error) {
                console.error('Failed to fetch business health:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBusinessHealth();

        // Refresh every 60 seconds
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
            render: (val) => `$${val.toFixed(2)}`
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

    // Loading state
    if (loading) {
        return (
            <div className="main-content">
                <div className="container">
                    <div className="loading-state">
                        <div>Loading business health...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <ConnectionIndicator isConnected={isConnected} />

            <div className="container">
                {/* Page Header */}
                <div className="page-header">
                    <div>
                        <h1>Business Health</h1>
                        <p className="page-subtitle">Monitor revenue, transactions, and business metrics</p>
                    </div>
                </div>

                {/* Metric Cards Grid */}
                <div className="metrics-grid">
                    {/* Daily Revenue */}
                    <MetricCard
                        title="Daily Revenue"
                        value={`$${businessData.daily_revenue.toLocaleString()}`}
                        icon={DollarSign}
                        trend="+8%"
                        trendDirection="up"
                        subtitle="vs yesterday"
                        color="success"
                    />

                    {/* Total Transactions */}
                    <MetricCard
                        title="Total Transactions"
                        value={businessData.total_transactions.toLocaleString()}
                        icon={ShoppingCart}
                        trend="+12%"
                        trendDirection="up"
                        subtitle="today"
                        color="primary"
                    />

                    {/* GMV (Gross Merchandise Value) */}
                    <MetricCard
                        title="GMV"
                        value={`$${businessData.gmv.toLocaleString()}`}
                        icon={TrendingUp}
                        subtitle="gross merchandise value"
                        color="info"
                    />

                    {/* Average Transaction Value */}
                    <MetricCard
                        title="Avg Transaction"
                        value={`$${businessData.avg_transaction_value.toFixed(2)}`}
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

                    <div className="charts-grid">
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
            </div>
        </div>
    );
};

export default BusinessHealth;
