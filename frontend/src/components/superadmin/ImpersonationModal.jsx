import { useState } from 'react';
import { UserCog, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import './ImpersonationModal.css';

const ImpersonationModal = ({ isOpen, onClose, user, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    if (!isOpen || !user) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError('Please provide a valid reason for impersonation.');
            return;
        }
        if (reason.length < 10) {
            setError('Please provide a more detailed reason (min 10 chars).');
            return;
        }
        onConfirm(user, reason);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="impersonation-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-icon">
                        <ShieldAlert size={24} />
                    </div>
                    <h3>Start Impersonation</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    <div className="impersonation-info">
                        <p>You are about to start an impersonation session for:</p>
                        <div className="target-card">
                            <div className="target-avatar">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="target-info">
                                <span className="target-name">{user.username}</span>
                                <span className="target-role">{user.role}</span>
                                <span className="target-email">{user.email}</span>
                            </div>
                        </div>
                    </div>

                    <div className="warning-box">
                        <AlertTriangle size={18} />
                        <div>
                            <strong>Audit Logging Active</strong>
                            <p>This session will be logged to the tenant's audit trail and the SuperAdmin logs. All actions taken will be recorded under your admin ID.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Reason for Access (Required)</label>
                            <textarea
                                placeholder="e.g., Troubleshooting checkout bug reported in Ticket #1234..."
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    setError('');
                                }}
                                autoFocus
                            ></textarea>
                            {error && <span className="error-text">{error}</span>}
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn-danger">
                                <UserCog size={18} /> Confirm & Start Session
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ImpersonationModal;
