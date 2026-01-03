import { useState, useCallback } from 'react';
import { useRealtimeUpdates } from './useRealtimeUpdates';

export const useRealtimeMetrics = () => {
    const [metrics, setMetrics] = useState(null);

    const handleMessage = useCallback((data) => {
        if (data.type === 'metrics_update') {
            setMetrics(data.data);
        }
    }, []);

    // Subscribe to 'metrics'
    const { isConnected } = useRealtimeUpdates('metrics', handleMessage);

    return { metrics, isConnected };
};
