import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Component Crash Caught by ErrorBoundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="error-boundary-container">
                    <div className="error-boundary-content">
                        <div className="error-boundary-icon">
                            <AlertTriangle size={64} className="text-rose-400" />
                        </div>
                        <h1 className="error-boundary-title">Something went wrong</h1>
                        <p className="error-boundary-message">
                            The application encountered an unexpected error. We've been notified and are working on it.
                        </p>
                        <div className="error-boundary-actions">
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-refresh"
                            >
                                <RefreshCw size={18} />
                                Refresh Page
                            </button>
                            <a href="/" className="btn-home">
                                <Home size={18} />
                                Go to Home
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
