import { useState, useEffect } from 'react';
import {
    AlertCircle, AlertTriangle, Info,
    X, CheckCircle, Bell, Loader2
} from 'lucide-react';
import api from '../../../utils/api';
import './TenantNotifications.css';

const TenantNotifications = ({ tenantId, isOpen, onClose, onNotificationCleared }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [resolvingId, setResolvingId] = useState(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (isOpen && tenantId) {
            fetchNotifications();
        }
    }, [isOpen, tenantId]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/superadmin/tenant_notifications.php?action=list&tenant_id=${tenantId}`);
            if (response.data.success) {
                setNotifications(response.data.notifications);
            }
        } catch (err) {
            setError('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id) => {
        try {
            setResolvingId(id);
            const response = await api.post('/superadmin/tenant_notifications.php?action=resolve', {
                notification_id: id
            });
            if (response.data.success) {
                setNotifications(notifications.filter(n => n.id !== id));
                if (onNotificationCleared) onNotificationCleared();
            }
        } catch (err) {
            alert('Failed to resolve notification');
        } finally {
            setResolvingId(null);
        }
    };

    const handleCreateTestNotification = async () => {
        try {
            setCreating(true);
            const response = await api.post('/superadmin/tenant_notifications.php?action=create', {
                tenant_id: tenantId,
                notification_type: 'error',
                severity: 'high',
                title: 'Manual System Alert',
                message: 'This is a test alert generated manually for verification.'
            });
            if (response.data.success) {
                fetchNotifications();
                if (onNotificationCleared) onNotificationCleared();
            }
        } catch (err) {
            alert('Failed to create test notification');
        } finally {
            setCreating(false);
        }
    };

    const getIcon = (type, severity) => {
        if (severity === 'critical' || severity === 'high') return <AlertCircle className="text-red" size={20} />;
        if (severity === 'medium') return <AlertTriangle className="text-yellow" size={20} />;
        return <Info className="text-blue" size={20} />;
    };

    const getSeverityClass = (severity) => {
        return `severity-${severity}`;
    };

    if (!isOpen) return null;

    return (
        <div className="notifications-slideover">
            <div className="notifications-backdrop" onClick={onClose}></div>
            <div className="notifications-content">
                <div className="notifications-header">
                    <div className="header-title">
                        <Bell size={20} />
                        <h3>Tenant Notifications</h3>
                        {notifications.length > 0 && (
                            <span className="notification-count">{notifications.length}</span>
                        )}
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="notifications-list">
                    <button
                        className="create-test-btn"
                        onClick={handleCreateTestNotification}
                        disabled={creating}
                    >
                        {creating ? <Loader2 className="animate-spin" size={16} /> : <AlertCircle size={16} />}
                        Create Test Alert
                    </button>

                    {loading ? (
                        <div className="loader-container">
                            <Loader2 className="animate-spin" size={32} />
                            <p>Loading alerts...</p>
                        </div>
                    ) : error ? (
                        <div className="error-container">
                            <AlertCircle size={32} />
                            <p>{error}</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="empty-container">
                            <CheckCircle size={48} />
                            <p>All clear! No active issues.</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div key={notif.id} className={`notification-card ${getSeverityClass(notif.severity)}`}>
                                <div className="card-top">
                                    <div className="type-icon">
                                        {getIcon(notif.notification_type, notif.severity)}
                                    </div>
                                    <div className="card-content">
                                        <h4>{notif.title}</h4>
                                        <p>{notif.message}</p>
                                        <span className="timestamp">
                                            {new Date(notif.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-bottom">
                                    <button
                                        className="resolve-btn"
                                        onClick={() => handleResolve(notif.id)}
                                        disabled={resolvingId === notif.id}
                                    >
                                        {resolvingId === notif.id ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : (
                                            <CheckCircle size={14} />
                                        )}
                                        Mark as Resolved
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TenantNotifications;
