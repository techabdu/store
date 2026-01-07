import React from 'react';
import { X } from 'lucide-react';
import './ErrorDetailModal.css';

const ErrorDetailModal = ({ error, onClose }) => {
    if (!error) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="modal-header">
                    <h2>Error Details</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close modal">
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    {/* Error Message */}
                    <div className="error-section">
                        <h3>Error Message</h3>
                        <div className="error-message">
                            {error.message || 'No message available'}
                        </div>
                    </div>

                    {/* Error Details */}
                    <div className="error-section">
                        <h3>Details</h3>
                        <div className="error-details-grid">
                            <div className="error-detail-item">
                                <span className="error-detail-label">Type</span>
                                <span className="error-detail-value">{error.type || 'Unknown'}</span>
                            </div>
                            <div className="error-detail-item">
                                <span className="error-detail-label">Severity</span>
                                <span className="error-detail-value" style={{
                                    color: error.severity === 'critical' ? 'var(--error)' : 'var(--warning)'
                                }}>
                                    {error.severity || 'Unknown'}
                                </span>
                            </div>
                            <div className="error-detail-item">
                                <span className="error-detail-label">File</span>
                                <span className="error-detail-value">{error.file || 'Unknown'}</span>
                            </div>
                            <div className="error-detail-item">
                                <span className="error-detail-label">Line</span>
                                <span className="error-detail-value">{error.line || 'N/A'}</span>
                            </div>
                            <div className="error-detail-item">
                                <span className="error-detail-label">Timestamp</span>
                                <span className="error-detail-value">
                                    {error.timestamp ? new Date(error.timestamp).toLocaleString() : 'N/A'}
                                </span>
                            </div>
                            <div className="error-detail-item">
                                <span className="error-detail-label">User</span>
                                <span className="error-detail-value">{error.user || 'System'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stack Trace */}
                    {error.stack_trace && (
                        <div className="error-section">
                            <h3>Stack Trace</h3>
                            <div className="stack-trace">
                                <pre>{error.stack_trace}</pre>
                            </div>
                        </div>
                    )}

                    {/* Additional Context */}
                    {error.context && (
                        <div className="error-section">
                            <h3>Context</h3>
                            <div className="error-context">
                                <pre>{JSON.stringify(error.context, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorDetailModal;
