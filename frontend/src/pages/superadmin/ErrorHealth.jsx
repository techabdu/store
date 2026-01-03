import React, { useState, useEffect } from 'react';
import MetricCard from '../../components/MetricCard';
import { LineChart, BarChart, PieChart } from '../../components/Charts';
import DataTable from '../../components/Tables/DataTable';
import ErrorDetailModal from '../../components/ErrorDetailModal';
import ConnectionIndicator from '../../components/ConnectionIndicator';
import { AlertTriangle, Users, TrendingDown, AlertCircle } from 'lucide-react';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import './ErrorHealth.css';

const ErrorHealth = () => {
    const [errorData, setErrorData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [selectedError, setSelectedError] = useState(null);

    // Fetch error health data
    useEffect(() => {
        const fetchErrorHealth = async () => {
            try {
                setLoading(true);

                // Mock data for now
                const mockData = {
                    total_errors_24h: 127,
                    error_rate: 0.8,
                    critical_errors: 12,
                    affected_users: 45,
                    charts: {
                        error_rate_trend: {
                            data: [2.1, 1.8, 1.5, 1.2, 1.0, 0.9, 0.8],
                            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                        },
                        error_by_type: {
                            data: [45, 32, 25, 15, 10],
                            labels: ['Database', 'API', 'Authentication', 'Validation', 'Other']
                        },
                        error_by_module: {
                            data: [38, 28, 22, 18, 12, 9],
                            labels: ['Inventory', 'Sales', 'Auth', 'Reports', 'Marketplace', 'Other']
                        }
                    },
                    recent_errors: [
                        {
                            id: 1,
                            type: 'Database',
                            message: 'Connection timeout to database server',
                            severity: 'critical',
                            file: '/backend/api/inventory/get.php',
                            line: 45,
                            timestamp: '2026-01-03T11:30:00Z',
                            user: 'admin@techstore.com',
                            stack_trace: `Error: Connection timeout
  at Database.connect (/backend/config/database.php:23)
  at InventoryAPI.get (/backend/api/inventory/get.php:45)
  at Router.handle (/backend/router.php:12)`,
                            context: {
                                query: 'SELECT * FROM inventory WHERE tenant_id = ?',
                                params: [123],
                                timeout: 5000
                            }
                        },
                        {
                            id: 2,
                            type: 'API',
                            message: 'External API rate limit exceeded',
                            severity: 'warning',
                            file: '/backend/api/marketplace/sync.php',
                            line: 78,
                            timestamp: '2026-01-03T11:15:00Z',
                            user: 'system',
                            stack_trace: `Error: Rate limit exceeded
  at ExternalAPI.call (/backend/utils/api.php:56)
  at MarketplaceSync.sync (/backend/api/marketplace/sync.php:78)`,
                            context: {
                                endpoint: 'https://api.example.com/products',
                                rate_limit: 100,
                                current_usage: 105
                            }
                        },
                        {
                            id: 3,
                            type: 'Authentication',
                            message: 'Invalid JWT token signature',
                            severity: 'warning',
                            file: '/backend/middleware/auth.php',
                            line: 34,
                            timestamp: '2026-01-03T11:00:00Z',
                            user: 'unknown@example.com',
                            stack_trace: `Error: Invalid signature
  at JWT.verify (/backend/utils/jwt.php:89)
  at AuthMiddleware.check (/backend/middleware/auth.php:34)`,
                            context: {
                                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                                ip_address: '192.168.1.100'
                            }
                        },
                        {
                            id: 4,
                            type: 'Validation',
                            message: 'Invalid email format in user registration',
                            severity: 'warning',
                            file: '/backend/api/auth/register.php',
                            line: 67,
                            timestamp: '2026-01-03T10:45:00Z',
                            user: 'system',
                            stack_trace: `Error: Validation failed
  at Validator.email (/backend/utils/validator.php:23)
  at AuthAPI.register (/backend/api/auth/register.php:67)`,
                            context: {
                                input: 'invalid-email',
                                field: 'email'
                            }
                        },
                        {
                            id: 5,
                            type: 'Database',
                            message: 'Duplicate entry for unique key',
                            severity: 'warning',
                            file: '/backend/api/inventory/create.php',
                            line: 92,
                            timestamp: '2026-01-03T10:30:00Z',
                            user: 'staff@shop.com',
                            stack_trace: `Error: Duplicate entry
  at Database.insert (/backend/config/database.php:145)
  at InventoryAPI.create (/backend/api/inventory/create.php:92)`,
                            context: {
                                table: 'inventory',
                                key: 'sku',
                                value: 'PHONE-123'
                            }
                        }
                    ]
                };

                setErrorData(mockData);
                setIsConnected(true);
            } catch (error) {
                console.error('Failed to fetch error health:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchErrorHealth();

        // Refresh every 30 seconds
        const interval = setInterval(fetchErrorHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    // Table columns configuration
    const errorColumns = [
        {
            key: 'type',
            label: 'Type',
            sortable: true,
            render: (val) => (
                <span className={`error-type-badge error-type-${val.toLowerCase()}`}>
                    {val}
                </span>
            )
        },
        {
            key: 'message',
            label: 'Message',
            sortable: false,
            render: (val) => (
                <span className="error-message-preview">{val}</span>
            )
        },
        {
            key: 'severity',
            label: 'Severity',
            sortable: true,
            render: (val) => (
                <span className={`severity-badge severity-${val}`}>
                    {val.charAt(0).toUpperCase() + val.slice(1)}
                </span>
            )
        },
        {
            key: 'timestamp',
            label: 'Time',
            sortable: true,
            render: (val) => new Date(val).toLocaleString()
        }
    ];

    return (
        <SuperAdminLayout
            title="Error Health"
            subtitle="Monitor and track system errors"
            loading={loading}
        >
            <ConnectionIndicator isConnected={isConnected} />

            {errorData && (
                <>
                    {/* Metric Cards Grid */}
                    <div className="metrics-grid">
                        {/* Total Errors (24h) */}
                        <MetricCard
                            title="Total Errors (24h)"
                            value={errorData.total_errors_24h.toLocaleString()}
                            icon={AlertTriangle}
                            subtitle="in the last 24 hours"
                            color="error"
                        />

                        {/* Error Rate */}
                        <MetricCard
                            title="Error Rate"
                            value={`${errorData.error_rate}%`}
                            icon={TrendingDown}
                            trend="-0.2%"
                            trendDirection="down"
                            subtitle="vs yesterday"
                            color="warning"
                        />

                        {/* Critical Errors */}
                        <MetricCard
                            title="Critical Errors"
                            value={errorData.critical_errors}
                            icon={AlertCircle}
                            subtitle="requiring immediate attention"
                            color="error"
                        />

                        {/* Affected Users */}
                        <MetricCard
                            title="Affected Users"
                            value={errorData.affected_users}
                            icon={Users}
                            subtitle="experienced errors today"
                            color="warning"
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="charts-section">
                        <div className="charts-grid">
                            {/* Error Rate Trend */}
                            <LineChart
                                data={errorData.charts.error_rate_trend.data}
                                labels={errorData.charts.error_rate_trend.labels}
                                title="Error Rate Trend (Last 7 Days)"
                                height={300}
                            />

                            {/* Error Breakdown by Type */}
                            <PieChart
                                data={errorData.charts.error_by_type.data}
                                labels={errorData.charts.error_by_type.labels}
                                title="Error Breakdown by Type"
                                height={300}
                            />
                        </div>

                        {/* Error by Module */}
                        <div className="chart-full-width mt-24">
                            <BarChart
                                data={errorData.charts.error_by_module.data}
                                labels={errorData.charts.error_by_module.labels}
                                title="Error Breakdown by Module"
                                height={300}
                            />
                        </div>
                    </div>

                    {/* Recent Errors Table */}
                    <div className="errors-table-section glass-card">
                        <h3>Recent Errors</h3>
                        <DataTable
                            columns={errorColumns}
                            data={errorData.recent_errors}
                            pageSize={10}
                            onRowClick={(error) => setSelectedError(error)}
                        />
                    </div>
                </>
            )}

            {/* Error Detail Modal */}
            {selectedError && (
                <ErrorDetailModal
                    error={selectedError}
                    onClose={() => setSelectedError(null)}
                />
            )}
        </SuperAdminLayout>
    );
};

export default ErrorHealth;

