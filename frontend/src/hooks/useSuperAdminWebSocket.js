import { useState, useEffect, useRef, useCallback } from 'react';

const useSuperAdminWebSocket = (channel) => {
    const [lastMessage, setLastMessage] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef(null);
    const reconnectTimeout = useRef(null);

    const connect = useCallback(() => {
        const socketUrl = `ws://${window.location.hostname}:8080`;
        ws.current = new WebSocket(socketUrl);

        ws.current.onopen = () => {
            console.log(`Connected to WebSocket: ${socketUrl}`);
            setIsConnected(true);
            if (channel) {
                ws.current.send(JSON.stringify({
                    type: 'subscribe',
                    channel: channel
                }));
            }
        };

        ws.current.onmessage = (event) => {
            const data = json_parse(event.data);
            if (data) {
                setLastMessage(data);
            }
        };

        ws.current.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
            // Attempt to reconnect after 5 seconds
            reconnectTimeout.current = setTimeout(connect, 5000);
        };

        ws.current.onerror = (err) => {
            console.error('WebSocket error:', err);
            ws.current.close();
        };
    }, [channel]);

    const json_parse = (str) => {
        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    };

    useEffect(() => {
        connect();
        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
        };
    }, [connect]);

    const sendMessage = (message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        }
    };

    return { lastMessage, isConnected, sendMessage };
};

export default useSuperAdminWebSocket;
