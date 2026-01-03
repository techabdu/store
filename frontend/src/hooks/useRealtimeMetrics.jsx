import { useState, useCallback } from 'react';
import { useRealtimeUpdates } from './useRealtimeUpdates';

export const useRealtimeMetrics = () => {
    const [metrics, setMetrics] = useState(() => {
        // Initialize from cache if available
        try {
            const cached = localStorage.getItem('lastMetrics');
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            console.warn('Failed to load metrics from cache', e);
            return null;
        }
    });

    const handleMessage = useCallback((data) => {
        if (data.type === 'metrics_update') {
            setMetrics(data.data);
            try {
                localStorage.setItem('lastMetrics', JSON.stringify(data.data));
            } catch (e) {
                console.warn('Failed to cache metrics', e);
            }
        }
    }, []);

    // Subscribe to 'metrics'
    const { isConnected } = useRealtimeUpdates('metrics', handleMessage);

    return { metrics, isConnected };
};
