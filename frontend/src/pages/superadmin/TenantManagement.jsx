import React, { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    Store,
    Users,
    DollarSign,
    Calendar,
    MoreVertical,
    Ban,
    CheckCircle,
    Trash2,
    Mail,
    Phone,
    MapPin,
    TrendingUp
} from 'lucide-react';
import { FaSearch } from 'react-icons/fa';
import { useNotification } from '../../context/NotificationContext';
import '../../styles/dashboard.css';
import './TenantManagement.css';

const TenantManagement = () => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const { showError, showSuccess } = useNotification();

    // Fetch tenants
    const fetchTenants = async () => {
        try {
            setLoading(true);
            const response = await api.get('/superadmin/tenants.php');
            if (response.data.success) {
                setTenants(response.data.tenants);
            }
        } catch (err) {
            console.error('Failed to fetch tenants:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    // Responsive Sidebar Logic
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Handle tenant status change
    const handleStatusChange = async (tenantId, newStatus) => {
        const confirmMsg = newStatus === 'suspended'
            ? 'Are you sure you want to suspend this shop? Users will not be able to login.'
            : 'Are you sure you want to activate this shop?';

        if (!window.confirm(confirmMsg)) return;

        try {
            const response = await api.put('/superadmin/tenants.php', {
                id: tenantId,
                status: newStatus
            });

            if (response.data.success) {
                setTenants(tenants.map(t =>
                    t.id === tenantId ? { ...t, status: newStatus } : t
                ));
                showSuccess(`The shop has been successfully ${newStatus === 'suspended' ? 'suspended' : 'activated'}.`);
            }
        } catch (err) {
            console.error('Failed to update tenant status:', err);
            showError('Unable to update the shop status.');
        }
    };

    // Handle tenant deletion
    const handleDelete = async (tenantId, shopName) => {
        const confirmed = window.confirm(
            `⚠️ WARNING: This will permanently delete "${shopName}" and ALL associated data including:\n\n` +
            `• All users\n• All inventory\n• All transactions\n• All activity logs\n\n` +
            `This action CANNOT be undone. Type the shop name to confirm deletion.`
        );

        if (!confirmed) return;

        const typedName = prompt(`Type "${shopName}" to confirm deletion:`);
        if (typedName !== shopName) {
            showError('The shop name does not match. The deletion process has been cancelled.');
            return;
        }

        try {
            const response = await api.delete('/superadmin/tenants.php', {
                data: { id: tenantId }
            });

            if (response.data.success) {
                setTenants(tenants.filter(t => t.id !== tenantId));
                showSuccess('The shop has been permanently deleted.');
            }
        } catch (err) {
            console.error('Failed to delete tenant:', err);
            showError('Unable to delete the shop.');
        }
    };

    // Filter tenants
    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch =
            tenant.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.shop_email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    // Get status badge class
    const getStatusBadge = (status) => {
        const badges = {
            'active': 'status-active',
            'trial': 'status-trial',
            'suspended': 'status-suspended',
            'pending': 'status-pending'
        };
        return badges[status] || 'status-pending';
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Calculate days remaining
    const getDaysRemaining = (tenant) => {
        if (!tenant.trial_ends_at) return null;
        const trialEnd = new Date(tenant.trial_ends_at);
        const now = new Date();
        const diff = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
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
                    {/* Page Header */}
                    <div className="tenant-management-header">
                        <div>
                            <h1 className="heading-1">Tenant Management</h1>
                            <p className="text-secondary">Manage all registered shops and their subscriptions</p>
                        </div>
                        <div className="header-stats">
                            <div className="stat-item">
                                <span className="stat-label">Total Shops</span>
                                <span className="stat-value">{tenants.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Active</span>
                                <span className="stat-value">{tenants.filter(t => t.status === 'active').length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Trial</span>
                                <span className="stat-value">{tenants.filter(t => t.status === 'trial').length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="filters-container">
                        <div className="search-input-wrapper">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search shops..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-buttons">
                            <button
                                className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterStatus('all')}
                            >
                                All
                            </button>
                            <button
                                className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
                                onClick={() => setFilterStatus('active')}
                            >
                                Active
                            </button>
                            <button
                                className={`filter-btn ${filterStatus === 'trial' ? 'active' : ''}`}
                                onClick={() => setFilterStatus('trial')}
                            >
                                Trial
                            </button>
                            <button
                                className={`filter-btn ${filterStatus === 'suspended' ? 'active' : ''}`}
                                onClick={() => setFilterStatus('suspended')}
                            >
                                Suspended
                            </button>
                        </div>
                    </div>

                    {/* Tenants Grid */}
                    {loading ? (
                        <div className="loading-state">Loading tenants...</div>
                    ) : (
                        <div className="tenants-grid">
                            {filteredTenants.map((tenant) => {
                                const daysRemaining = getDaysRemaining(tenant);
                                return (
                                    <div key={tenant.id} className="tenant-card">
                                        <div className="tenant-card-header">
                                            <div className="tenant-info">
                                                <div className="tenant-icon">
                                                    <Store size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="tenant-name">{tenant.shop_name}</h3>
                                                    <span className={`status-badge ${getStatusBadge(tenant.status)}`}>
                                                        {tenant.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="tenant-actions">
                                                {tenant.status === 'active' || tenant.status === 'trial' ? (
                                                    <button
                                                        className="action-btn suspend"
                                                        onClick={() => handleStatusChange(tenant.id, 'suspended')}
                                                        title="Suspend Shop"
                                                    >
                                                        <Ban size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="action-btn activate"
                                                        onClick={() => handleStatusChange(tenant.id, 'active')}
                                                        title="Activate Shop"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    className="action-btn delete"
                                                    onClick={() => handleDelete(tenant.id, tenant.shop_name)}
                                                    title="Delete Shop"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="tenant-card-body">
                                            <div className="tenant-detail">
                                                <Mail size={16} />
                                                <span>{tenant.shop_email}</span>
                                            </div>
                                            <div className="tenant-detail">
                                                <Phone size={16} />
                                                <span>{tenant.shop_phone}</span>
                                            </div>
                                            {tenant.shop_address && (
                                                <div className="tenant-detail">
                                                    <MapPin size={16} />
                                                    <span>{tenant.shop_address}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="tenant-card-footer">
                                            <div className="tenant-stat">
                                                <Users size={16} />
                                                <span>{tenant.user_count} users</span>
                                            </div>
                                            <div className="tenant-stat">
                                                <Store size={16} />
                                                <span>{tenant.inventory_count} items</span>
                                            </div>
                                            <div className="tenant-stat">
                                                <DollarSign size={16} />
                                                <span>${tenant.total_sales.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {daysRemaining !== null && tenant.status === 'trial' && (
                                            <div className={`trial-warning ${daysRemaining <= 5 ? 'urgent' : ''}`}>
                                                <Calendar size={16} />
                                                <span>{daysRemaining} days remaining in trial</span>
                                            </div>
                                        )}

                                        <div className="tenant-meta">
                                            <span>Registered: {formatDate(tenant.created_at)}</span>
                                            <span className={`plan-badge plan-${tenant.plan_type}`}>
                                                {tenant.plan_type.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {filteredTenants.length === 0 && !loading && (
                        <div className="empty-state">
                            <Store size={48} />
                            <p>No shops found</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TenantManagement;
