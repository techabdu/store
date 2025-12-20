import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import './ReportIssueModal.css';

const ReportIssueModal = ({ isOpen, onClose, onSubmit, order, isBuyer, isLoading }) => {
    const [issueType, setIssueType] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({});

    if (!isOpen || !order) return null;

    // Define issue types based on user role
    const issueTypes = [
        { value: 'wrong_item', label: 'Wrong Item Received', roles: ['buyer'] },
        { value: 'damaged', label: 'Item Damaged', roles: ['buyer', 'seller'] },
        { value: 'not_as_described', label: 'Not As Described', roles: ['buyer', 'seller'] },
        { value: 'not_shipped', label: 'Item Not Shipped', roles: ['buyer'] },
        { value: 'payment_issue', label: 'Payment Issue', roles: ['seller'] },
        { value: 'other', label: 'Other Issue', roles: ['buyer', 'seller'] }
    ];

    const availableIssueTypes = issueTypes.filter(type =>
        type.roles.includes(isBuyer ? 'buyer' : 'seller')
    );

    const validate = () => {
        const newErrors = {};

        if (!issueType) {
            newErrors.issueType = 'Please select an issue type';
        }

        if (!description.trim()) {
            newErrors.description = 'Please provide a description';
        } else if (description.trim().length < 20) {
            newErrors.description = 'Description must be at least 20 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        await onSubmit({
            issue_type: issueType,
            description: description.trim()
        });

        // Reset form
        setIssueType('');
        setDescription('');
        setErrors({});
    };

    const handleClose = () => {
        setIssueType('');
        setDescription('');
        setErrors({});
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content report-issue-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-title">
                        <AlertTriangle size={24} />
                        <h2>Report a Problem</h2>
                    </div>
                    <button className="modal-close-btn" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="report-intro">
                        <p>
                            We're sorry to hear you're experiencing an issue with this order.
                            Please provide details below, and our support team will review your case.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="issue-type">Issue Type *</label>
                            <select
                                id="issue-type"
                                value={issueType}
                                onChange={(e) => setIssueType(e.target.value)}
                                className={errors.issueType ? 'error' : ''}
                            >
                                <option value="">Select an issue type</option>
                                {availableIssueTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                            {errors.issueType && (
                                <span className="error-message">{errors.issueType}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">
                                Detailed Description *
                                <span className="char-count">
                                    ({description.length}/500)
                                </span>
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Please describe the issue in detail (minimum 20 characters)..."
                                maxLength={500}
                                rows={6}
                                className={errors.description ? 'error' : ''}
                            />
                            {errors.description && (
                                <span className="error-message">{errors.description}</span>
                            )}
                        </div>

                        <div className="form-note">
                            <p>
                                <strong>Note:</strong> Submitting a dispute will notify the other party and our support team.
                                Please be as detailed as possible to help us resolve this issue quickly.
                            </p>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={handleClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-submit"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReportIssueModal;
