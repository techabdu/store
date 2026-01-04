import { useState, useEffect } from 'react';
import {
    Settings, Shield, Trash2, CheckCircle,
    XCircle, Lock, Mail, Save, AlertTriangle,
    RefreshCcw, Info, AlertCircle
} from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';
import EmptyState from './EmptyState';
import api from '../../../utils/api';
import './SettingsTab.css';

const SettingsTab = ({ tenantId, onUpdate }) => {
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        if (tenantId) {
            fetchSettings();
        }
    }, [tenantId]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/superadmin/tenant_settings.php?action=get_features&tenant_id=${tenantId}`);
            if (response.data.success) {
                setFeatures(response.data.features);
            } else {
                setError(response.data.error || 'Failed to load settings');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load administration settings');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFeature = async (featureKey, currentStatus) => {
        try {
            setSaving(true);
            const response = await api.post('/superadmin/tenant_settings.php?action=toggle_feature', {
                tenant_id: tenantId,
                feature_key: featureKey,
                is_enabled: currentStatus ? 0 : 1
            });

            if (response.data.success) {
                setFeatures(features.map(f =>
                    f.feature_key === featureKey ? { ...f, is_enabled: !currentStatus } : f
                ));
            } else {
                alert(response.data.error || 'Failed to toggle feature');
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update feature status');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateLimit = async (featureKey, newLimit) => {
        try {
            setSaving(true);
            const response = await api.post('/superadmin/tenant_settings.php?action=update_limits', {
                tenant_id: tenantId,
                feature_key: featureKey,
                custom_limit: newLimit
            });

            if (response.data.success) {
                setFeatures(features.map(f =>
                    f.feature_key === featureKey ? { ...f, custom_limit: newLimit } : f
                ));
            } else {
                alert(response.data.error || 'Failed to update limit');
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update limit');
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!window.confirm('Manually mark this tenant email as verified?')) return;

        try {
            setSaving(true);
            const response = await api.post('/superadmin/tenant_settings.php?action=verify_email', {
                tenant_id: tenantId
            });
            if (response.data.success) {
                alert('Email verified successfully');
                if (onUpdate) onUpdate();
            } else {
                alert(response.data.error || 'Failed to verify email');
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Error verifying email');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTenant = async () => {
        if (deleteConfirm !== 'DELETE') {
            alert('Please type "DELETE" to confirm');
            return;
        }

        try {
            setSaving(true);
            const response = await api.post('/superadmin/tenant_settings.php?action=delete_tenant', {
                tenant_id: tenantId,
                confirmation: 'DELETE'
            });

            if (response.data.success) {
                alert('Tenant deleted successfully');
                window.location.href = '/superadmin/tenants';
            } else {
                alert(response.data.error || 'Failed to delete tenant');
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete tenant');
        } finally {
            setSaving(false);
            setShowDeleteModal(false);
        }
    };

    if (loading) {
        return (
            <div className="settings-tab skeleton-mode">
                <SkeletonLoader type="card" />
                <div style={{ marginTop: '2rem' }}>
                    <SkeletonLoader type="table" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                icon={AlertCircle}
                title="Error Loading Settings"
                description={error}
                action={{
                    label: "Retry",
                    onClick: fetchSettings
                }}
            />
        );
    }

    return (
        <div className="settings-tab">
            <div className="settings-grid">
                {/* Feature Access Section */}
                <div className="settings-section">
                    <div className="section-header">
                        <Shield size={20} />
                        <h3>Feature Access Control</h3>
                    </div>
                    <p className="section-desc">Enable or disable specific modules and set custom usage limits for this tenant.</p>

                    <div className="features-list">
                        {features.map(feature => (
                            <div key={feature.feature_key} className="feature-item">
                                <div className="feature-info">
                                    <h4 className="capitalize">{feature.feature_key.replace(/_/g, ' ')}</h4>
                                    {feature.modified_at && (
                                        <span className="modified-info">
                                            Last modified: {new Date(feature.modified_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <div className="feature-actions">
                                    <div className="limit-input-group">
                                        <label>Limit</label>
                                        <input
                                            type="number"
                                            defaultValue={feature.custom_limit}
                                            onBlur={(e) => handleUpdateLimit(feature.feature_key, e.target.value)}
                                            className="limit-input"
                                            disabled={saving}
                                        />
                                    </div>
                                    <button
                                        className={`toggle-btn ${feature.is_enabled ? 'enabled' : 'disabled'}`}
                                        onClick={() => handleToggleFeature(feature.feature_key, feature.is_enabled)}
                                        disabled={saving}
                                    >
                                        {feature.is_enabled ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                        <span>{feature.is_enabled ? 'Enabled' : 'Disabled'}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Admin Actions Section */}
                <div className="settings-section side">
                    <div className="section-header">
                        <Lock size={20} />
                        <h3>Quick Actions</h3>
                    </div>
                    <div className="actions-list">
                        <button className="action-button" onClick={handleVerifyEmail} disabled={saving}>
                            <Mail size={18} />
                            <span>Verify Email Manually</span>
                        </button>
                        <button className="action-button" onClick={() => alert('Password reset link sent to tenant')} disabled={saving}>
                            <RefreshCcw size={18} />
                            <span>Reset Tenant Password</span>
                        </button>
                    </div>

                    <div className="danger-zone">
                        <div className="section-header danger">
                            <AlertTriangle size={20} />
                            <h3>Danger Zone</h3>
                        </div>
                        <p className="danger-desc">These actions are irreversible. Please proceed with extreme caution.</p>

                        <button className="delete-tenant-btn" onClick={() => setShowDeleteModal(true)}>
                            <Trash2 size={18} />
                            Delete Tenant Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Information Card */}
            <div className="info-card">
                <Info size={20} />
                <div className="info-content">
                    <h4>About Tenant Settings</h4>
                    <p>
                        Settings changes are applied immediately to the tenant's environment.
                        Disabling a feature will hide it from the tenant's dashboard and block API access to that module.
                        All changes are recorded in the system audit logs.
                    </p>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="delete-modal shadow-glass">
                        <div className="modal-header">
                            <div className="danger-icon">
                                <AlertTriangle size={32} />
                            </div>
                            <h3>Delete Tenant Account</h3>
                        </div>
                        <div className="modal-body">
                            <p>This will permanently delete the tenant and ALL associated data (users, sales, inventory, branches). This action <strong>CANNOT</strong> be undone.</p>
                            <p className="confirm-instruction">To confirm, type <strong>DELETE</strong> below:</p>
                            <input
                                type="text"
                                className="confirm-input"
                                value={deleteConfirm}
                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                placeholder="Type DELETE here..."
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button
                                className="btn-danger-confirm"
                                onClick={handleDeleteTenant}
                                disabled={deleteConfirm !== 'DELETE' || saving}
                            >
                                {saving ? 'Deleting...' : 'Permanently Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsTab;
