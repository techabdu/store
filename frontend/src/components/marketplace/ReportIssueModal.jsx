import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, Send, FileWarning } from 'lucide-react';
import '../../styles/wizard.css';
import './ReportIssueModal.css';

const ReportIssueView = ({ onClose, onSubmit, order, isBuyer, isLoading }) => {
    const [issueType, setIssueType] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({});

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
        <div className="focus-view-container report-issue-focused">
            {/* Header */}
            <div className="focus-view-header">
                <button className="btn-back" onClick={handleClose}>
                    <ArrowLeft size={20} />
                    <span>Back to Messages</span>
                </button>
                <h2>Report a Problem</h2>
            </div>

            {/* Content */}
            <div className="focus-view-content">
                <div className="focus-view-card">
                    {/* Icon Header */}
                    <div className="report-issue-icon-header">
                        <div className="report-icon-wrapper">
                            <FileWarning size={32} />
                        </div>
                        <h3>Having an issue with this order?</h3>
                        <p className="report-subtitle">
                            We're sorry to hear you're experiencing an issue.
                            Please provide details below, and our support team will review your case.
                        </p>
                    </div>

                    <div className="focus-view-body">
                        <form onSubmit={handleSubmit}>
                            {/* Order Info Summary */}
                            {order && (
                                <div className="order-summary-card">
                                    <div className="order-summary-label">Order Details</div>
                                    <div className="order-summary-content">
                                        <span className="order-number">#{order.order_number || order.id}</span>
                                        <span className="order-status">{order.status}</span>
                                    </div>
                                </div>
                            )}

                            {/* Issue Type */}
                            <div className="form-group-focus">
                                <label htmlFor="issue-type">Issue Type *</label>
                                <select
                                    id="issue-type"
                                    value={issueType}
                                    onChange={(e) => setIssueType(e.target.value)}
                                    className={`form-input-focus ${errors.issueType ? 'error' : ''}`}
                                >
                                    <option value="">Select an issue type</option>
                                    {availableIssueTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.issueType && (
                                    <span className="error-text">{errors.issueType}</span>
                                )}
                            </div>

                            {/* Description */}
                            <div className="form-group-focus">
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
                                    className={`form-input-focus ${errors.description ? 'error' : ''}`}
                                />
                                {errors.description && (
                                    <span className="error-text">{errors.description}</span>
                                )}
                            </div>

                            {/* Note */}
                            <div className="report-note">
                                <AlertTriangle size={18} />
                                <p>
                                    <strong>Note:</strong> Submitting a dispute will notify the other party and our support team.
                                    Please be as detailed as possible to help us resolve this issue quickly.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="focus-view-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={handleClose}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <div className="primary-actions">
                                    <button
                                        type="submit"
                                        className="btn-danger"
                                        disabled={isLoading}
                                    >
                                        <Send size={18} />
                                        {isLoading ? 'Submitting...' : 'Submit Report'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportIssueView;
