import { useState, useCallback } from 'react';
import { useRealtimeUpdates } from './useRealtimeUpdates';

export const useRealtimeActivity = () => {
    const [activity, setActivity] = useState([]);

    const handleMessage = useCallback((data) => {
        if (data.type === 'new_activity') {
            setActivity(prev => {
                const newItems = Array.isArray(data.data) ? data.data : [data.data];
                // Deduping
                const existingIds = new Set(prev.map(a => a.id));
                const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));

                // Keep list size manageable, e.g., 50 items
                return [...uniqueNewItems, ...prev].slice(0, 50);
            });
        }
    }, []);

    // Subscribe to 'activity'
    const { isConnected } = useRealtimeUpdates('activity', handleMessage);

    return { activity, isConnected };
};
