import React, { useState } from 'react';
import axios from 'axios';
import { X, ChevronRight, ChevronLeft, AlertCircle, CheckCircle, ShieldAlert, FileText, ShoppingCart, User, Package } from 'lucide-react';
import './ReportWizard.css';

const ReportWizard = ({ isOpen, onClose, initialType = '', contextData = {} }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [ticketNumber, setTicketNumber] = useState('');
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        type: initialType || '',
        subject: '',
        description: '',
        priority: 'medium',
        order_id: contextData.orderId || null,
        listing_id: contextData.listingId || null,
        target_user_id: contextData.userId || null
    });

    if (!isOpen) return null;

    const reportTypes = [
        { id: 'dispute', label: 'Order Dispute', icon: ShoppingCart, description: 'Issues with a payment or order delivery' },
        { id: 'report_seller', label: 'Report Seller', icon: User, description: 'Suspicious activity or fraud by a seller' },
        { id: 'report_buyer', label: 'Report Buyer', icon: User, description: 'Incorrect payment or harassment by a buyer' },
        { id: 'technical', label: 'Technical Issue', icon: ShieldAlert, description: 'Bugs or errors in the marketplace' },
        { id: 'other', label: 'Other Issue', icon: FileText, description: 'Any other issues not covered above' }
    ];

    const handleTypeSelect = (type) => {
        setFormData({ ...formData, type });
        setStep(2);
    };

    const nextStep = () => {
        if (step === 2 && (!formData.subject.trim() || !formData.description.trim())) {
            setError('Please fill in both subject and description');
            return;
        }
        setError(null);
        setStep(step + 1);
    };

    const prevStep = () => {
        setStep(step - 1);
        setError(null);
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.post('/api/marketplace/support/create_ticket.php', {
                ...formData,
                // Ensure we send target_user_id in description or metadata if the API needs it
                description: `${formData.description}${formData.target_user_id ? `\n\nTarget User ID: ${formData.target_user_id}` : ''}`
            }, {
                withCredentials: true
            });

            if (response.data.success) {
                setTicketNumber(response.data.ticket.ticket_number);
                setStep(4);
            } else {
                setError(response.data.error || 'Failed to create report');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred while submitting the report');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="wizard-step animate-fade-in">
                        <h3>What would you like to report?</h3>
                        <p className="step-subtitle">Select the option that best describes your issue.</p>
                        <div className="report-types-grid">
                            {reportTypes.map((t) => (
                                <button
                                    key={t.id}
                                    className={`type-card ${formData.type === t.id ? 'active' : ''}`}
                                    onClick={() => handleTypeSelect(t.id)}
                                >
                                    <div className="type-icon-wrapper">
                                        <t.icon size={24} />
                                    </div>
                                    <div className="type-info">
                                        <span className="type-label">{t.label}</span>
                                        <span className="type-desc">{t.description}</span>
                                    </div>
                                    <ChevronRight size={18} className="arrow" />
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="wizard-step animate-fade-in">
                        <h3>Provide Details</h3>
                        <p className="step-subtitle">Tell us more about the issue so we can help you faster.</p>

                        <div className="form-content">
                            <div className="form-group">
                                <label>Subject</label>
                                <input
                                    type="text"
                                    placeholder="Briefly summarize the issue"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    placeholder="Details about what happened..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={5}
                                />
                            </div>

                            {contextData.orderNumber && (
                                <div className="context-box">
                                    <Package size={16} />
                                    <span>Related to Order: <strong>{contextData.orderNumber}</strong></span>
                                </div>
                            )}

                            {error && <div className="wizard-error"><AlertCircle size={16} /> {error}</div>}
                        </div>

                        <div className="wizard-actions">
                            <button className="btn-back" onClick={prevStep}>
                                <ChevronLeft size={18} /> Back
                            </button>
                            <button className="btn-next" onClick={nextStep}>
                                Review <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="wizard-step animate-fade-in">
                        <h3>Review & Submit</h3>
                        <p className="step-subtitle">Please check your details before submitting.</p>

                        <div className="review-card glass-card">
                            <div className="review-item">
                                <label>Report Type</label>
                                <span className="badge badge-type">{reportTypes.find(t => t.id === formData.type)?.label}</span>
                            </div>
                            <div className="review-item">
                                <label>Subject</label>
                                <span className="review-text">{formData.subject}</span>
                            </div>
                            <div className="review-item">
                                <label>Description</label>
                                <span className="review-text desc">{formData.description}</span>
                            </div>
                        </div>

                        {error && <div className="wizard-error"><AlertCircle size={16} /> {error}</div>}

                        <div className="wizard-actions">
                            <button className="btn-back" onClick={prevStep} disabled={loading}>
                                <ChevronLeft size={18} /> Back
                            </button>
                            <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="wizard-step animate-fade-in success-step">
                        <div className="success-icon-wrapper">
                            <CheckCircle size={64} className="success-icon" />
                        </div>
                        <h3>Report Submitted!</h3>
                        <p>Your support ticket has been created successfully. Our team will review it and get back to you shortly.</p>

                        <div className="ticket-box">
                            <span className="label">Your Ticket Number:</span>
                            <span className="number">{ticketNumber}</span>
                        </div>

                        <button className="btn-close-wizard" onClick={onClose}>
                            Close
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="wizard-overlay" onClick={onClose}>
            <div className="wizard-content glass-card" onClick={e => e.stopPropagation()}>
                <div className="wizard-header">
                    <h2>Marketplace Support</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="wizard-progress">
                    <div className={`progress-bar step-${step}`}></div>
                </div>

                <div className="wizard-body">
                    {renderStep()}
                </div>
            </div>
        </div>
    );
};

export default ReportWizard;
