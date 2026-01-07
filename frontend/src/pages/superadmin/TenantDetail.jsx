import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, BarChart } from '../../components/Charts';
import ConnectionIndicator from '../../components/ConnectionIndicator';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import { ArrowLeft } from 'lucide-react';
import './TenantDetail.css';

const TenantDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [isConnected, setIsConnected] = useState(false);

    // Fetch tenant detail
    useEffect(() => {
        const fetchTenantDetail = async () => {
            try {
                setLoading(true);

                // Mock data for now
                const mockTenant = {
                    id: parseInt(id),
                    name: 'Tech Store Alpha',
                    email: 'admin@techstore-alpha.com',
                    phone: '+1 (555) 123-4567',
                    address: '123 Main St, City, State 12345',
                    status: 'active',
                    subscription_plan: 'pro',
                    mrr: 299,
                    health_score: 95,
                    created_at: '2025-01-15T10:30:00Z',
                    trial_ends_at: null,
                    last_login: '2026-01-03T08:15:00Z',
                    user_count: 12,
                    inventory_count: 450,
                    total_sales: 125000,
                    // Usage data
                    usage: {
                        api_calls_today: 1250,
                        api_calls_month: 35000,
                        storage_used_mb: 245,
                        storage_limit_mb: 1000,
                        features_used: ['inventory', 'pos', 'marketplace', 'reports'],
                        chart_data: {
                            api_calls: [800, 950, 1100, 1050, 1200, 1150, 1250],
                            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                        }
                    },
                    // Activity data
                    activity: [
                        {
                            id: 1,
                            action: 'User login',
                            user: 'admin@techstore-alpha.com',
                            timestamp: '2026-01-03T08:15:00Z',
                            details: 'Successful login from 192.168.1.1'
                        },
                        {
                            id: 2,
                            action: 'Inventory updated',
                            user: 'staff@techstore-alpha.com',
                            timestamp: '2026-01-03T07:30:00Z',
                            details: 'Added 50 new items'
                        },
                        {
                            id: 3,
                            action: 'Sale completed',
                            user: 'cashier@techstore-alpha.com',
                            timestamp: '2026-01-03T06:45:00Z',
                            details: 'Transaction #12345 - ₦450.00'
                        },
                        {
                            id: 4,
                            action: 'Report generated',
                            user: 'admin@techstore-alpha.com',
                            timestamp: '2026-01-02T18:00:00Z',
                            details: 'Monthly financial report'
                        },
                        {
                            id: 5,
                            action: 'Marketplace listing created',
                            user: 'seller@techstore-alpha.com',
                            timestamp: '2026-01-02T15:30:00Z',
                            details: 'iPhone 13 Pro - ₦899'
                        }
                    ],
                    // Health score breakdown
                    health_breakdown: {
                        engagement: 38,
                        value: 28,
                        data_quality: 19,
                        support: 10,
                        chart_data: {
                            scores: [38, 28, 19, 10],
                            labels: ['Engagement', 'Value', 'Data Quality', 'Support']
                        }
                    }
                };

                setTenant(mockTenant);
                setIsConnected(true);
            } catch (error) {
                console.error('Failed to fetch tenant detail:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTenantDetail();
    }, [id]);

    const headerActions = tenant ? (
        <div className="header-actions">
            <span className={`status-badge status-${tenant.status}`}>
                {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
            </span>
            <span className={`plan-badge plan-${tenant.subscription_plan}`}>
                {tenant.subscription_plan.charAt(0).toUpperCase() + tenant.subscription_plan.slice(1)}
            </span>
        </div>
    ) : null;

    return (
        <SuperAdminLayout
            title={tenant?.name || 'Loading Shop...'}
            subtitle={tenant?.email || ''}
            loading={loading}
            headerActions={headerActions}
        >
            <ConnectionIndicator isConnected={isConnected} />

            {tenant && (
                <>
                    <button onClick={() => navigate('/superadmin/tenants')} className="back-button mb-16" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>
                        <ArrowLeft size={18} />
                        Back to Tenants
                    </button>

                    {/* Tab Navigation */}
                    <div className="tabs-navigation mb-24">
                        <button
                            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'usage' ? 'active' : ''}`}
                            onClick={() => setActiveTab('usage')}
                        >
                            Usage
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            Activity
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'health' ? 'active' : ''}`}
                            onClick={() => setActiveTab('health')}
                        >
                            Health Score
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="tab-panel">
                                <div className="overview-grid">
                                    {/* Account Info */}
                                    <div className="info-section glass-card">
                                        <h3>Account Information</h3>
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <span className="info-label">Email</span>
                                                <span className="info-value">{tenant.email}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Phone</span>
                                                <span className="info-value">{tenant.phone}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Address</span>
                                                <span className="info-value">{tenant.address}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Created</span>
                                                <span className="info-value">
                                                    {new Date(tenant.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Last Login</span>
                                                <span className="info-value">
                                                    {new Date(tenant.last_login).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subscription Info */}
                                    <div className="info-section glass-card">
                                        <h3>Subscription Details</h3>
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <span className="info-label">Plan</span>
                                                <span className="info-value">{tenant.subscription_plan}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">MRR</span>
                                                <span className="info-value">₦{tenant.mrr}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Status</span>
                                                <span className="info-value">{tenant.status}</span>
                                            </div>
                                            {tenant.trial_ends_at && (
                                                <div className="info-item">
                                                    <span className="info-label">Trial Ends</span>
                                                    <span className="info-value">
                                                        {new Date(tenant.trial_ends_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="stats-section glass-card">
                                        <h3>Statistics</h3>
                                        <div className="stats-grid">
                                            <div className="stat-item">
                                                <span className="stat-label">Users</span>
                                                <span className="stat-value">{tenant.user_count}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Inventory Items</span>
                                                <span className="stat-value">{tenant.inventory_count}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Total Sales</span>
                                                <span className="stat-value">₦{tenant.total_sales.toLocaleString()}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Health Score</span>
                                                <span className="stat-value" style={{
                                                    color: tenant.health_score >= 70 ? 'var(--success)' : 'var(--error)'
                                                }}>
                                                    {tenant.health_score}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Usage Tab */}
                        {activeTab === 'usage' && (
                            <div className="tab-panel">
                                <div className="usage-grid">
                                    {/* API Usage */}
                                    <div className="usage-section glass-card">
                                        <h3>API Usage</h3>
                                        <div className="usage-stats">
                                            <div className="usage-stat">
                                                <span className="usage-label">Today</span>
                                                <span className="usage-value">{tenant.usage.api_calls_today.toLocaleString()}</span>
                                            </div>
                                            <div className="usage-stat">
                                                <span className="usage-label">This Month</span>
                                                <span className="usage-value">{tenant.usage.api_calls_month.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <LineChart
                                            data={tenant.usage.chart_data.api_calls}
                                            labels={tenant.usage.chart_data.labels}
                                            title="API Calls (Last 7 Days)"
                                            height={250}
                                        />
                                    </div>

                                    {/* Storage Usage */}
                                    <div className="usage-section glass-card">
                                        <h3>Storage Usage</h3>
                                        <div className="storage-info">
                                            <div className="storage-stat">
                                                <span>{tenant.usage.storage_used_mb} MB</span>
                                                <span className="storage-label">of {tenant.usage.storage_limit_mb} MB used</span>
                                            </div>
                                            <div className="storage-bar">
                                                <div
                                                    className="storage-fill"
                                                    style={{
                                                        width: `${(tenant.usage.storage_used_mb / tenant.usage.storage_limit_mb) * 100}%`
                                                    }}
                                                />
                                            </div>
                                            <span className="storage-percentage">
                                                {((tenant.usage.storage_used_mb / tenant.usage.storage_limit_mb) * 100).toFixed(1)}% used
                                            </span>
                                        </div>
                                    </div>

                                    {/* Features Used */}
                                    <div className="usage-section glass-card">
                                        <h3>Features Used</h3>
                                        <div className="features-list">
                                            {tenant.usage.features_used.map((feature, index) => (
                                                <div key={index} className="feature-item">
                                                    <span className="feature-icon">✓</span>
                                                    <span className="feature-name">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Activity Tab */}
                        {activeTab === 'activity' && (
                            <div className="tab-panel">
                                <div className="activity-section glass-card">
                                    <h3>Recent Activity</h3>
                                    <div className="activity-timeline">
                                        {tenant.activity.map((item) => (
                                            <div key={item.id} className="activity-item">
                                                <div className="activity-dot" />
                                                <div className="activity-content">
                                                    <div className="activity-header">
                                                        <strong>{item.action}</strong>
                                                        <span className="activity-time">
                                                            {new Date(item.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="activity-details">
                                                        <span className="activity-user">{item.user}</span>
                                                        <span className="activity-description">{item.details}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Health Score Tab */}
                        {activeTab === 'health' && (
                            <div className="tab-panel">
                                <div className="health-grid">
                                    {/* Overall Score */}
                                    <div className="health-section glass-card">
                                        <h3>Overall Health Score</h3>
                                        <div className="health-score-display">
                                            <div className="health-score-circle" style={{
                                                background: tenant.health_score >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                                            }}>
                                                <div className="health-score-inner">
                                                    <span className="health-score-value">{tenant.health_score}</span>
                                                    <span className="health-score-label">/ 100</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Score Breakdown */}
                                    <div className="health-section glass-card">
                                        <h3>Score Breakdown</h3>
                                        <BarChart
                                            data={tenant.health_breakdown.chart_data.scores}
                                            labels={tenant.health_breakdown.chart_data.labels}
                                            title="Health Pillars"
                                            height={300}
                                        />
                                    </div>

                                    {/* Score Details */}
                                    <div className="health-section glass-card">
                                        <h3>Score Details</h3>
                                        <div className="health-details">
                                            <div className="health-detail-item">
                                                <span className="health-detail-label">Engagement</span>
                                                <span className="health-detail-value">{tenant.health_breakdown.engagement} / 40</span>
                                            </div>
                                            <div className="health-detail-item">
                                                <span className="health-detail-label">Value</span>
                                                <span className="health-detail-value">{tenant.health_breakdown.value} / 30</span>
                                            </div>
                                            <div className="health-detail-item">
                                                <span className="health-detail-label">Data Quality</span>
                                                <span className="health-detail-value">{tenant.health_breakdown.data_quality} / 20</span>
                                            </div>
                                            <div className="health-detail-item">
                                                <span className="health-detail-label">Support</span>
                                                <span className="health-detail-value">{tenant.health_breakdown.support} / 10</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </SuperAdminLayout>
    );
};

export default TenantDetail;

