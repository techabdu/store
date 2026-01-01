import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { registerNotifyHandler } from '../utils/notificationHelper';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const notificationIdCounter = useRef(0);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const showNotification = useCallback((type, message, duration = 5000) => {
        const id = ++notificationIdCounter.current;
        const newNotification = { id, type, message };

        setNotifications(prev => [...prev, newNotification]);

        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }

        return id;
    }, [removeNotification]);

    // Register global handler
    useEffect(() => {
        registerNotifyHandler((type, message) => {
            showNotification(type, message);
        });
    }, [showNotification]);

    const showSuccess = (msg, dur) => showNotification('success', msg, dur);
    const showError = (msg, dur) => showNotification('error', msg, dur);
    const showInfo = (msg, dur) => showNotification('info', msg, dur);
    const showWarning = (msg, dur) => showNotification('warning', msg, dur);

    return (
        <NotificationContext.Provider value={{ showSuccess, showError, showInfo, showWarning, removeNotification }}>
            {children}
            <div className="notification-container">
                {notifications.map(n => (
                    <NotificationItem
                        key={n.id}
                        notification={n}
                        onClose={() => removeNotification(n.id)}
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

const NotificationItem = ({ notification, onClose }) => {
    const { type, message } = notification;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-emerald-400" />;
            case 'error': return <AlertCircle size={20} className="text-rose-400" />;
            case 'warning': return <AlertTriangle size={20} className="text-amber-400" />;
            default: return <Info size={20} className="text-sky-400" />;
        }
    };

    return (
        <div className={`notification-item notification-${type}`}>
            <div className="notification-icon">
                {getIcon()}
            </div>
            <div className="notification-message">
                {message}
            </div>
            <button className="notification-close" onClick={onClose}>
                <X size={16} />
            </button>
        </div>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
