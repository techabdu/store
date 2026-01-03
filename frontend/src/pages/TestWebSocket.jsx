import React from 'react';
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts';
import { useRealtimeMetrics } from '../hooks/useRealtimeMetrics';
import ConnectionIndicator from '../components/ConnectionIndicator';
import SuperAdminLayout from '../components/superadmin/SuperAdminLayout';

const TestWebSocket = () => {
    const { alerts, isConnected: isAlertsConnected } = useRealtimeAlerts();
    const { metrics, isConnected: isMetricsConnected } = useRealtimeMetrics();

    // Determine overall connection status
    const isConnected = isAlertsConnected || isMetricsConnected;

    return (
        <SuperAdminLayout
            title="WebSocket Integration Test"
            subtitle="Testing real-time updates and notifications"
        >
            <ConnectionIndicator isConnected={isConnected} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Alerts Section */}
                <div className="dashboard-card glass-card" style={{ padding: '24px' }}>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                        <span className="w-3 h-3 rounded-full bg-red-500" style={{ width: '12px', height: '12px', background: 'var(--error)', borderRadius: '50%' }}></span>
                        Realtime Alerts
                    </h2>

                    {alerts.length === 0 ? (
                        <p className="text-secondary italic">No alerts received yet...</p>
                    ) : (
                        <ul className="space-y-3" style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {alerts.map((alert, index) => (
                                <li key={alert.id || index} className="p-3 rounded-lg" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                                    <div className="font-bold text-red-400" style={{ fontWeight: '700', color: 'var(--error)' }}>{alert.type || 'Alert'}</div>
                                    <div className="text-sm text-secondary" style={{ fontSize: '0.875rem' }}>{alert.message}</div>
                                    <div className="text-xs text-secondary mt-1" style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.7 }}>{new Date(alert.created_at).toLocaleString()}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Metrics Section */}
                <div className="dashboard-card glass-card" style={{ padding: '24px' }}>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                        <span className="w-3 h-3 rounded-full bg-blue-500" style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '50%' }}></span>
                        Realtime Metrics
                    </h2>

                    {!metrics ? (
                        <p className="text-secondary italic">Waiting for metrics update...</p>
                    ) : (
                        <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="p-4 rounded-lg" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                                <div className="text-secondary text-sm" style={{ fontSize: '0.875rem' }}>Active Users (5m)</div>
                                <div className="text-2xl font-bold" style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>{metrics.active_users_5min}</div>
                            </div>
                            <div className="p-4 rounded-lg" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                                <div className="text-secondary text-sm" style={{ fontSize: '0.875rem' }}>Transactions (1m)</div>
                                <div className="text-2xl font-bold" style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>{metrics.transactions_last_min}</div>
                            </div>
                            <div className="text-xs text-secondary" style={{ fontSize: '0.75rem', textAlign: 'right', opacity: 0.7 }}>
                                Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 text-center text-secondary text-sm" style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.7 }}>
                If connection is working, 'Live' indicator should appear top-right.
                Alerts and Metrics should update automatically.
            </div>
        </SuperAdminLayout>
    );
};

export default TestWebSocket;

