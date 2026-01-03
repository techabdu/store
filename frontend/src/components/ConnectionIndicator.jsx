import React from 'react';
import { Zap, WifiOff } from 'lucide-react';

const ConnectionIndicator = ({ isConnected }) => {
    return (
        <div className="fixed top-4 right-4 z-[9999]" title={isConnected ? "Realtime Connection Active" : "Disconnected - Reconnecting..."}>
            {isConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-green-500/30 shadow-lg transition-all duration-300">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-medium text-green-500">Live</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-red-500/30 shadow-lg transition-all duration-300 animate-pulse">
                    <WifiOff className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-medium text-red-500">Reconnecting...</span>
                </div>
            )}
        </div>
    );
};

export default ConnectionIndicator;
