import { useState, useCallback } from 'react';
import { useRealtimeUpdates } from './useRealtimeUpdates';

export const useRealtimeErrors = () => {
    const [errors, setErrors] = useState([]);

    const handleMessage = useCallback((data) => {
        if (data.type === 'new_errors') {
            setErrors(prev => {
                const newItems = Array.isArray(data.data) ? data.data : [data.data];
                // Deduping
                const existingIds = new Set(prev.map(a => a.id));
                const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));

                return [...uniqueNewItems, ...prev].slice(0, 50);
            });
        }
    }, []);

    // Subscribe to 'errors'
    const { isConnected } = useRealtimeUpdates('errors', handleMessage);

    return { errors, isConnected };
};
