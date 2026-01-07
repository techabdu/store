import { useState, useEffect } from 'react';
import {
    Activity, Database, Cpu, Zap,
    AlertTriangle, CheckCircle, BarChart2, Server, Users
} from 'lucide-react';
import api from '../../../utils/api';
import SkeletonLoader from './SkeletonLoader';
import './HealthTab.css';

const HealthTab = ({ tenantId }) => {
    const [resources, setResources] = useState(null);
    const [performance, setPerformance] = useState(null);
    const [healthScore, setHealthScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (tenantId) {
            fetchHealthData();
        }
    }, [tenantId]);

    const fetchHealthData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [resResponse, perfResponse, scoreResponse] = await Promise.all([
                api.get(`/superadmin/tenant_health.php?action=resources&tenant_id=${tenantId}`),
                api.get(`/superadmin/tenant_health.php?action=performance&tenant_id=${tenantId}`),
                api.get(`/superadmin/tenant_health.php?action=health_score&tenant_id=${tenantId}`)
            ]);

            if (resResponse.data.success) setResources(resResponse.data.resources);
            if (perfResponse.data.success) setPerformance(resResponse.data.performance);
            if (scoreResponse.data.success) setHealthScore(scoreResponse.data);

        } catch (err) {
            console.error('Error fetching health data:', err);
            setError(err.response?.data?.error || 'Failed to load system health data');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'score-green';
        if (score >= 60) return 'score-yellow';
        return 'score-red';
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Critical';
    };

    if (loading) {
        return (
            <div className="health-tab skeleton-mode">
                <SkeletonLoader type="card" />
                <div className="health-grids" style={{ marginTop: '2rem' }}>
                    <SkeletonLoader type="stats" />
                    <SkeletonLoader type="card" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-state">
                <AlertTriangle size={48} />
                <h3>Health Check Failed</h3>
                <p>{error}</p>
                <button onClick={fetchHealthData} className="btn-retry">Try Again</button>
            </div>
        );
    }

    return (
        <div className="health-tab">
            {/* Health Score Overview */}
            <div className="health-overview-card">
                <div className="score-gauge-container">
                    <div className={`score-gauge ${getScoreColor(healthScore?.score)}`}>
                        <div className="score-value">{healthScore?.score || 0}</div>
                        <div className="score-label">{getScoreLabel(healthScore?.score)}</div>
                    </div>
                    <div className="score-details">
                        <h3>System Health Score</h3>
                        <p>Aggregated metric based on performance, errors, and resource usage.</p>
                        <div className="score-breakdown">
                            {healthScore?.breakdown?.map((item, index) => (
                                <div key={index} className="breakdown-item">
                                    <span className="item-label">{item.category}</span>
                                    <div className="item-bar-bg">
                                        <div
                                            className={`item-bar-fill ${getScoreColor(item.score)}`}
                                            style={{ width: `${item.score}%` }}
                                        ></div>
                                    </div>
                                    <span className="item-score">{item.score}/100</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="health-grids">
                {/* Resource Consumption */}
                <div className="health-section">
                    <h3 className="section-title"><Database size={20} /> Resource Usage</h3>
                    <div className="resource-grid">
                        <div className="resource-card">
                            <div className="resource-info">
                                <label>Database Size</label>
                                <span>{resources?.database_size || '0 MB'}</span>
                            </div>
                            <Server size={24} className="resource-icon" />
                        </div>
                        <div className="resource-card">
                            <div className="resource-info">
                                <label>Storage Used</label>
                                <span>{resources?.storage_used || '0 MB'} / {resources?.storage_limit || '1 GB'}</span>
                            </div>
                            <Database size={24} className="resource-icon" />
                        </div>
                        <div className="resource-card">
                            <div className="resource-info">
                                <label>API Calls (24h)</label>
                                <span>{resources?.api_calls_24h || 0}</span>
                            </div>
                            <Zap size={24} className="resource-icon" />
                        </div>
                        <div className="resource-card">
                            <div className="resource-info">
                                <label>Active Sessions</label>
                                <span>{resources?.active_sessions || 0}</span>
                            </div>
                            <Users size={24} className="resource-icon" />
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="health-section">
                    <h3 className="section-title"><Activity size={20} /> Performance</h3>
                    <div className="performance-list">
                        <div className="perf-item">
                            <div className="perf-label">
                                <span>Avg Response Time</span>
                                <span className="perf-value">{performance?.avg_response_time || 0}ms</span>
                            </div>
                            <div className="perf-bar-bg">
                                <div
                                    className="perf-bar-fill"
                                    style={{ width: `${Math.min((performance?.avg_response_time / 1000) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="perf-item">
                            <div className="perf-label">
                                <span>Error Rate</span>
                                <span className={`perf-value ${performance?.error_rate > 5 ? 'text-red' : ''}`}>
                                    {performance?.error_rate || 0}%
                                </span>
                            </div>
                            <div className="perf-bar-bg">
                                <div
                                    className={`perf-bar-fill ${performance?.error_rate > 5 ? 'bg-red' : ''}`}
                                    style={{ width: `${performance?.error_rate || 0}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="perf-item">
                            <div className="perf-label">
                                <span>Uptime (30d)</span>
                                <span className="perf-value">{performance?.uptime || '100%'}</span>
                            </div>
                            <div className="perf-bar-bg">
                                <div
                                    className="perf-bar-fill bg-green"
                                    style={{ width: `${parseFloat(performance?.uptime) || 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Health Recommendations */}
            {healthScore?.recommendations?.length > 0 && (
                <div className="recommendations-section">
                    <h3 className="section-title"><AlertTriangle size={20} /> Recommendations</h3>
                    <div className="recommendations-list">
                        {healthScore.recommendations.map((rec, index) => (
                            <div key={index} className={`recommendation-card ${rec.priority}`}>
                                <div className="rec-icon">
                                    {rec.priority === 'high' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                                </div>
                                <div className="rec-content">
                                    <h4>{rec.title}</h4>
                                    <p>{rec.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthTab;
