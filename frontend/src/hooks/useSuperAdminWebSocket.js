import { useState, useEffect, useRef, useCallback } from 'react';

const useSuperAdminWebSocket = (channel) => {
    const [lastMessage, setLastMessage] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef(null);
    const reconnectTimeout = useRef(null);

    const connect = useCallback(() => {
        // Clear any existing connection before starting a new one
        if (ws.current) {
            const oldSocket = ws.current;
            oldSocket.onopen = null;
            oldSocket.onmessage = null;
            oldSocket.onclose = null;
            oldSocket.onerror = null;

            // Only close if it's already open. If it's connecting, 
            // the new assignment to ws.current and the listener nullification 
            // will effectively "abandon" it.
            if (oldSocket.readyState === WebSocket.OPEN) {
                oldSocket.close();
            }
        }

        const socketUrl = `ws://${window.location.hostname}:8080`;
        const socket = new WebSocket(socketUrl);
        ws.current = socket;

        socket.onopen = () => {
            if (ws.current !== socket) {
                socket.close();
                return;
            }
            setIsConnected(true);
            if (channel && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'subscribe',
                    channel: channel
                }));
            }
        };

        socket.onmessage = (event) => {
            if (ws.current !== socket) return;
            const data = json_parse(event.data);
            if (data) {
                setLastMessage(data);
            }
        };

        socket.onclose = (event) => {
            if (ws.current !== socket) return;
            setIsConnected(false);
            // Only attempt reconnect if it was not a clean close/manual close
            if (!event.wasClean) {
                if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = setTimeout(connect, 5000);
            }
        };

        socket.onerror = (err) => {
            if (ws.current !== socket) return;
            console.error('WebSocket error:', err);
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
                const socket = ws.current;
                socket.onopen = null;
                socket.onmessage = null;
                socket.onclose = null;
                socket.onerror = null;

                // If it's already open, close it. 
                // If it's connecting, we've already nullified the listeners
                // so it won't impact state when it eventually opens/fails.
                // We'll let the browser garbage collect it if we don't close it while connecting
                // to avoid the noisy console error.
                if (socket.readyState === WebSocket.OPEN) {
                    socket.close();
                } else if (socket.readyState === WebSocket.CONNECTING) {
                    // One trick to close "soon" without the warning is to close on open
                    socket.onopen = () => socket.close();
                }
                ws.current = null;
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
