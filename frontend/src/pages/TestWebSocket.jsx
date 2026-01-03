import React from 'react';
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts';
import { useRealtimeMetrics } from '../hooks/useRealtimeMetrics';
import ConnectionIndicator from '../components/ConnectionIndicator';

const TestWebSocket = () => {
    const { alerts, isConnected: isAlertsConnected } = useRealtimeAlerts();
    const { metrics, isConnected: isMetricsConnected } = useRealtimeMetrics();

    // Determine overall connection status (if any are connected, we are good primarily, but let's just pick one)
    const isConnected = isAlertsConnected || isMetricsConnected;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <ConnectionIndicator isConnected={isConnected} />

            <h1 className="text-3xl font-bold mb-8">WebSocket Integration Test</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Alerts Section */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        Realtime Alerts
                    </h2>

                    {alerts.length === 0 ? (
                        <p className="text-gray-400 italic">No alerts received yet...</p>
                    ) : (
                        <ul className="space-y-3">
                            {alerts.map((alert, index) => (
                                <li key={alert.id || index} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <div className="font-bold text-red-400">{alert.type || 'Alert'}</div>
                                    <div className="text-sm text-gray-300">{alert.message}</div>
                                    <div className="text-xs text-gray-500 mt-1">{new Date(alert.created_at).toLocaleString()}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Metrics Section */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        Realtime Metrics
                    </h2>

                    {!metrics ? (
                        <p className="text-gray-400 italic">Waiting for metrics update...</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-700/50 rounded-lg">
                                <div className="text-gray-400 text-sm">Active Users (5m)</div>
                                <div className="text-2xl font-bold text-blue-400">{metrics.active_users_5min}</div>
                            </div>
                            <div className="p-4 bg-gray-700/50 rounded-lg">
                                <div className="text-gray-400 text-sm">Transactions (1m)</div>
                                <div className="text-2xl font-bold text-green-400">{metrics.transactions_last_min}</div>
                            </div>
                            <div className="text-xs text-right text-gray-500">
                                Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 text-center text-gray-500 text-sm">
                If connection is working, 'Live' indicator should appear top-right.
                Alerts and Metrics should update automatically.
            </div>
        </div>
    );
};

export default TestWebSocket;
