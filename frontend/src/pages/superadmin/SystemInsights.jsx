import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaDatabase, FaServer, FaTachometerAlt, FaClipboardList, FaBug, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../utils/api';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import SecurityTab from '../../components/superadmin/insights/SecurityTab';
import DatabaseTab from '../../components/superadmin/insights/DatabaseTab';
import ResourcesTab from '../../components/superadmin/insights/ResourcesTab';
import PerformanceTab from '../../components/superadmin/insights/PerformanceTab';
import AuditTab from '../../components/superadmin/insights/AuditTab';
import VulnerabilitiesTab from '../../components/superadmin/insights/VulnerabilitiesTab';
import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css';
import './SystemInsights.css';

const SystemInsights = () => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState('security');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const tabs = [
        { id: 'security', label: 'Security', icon: FaShieldAlt },
        { id: 'database', label: 'Database', icon: FaDatabase },
        { id: 'resources', label: 'Resources', icon: FaServer },
        { id: 'performance', label: 'Performance', icon: FaTachometerAlt },
        { id: 'audit', label: 'Audit', icon: FaClipboardList },
        { id: 'vulnerabilities', label: 'Vulnerabilities', icon: FaBug }
    ];

    // Responsive Sidebar Logic
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Fetch data for active tab
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get(`/superadmin/system_insights.php?tab=${activeTab}`);

            if (response.data.success) {
                setData(response.data.data);
                setLastUpdated(new Date());
            } else {
                setError(response.data.error || 'Failed to fetch data');
            }
        } catch (err) {
            console.error('Error fetching system insights:', err);
            setError(err.response?.data?.error || 'Failed to fetch system insights');
        } finally {
            setLoading(false);
        }
    };

    // Fetch data when tab changes
    useEffect(() => {
        fetchData();
    }, [activeTab]);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchData();
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, [activeTab, autoRefresh]);

    // Render active tab content
    const renderTabContent = () => {
        if (loading) {
            return (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading {tabs.find(t => t.id === activeTab)?.label} data...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="error-container">
                    <FaExclamationTriangle className="error-icon" />
                    <h3>Error Loading Data</h3>
                    <p>{error}</p>
                    <button onClick={fetchData} className="retry-button">Retry</button>
                </div>
            );
        }

        if (!data) {
            return (
                <div className="no-data-container">
                    <p>No data available</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'security':
                return <SecurityTab data={data} />;
            case 'database':
                return <DatabaseTab data={data} />;
            case 'resources':
                return <ResourcesTab data={data} />;
            case 'performance':
                return <PerformanceTab data={data} />;
            case 'audit':
                return <AuditTab data={data} />;
            case 'vulnerabilities':
                return <VulnerabilitiesTab data={data} />;
            default:
                return <div>Invalid tab</div>;
        }
    };

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={toggleSidebar} user={user} />

            <Sidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="content-wrapper">
                    <div className="system-insights-header">
                        <div className="header-left">
                            <h1>System Insights</h1>
                            <p className="subtitle">Monitor application health, security, and performance</p>
                        </div>
                        <div className="header-right">
                            <div className="auto-refresh-toggle">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={autoRefresh}
                                        onChange={(e) => setAutoRefresh(e.target.checked)}
                                    />
                                    Auto-refresh (60s)
                                </label>
                            </div>
                            {lastUpdated && (
                                <div className="last-updated">
                                    Last updated: {lastUpdated.toLocaleTimeString()}
                                </div>
                            )}
                            <button onClick={fetchData} className="refresh-button" disabled={loading}>
                                Refresh Now
                            </button>
                        </div>
                    </div>

                    <div className="tabs-container">
                        <div className="tabs-header">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        <Icon className="tab-icon" />
                                        <span className="tab-label">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="tab-content">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SystemInsights;
