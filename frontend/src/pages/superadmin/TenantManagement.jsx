import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Store,
    Users,
    DollarSign,
    Calendar,
    Ban,
    CheckCircle,
    Trash2,
    Mail,
    Phone,
    MapPin,
    Eye,
    Search,
    AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import SuperAdminLayout from '../../components/superadmin/SuperAdminLayout';
import SkeletonLoader from '../../components/superadmin/tenant-detail/SkeletonLoader';
import EmptyState from '../../components/superadmin/tenant-detail/EmptyState';
import Pagination from '../../components/superadmin/tenant-detail/Pagination';
import '../../styles/dashboard.css';
import './TenantManagement.css';

const TenantManagement = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
    const { showError, showSuccess } = useNotification();
    const navigate = useNavigate();

    const handleViewDetails = (id) => {
        navigate(`/superadmin/tenants/${id}`);
    };

    // Fetch tenants
    const fetchTenants = async (page = 1) => {
        try {
            setLoading(true);
            const response = await api.get('/superadmin/tenants.php', {
                params: {
                    page: page,
                    limit: pagination.limit,
                    search: searchTerm,
                    status: filterStatus
                }
            });
            if (response.data.success) {
                setTenants(response.data.tenants);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            console.error('Failed to fetch tenants:', err);
            showError('Failed to load tenants list.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchTenants(1);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, filterStatus]);

    const handlePageChange = (newPage) => {
        fetchTenants(newPage);
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

    const headerActions = (
        <div className="header-stats">
            <div className="stat-item">
                <span className="stat-label">System Total</span>
                <span className="stat-value">{pagination.total}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">On This Page</span>
                <span className="stat-value">{tenants.length}</span>
            </div>
        </div>
    );

    return (
        <SuperAdminLayout
            title="Tenant Management"
            subtitle="Manage all registered shops and their subscriptions"
            headerActions={headerActions}
        >
            <div className="tenant-management-page">
                {/* Filters */}
                <div className="filters-container">
                    <div className="filter-buttons">
                        {['all', 'active', 'trial', 'suspended'].map(status => (
                            <button
                                key={status}
                                className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
                                onClick={() => setFilterStatus(status)}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="search-input-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search shops by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="tenants-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <SkeletonLoader key={i} type="card" />
                        ))}
                    </div>
                ) : tenants.length > 0 ? (
                    <div className="tenants-grid-container">
                        <div className="tenants-grid">
                            {tenants.map((tenant) => {
                                const daysRemaining = getDaysRemaining(tenant);
                                return (
                                    <div key={tenant.id} className="tenant-card glass-card">
                                        <div className="tenant-card-header">
                                            <div className="tenant-info">
                                                <div className="tenant-icon">
                                                    <Store size={24} />
                                                </div>
                                                <div className="tenant-name-section">
                                                    <h3>{tenant.shop_name}</h3>
                                                    <span className={`status-badge ${getStatusBadge(tenant.status)}`}>
                                                        {tenant.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="tenant-actions">
                                                <button
                                                    className="action-btn view"
                                                    onClick={() => handleViewDetails(tenant.id)}
                                                    title="View Details"
                                                >
                                                    <Eye size={24} />
                                                </button>
                                                {tenant.status === 'active' || tenant.status === 'trial' ? (
                                                    <button
                                                        className="action-btn suspend"
                                                        onClick={() => handleStatusChange(tenant.id, 'suspended')}
                                                        title="Suspend Shop"
                                                    >
                                                        <Ban size={24} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="action-btn activate"
                                                        onClick={() => handleStatusChange(tenant.id, 'active')}
                                                        title="Activate Shop"
                                                    >
                                                        <CheckCircle size={24} />
                                                    </button>
                                                )}
                                                <button
                                                    className="action-btn delete"
                                                    onClick={() => handleDelete(tenant.id, tenant.shop_name)}
                                                    title="Delete Shop"
                                                >
                                                    <Trash2 size={24} />
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
                                                <span>{tenant.shop_phone || 'No phone'}</span>
                                            </div>
                                            <div className="tenant-detail">
                                                <MapPin size={16} />
                                                <span>{tenant.shop_address || 'No address set'}</span>
                                            </div>
                                        </div>

                                        <div className="tenant-card-footer">
                                            <div className="tenant-stats">
                                                <div className="tenant-stat" title="Total Users">
                                                    <Users size={16} />
                                                    <span>{tenant.user_count}</span>
                                                </div>
                                                <div className="tenant-stat" title="Inventory Items">
                                                    <Store size={16} />
                                                    <span>{tenant.inventory_count}</span>
                                                </div>
                                                <div className="tenant-stat" title="Total Sales">
                                                    <DollarSign size={16} />
                                                    <span>${parseFloat(tenant.total_sales || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="plan-badge">
                                                {tenant.plan_type?.replace('_', ' ') || 'Free Trial'}
                                            </div>
                                        </div>

                                        {daysRemaining !== null && tenant.status === 'trial' && (
                                            <div className={`trial-warning-overlay ${daysRemaining <= 5 ? 'urgent' : ''}`}>
                                                <Calendar size={18} />
                                                <span>{daysRemaining} days remaining in trial</span>
                                            </div>
                                        )}

                                        <div className="tenant-meta">
                                            <span>Registered: {formatDate(tenant.created_at)}</span>
                                            <span>ID: {tenant.id}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Pagination
                            currentPage={pagination.page}
                            totalPages={pagination.pages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                ) : (
                    <EmptyState
                        icon={Store}
                        title="No Shops Found"
                        description="We couldn't find any shops matching your current search or filter. Try a different query."
                    />
                )}
            </div>
        </SuperAdminLayout>
    );
};

export default TenantManagement;
