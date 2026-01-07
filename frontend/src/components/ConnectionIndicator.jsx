import React from 'react';
import './ConnectionIndicator.css';

/**
 * ConnectionIndicator component
 * Displays a visual indicator for real-time connection status
 * 
 * @param {boolean} isConnected - Whether the connection is active
 */
const ConnectionIndicator = ({ isConnected }) => {
    return (
        <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="connection-dot"></span>
            <span className="connection-text">
                {isConnected ? 'Connected' : 'Disconnected'}
            </span>
        </div>
    );
};

export default ConnectionIndicator;
