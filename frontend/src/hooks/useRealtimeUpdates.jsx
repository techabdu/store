import { useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

export const useRealtimeUpdates = (channel, onMessage) => {
    // Determine WS URL based on environment or default
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

    const { sendMessage, lastMessage, readyState } = useWebSocket(WS_URL, {
        shouldReconnect: () => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000,
        share: true, // Share the connection across components
    });

    // Subscribe on connection
    useEffect(() => {
        if (readyState === ReadyState.OPEN && channel) {
            sendMessage(JSON.stringify({
                type: 'subscribe',
                channel: channel
            }));
        }
    }, [readyState, channel, sendMessage]);

    // Handle messages
    useEffect(() => {
        if (lastMessage !== null) {
            try {
                const data = JSON.parse(lastMessage.data);
                // Only trigger callback if the message is for the subscribed channel or global
                // Note: The server broadcasts generically to the channel subscribers. 
                // We trust the subscription mechanism, but we should also check if the message type is relevant?
                // The prompt says "If data.type !== 'pong' { onMessage(data) }"
                if (data.type !== 'pong') {
                    onMessage(data);
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        }
    }, [lastMessage, onMessage]);

    // Heartbeat ping
    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            const interval = setInterval(() => {
                sendMessage(JSON.stringify({ type: 'ping' }));
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [readyState, sendMessage]);

    return {
        connectionStatus: readyState,
        isConnected: readyState === ReadyState.OPEN
    };
};
