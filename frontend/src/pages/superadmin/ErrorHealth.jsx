import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import MetricCard from '../../components/MetricCard';
import { LineChart, BarChart, PieChart } from '../../components/Charts';
import DataTable from '../../components/Tables/DataTable';
import ErrorDetailModal from '../../components/ErrorDetailModal';
import ConnectionIndicator from '../../components/ConnectionIndicator';
import { AlertTriangle, Users, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import './ErrorHealth.css';

/**
 * ErrorHealth Component
 * 
 * Displays real-time error tracking metrics for SuperAdmin
 * Data sources:
 * - application_errors table for error counts and details
 * - activity_logs for error rate calculations
 * - PerformanceMonitor class for aggregated metrics
 */
const ErrorHealth = () => {
    const [errorData, setErrorData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [selectedError, setSelectedError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    /**
     * Fetch error health data from backend API
     */
    const fetchErrorHealth = async () => {
        try {
            setError(null);

            const response = await api.get('/superadmin/error_health.php');

            if (response.data.success) {
                setErrorData(response.data.data);
                setIsConnected(true);
                setLastUpdated(new Date());
            } else {
                setError(response.data.error || 'Failed to fetch error health data');
                setIsConnected(false);
            }
        } catch (err) {
            console.error('Failed to fetch error health:', err);
            setError(err.response?.data?.error || 'Unable to connect to the server');
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and auto-refresh every 30 seconds
    useEffect(() => {
        fetchErrorHealth();

        const interval = setInterval(fetchErrorHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    /**
     * Table columns configuration for recent errors
     */
    const errorColumns = [
        {
            key: 'type',
            label: 'Type',
            sortable: true,
            render: (val) => (
                <span className={`error-type-badge error-type-${(val || 'unknown').toLowerCase()}`}>
                    {val || 'Unknown'}
                </span>
            )
        },
        {
            key: 'message',
            label: 'Message',
            sortable: false,
            render: (val) => (
                <span className="error-message-preview" title={val}>
                    {val ? (val.length > 60 ? val.substring(0, 60) + '...' : val) : 'No message'}
                </span>
            )
        },
        {
            key: 'severity',
            label: 'Severity',
            sortable: true,
            render: (val) => (
                <span className={`severity-badge severity-${val || 'warning'}`}>
                    {val ? val.charAt(0).toUpperCase() + val.slice(1) : 'Unknown'}
                </span>
            )
        },
        {
            key: 'timestamp',
            label: 'Time',
            sortable: true,
            render: (val) => val ? new Date(val).toLocaleString() : 'Unknown'
        }
    ];

    /**
     * Header actions for refresh and status
     */
    const headerActions = (
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {lastUpdated && (
                <div className="last-updated text-sm text-secondary">
                    Updated: {lastUpdated.toLocaleTimeString()}
                </div>
            )}
            <button
                onClick={fetchErrorHealth}
                className="btn-secondary btn-sm"
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
            </button>
        </div>
    );

    /**
     * Error state UI
     */
    if (error && !errorData) {
        return (
            <SuperAdminLayout
                title="Error Health"
                subtitle="Monitor and track system errors"
                headerActions={headerActions}
            >
                <div className="error-container glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <AlertTriangle size={48} color="var(--error)" />
                    <h3 style={{ marginTop: '1rem' }}>Unable to Load Error Health Data</h3>
                    <p className="text-secondary">{error}</p>
                    <button onClick={fetchErrorHealth} className="btn-primary" style={{ marginTop: '1rem' }}>
                        Try Again
                    </button>
                </div>
            </SuperAdminLayout>
        );
    }

    return (
        <SuperAdminLayout
            title="Error Health"
            subtitle="Monitor and track system errors"
            loading={loading && !errorData}
            headerActions={headerActions}
        >
            <ConnectionIndicator isConnected={isConnected} />

            {errorData && (
                <>
                    {/* Metric Cards Grid */}
                    <div className="metrics-grid">
                        {/* Total Errors (24h) */}
                        <MetricCard
                            title="Total Errors (24h)"
                            value={(errorData.total_errors_24h || 0).toLocaleString()}
                            icon={AlertTriangle}
                            subtitle="in the last 24 hours"
                            color={errorData.total_errors_24h > 50 ? 'error' : 'warning'}
                        />

                        {/* Error Rate */}
                        <MetricCard
                            title="Error Rate"
                            value={`${errorData.error_rate || 0}%`}
                            icon={TrendingDown}
                            trend={errorData.error_rate < 1 ? 'Healthy' : 'Needs attention'}
                            trendDirection={errorData.error_rate < 1 ? 'down' : 'up'}
                            subtitle="of total requests"
                            color={errorData.error_rate > 5 ? 'error' : 'warning'}
                        />

                        {/* Critical Errors */}
                        <MetricCard
                            title="Critical Errors"
                            value={errorData.critical_errors || 0}
                            icon={AlertCircle}
                            subtitle="requiring immediate attention"
                            color={errorData.critical_errors > 0 ? 'error' : 'success'}
                        />

                        {/* Affected Users */}
                        <MetricCard
                            title="Affected Users"
                            value={errorData.affected_users || 0}
                            icon={Users}
                            subtitle="experienced errors today"
                            color={errorData.affected_users > 10 ? 'warning' : 'info'}
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="charts-section">
                        <div className="charts-grid">
                            {/* Error Rate Trend */}
                            {errorData.charts?.error_rate_trend && (
                                <LineChart
                                    data={errorData.charts.error_rate_trend.data}
                                    labels={errorData.charts.error_rate_trend.labels}
                                    title="Error Count Trend (Last 7 Days)"
                                    height={300}
                                />
                            )}

                            {/* Error Breakdown by Type */}
                            {errorData.charts?.error_by_type && errorData.charts.error_by_type.data.length > 0 && (
                                <PieChart
                                    data={errorData.charts.error_by_type.data}
                                    labels={errorData.charts.error_by_type.labels}
                                    title="Error Breakdown by Type"
                                    height={300}
                                />
                            )}
                        </div>

                        {/* Error by Module */}
                        {errorData.charts?.error_by_module && errorData.charts.error_by_module.data.length > 0 && (
                            <div className="chart-full-width mt-24">
                                <BarChart
                                    data={errorData.charts.error_by_module.data}
                                    labels={errorData.charts.error_by_module.labels}
                                    title="Error Breakdown by Module"
                                    height={300}
                                />
                            </div>
                        )}
                    </div>

                    {/* Recent Errors Table */}
                    <div className="errors-table-section glass-card">
                        <h3>Recent Errors</h3>
                        {errorData.recent_errors && errorData.recent_errors.length > 0 ? (
                            <DataTable
                                columns={errorColumns}
                                data={errorData.recent_errors}
                                pageSize={10}
                                onRowClick={(error) => setSelectedError(error)}
                            />
                        ) : (
                            <div className="no-errors-message" style={{ textAlign: 'center', padding: '2rem' }}>
                                <AlertCircle size={32} color="var(--success)" />
                                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                                    No errors recorded in the last 48 hours. System is running smoothly!
                                </p>
                            </div>
                        )}
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
