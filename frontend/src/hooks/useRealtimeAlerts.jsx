import { useState, useCallback } from 'react';
import { useRealtimeUpdates } from './useRealtimeUpdates';

export const useRealtimeAlerts = () => {
    const [alerts, setAlerts] = useState([]);

    const handleMessage = useCallback((data) => {
        if (data.type === 'new_alerts') {
            setAlerts(prev => {
                // Prepend new alerts
                const newItems = Array.isArray(data.data) ? data.data : [data.data];
                // Simple deduping based on 'id' if available, otherwise just prepend
                // Assuming alerts have 'id'
                const existingIds = new Set(prev.map(a => a.id));
                const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));

                return [...uniqueNewItems, ...prev];
            });
        }
    }, []);

    // Subscribe to 'alerts'
    const { isConnected } = useRealtimeUpdates('alerts', handleMessage);

    return { alerts, isConnected };
};
