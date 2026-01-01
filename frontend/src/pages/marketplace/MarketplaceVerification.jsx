import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { Shield, ShieldCheck, ShieldAlert, CreditCard, User, AlertCircle, CheckCircle, ArrowLeft, Check, ChevronRight } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceProfile.css';

const MarketplaceVerification = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showError, showSuccess } = useNotification();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null); // 'not_verified', 'verified', 'pending'
    const [verificationData, setVerificationData] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);

    // Form States
    const [activeTab, setActiveTab] = useState('bvn'); // 'bvn' or 'nin'
    const [formData, setFormData] = useState({
        bvn: '',
        nin: '',
        dob: '',
        consent: false
    });
    const [formLoading, setFormLoading] = useState(false);

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) setSidebarOpen(false);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await api.get(`/marketplace/identity/check_status.php?t=${new Date().getTime()}`);
            if (response.data.success) {
                setVerificationData(response.data);
                if (response.data.is_verified) {
                    setStatus('verified');
                } else if (response.data.verification_status === 'pending') {
                    setStatus('pending');
                } else {
                    setStatus('not_verified');
                }
            }
        } catch (err) {
            console.error("Error fetching status:", err);
            showError("Failed to load verification status.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);

        // Validation
        if (!formData.consent) {
            showError("You must provide consent to verify your identity.");
            setFormLoading(false);
            return;
        }

        const endpoint = activeTab === 'bvn'
            ? '/marketplace/identity/verify_bvn.php'
            : '/marketplace/identity/verify_nin.php';

        const payload = activeTab === 'bvn'
            ? { bvn: formData.bvn, dob: formData.dob, consent: formData.consent }
            : { nin: formData.nin, consent: formData.consent };

        try {
            const response = await api.post(endpoint, payload);
            if (response.data.success) {
                showSuccess(response.data.message || "Verification successful!");

                // Immediate update using returned data to avoid reload requirement
                if (response.data.verification_details) {
                    setVerificationData({
                        ...response.data.verification_details,
                        is_verified: true,
                        verification_status: 'success'
                    });
                    setStatus('verified');
                    window.scrollTo(0, 0);
                } else {
                    setTimeout(async () => {
                        await fetchStatus();
                    }, 1000);
                }
            } else {
                showError(response.data.error || "Verification failed. Please try again.");
            }
        } catch (err) {
            console.error("Verification error:", err);
            showError(err.response?.data?.error || "Verification failed. Please check your details and try again.");
        } finally {
            setFormLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
                <MarketplaceSidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />
                <main className="main-content marketplace-main">
                    <div className="content-wrapper">
                        <div className="profile-loading"><p>Loading verification status...</p></div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />

            <main className="main-content marketplace-main">
                <div className="content-wrapper">
                    <div className="focus-view-container">
                        <div className="focus-view-header">
                            <button className="back-btn" onClick={() => navigate('/marketplace')}>
                                <ArrowLeft size={18} />
                                <span>Back to Marketplace</span>
                            </button>
                            <h1 className="heading-2">Identity Verification</h1>
                        </div>

                        {status === 'verified' ? (
                            <div className="focus-view-card glass-card animate-slide-in">
                                <div className="focus-view-body" style={{ textAlign: 'center', padding: '48px 32px' }}>
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '50%',
                                        backgroundColor: 'rgba(52, 168, 83, 0.1)', color: 'var(--success)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                                    }}>
                                        <ShieldCheck size={40} />
                                    </div>
                                    <h2 className="heading-2" style={{ marginBottom: '12px' }}>Verification Successful!</h2>
                                    <p className="text-secondary" style={{ marginBottom: '32px', maxWidth: '500px', marginInline: 'auto' }}>
                                        Your identity has been verified. You now have full access to all marketplace features and a verification badge on your profile.
                                    </p>

                                    <div style={{ background: 'rgba(var(--primary-rgb), 0.03)', padding: '24px', borderRadius: '16px', textAlign: 'left', maxWidth: '400px', margin: '0 auto 32px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <span className="text-secondary">Method:</span>
                                            <span style={{ fontWeight: '600', textTransform: 'uppercase' }}>{verificationData?.verification_type}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <span className="text-secondary">Full Name:</span>
                                            <span style={{ fontWeight: '600' }}>{verificationData?.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="text-secondary">Date Verified:</span>
                                            <span style={{ fontWeight: '600' }}>{new Date(verificationData?.verified_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <button onClick={() => navigate('/marketplace')} className="btn-primary" style={{ margin: '0 auto' }}>
                                        Return to Marketplace
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="focus-view-card glass-card">
                                <div className="wizard-steps">
                                    <div className={`step ${currentStep === 1 ? 'active' : 'completed'}`}>
                                        <div className="step-number">{currentStep > 1 ? <Check size={14} /> : '1'}</div>
                                        <div className="step-label">Select Method</div>
                                    </div>
                                    <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
                                        <div className="step-number">2</div>
                                        <div className="step-label">Verification</div>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="focus-view-body">

                                        {currentStep === 1 && (
                                            <div className="animate-slide-in">
                                                <div className="alert-banner" style={{ background: 'rgba(66, 133, 244, 0.05)', borderLeftColor: 'var(--primary)', marginBottom: '24px' }}>
                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                        <Shield size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                                            To ensure a safe marketplace, we require identity verification for all sellers. Your data is encrypted and used only for verification.
                                                        </p>
                                                    </div>
                                                </div>

                                                <label className="form-label" style={{ marginBottom: '16px', display: 'block' }}>Choose Verification Method</label>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div
                                                        className={`action-card ${activeTab === 'bvn' ? 'active' : ''}`}
                                                        onClick={() => setActiveTab('bvn')}
                                                        style={{
                                                            padding: '24px',
                                                            border: activeTab === 'bvn' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                                            background: activeTab === 'bvn' ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-surface)',
                                                            cursor: 'pointer',
                                                            borderRadius: '12px',
                                                            textAlign: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <CreditCard size={32} style={{ marginBottom: '12px', color: activeTab === 'bvn' ? 'var(--primary)' : 'var(--text-secondary)' }} />
                                                        <h4 style={{ margin: 0, fontSize: '15px' }}>BVN</h4>
                                                        <p className="text-secondary" style={{ fontSize: '12px', margin: '4px 0 0' }}>Quick setup</p>
                                                    </div>
                                                    <div
                                                        className={`action-card ${activeTab === 'nin' ? 'active' : ''}`}
                                                        onClick={() => setActiveTab('nin')}
                                                        style={{
                                                            padding: '24px',
                                                            border: activeTab === 'nin' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                                            background: activeTab === 'nin' ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-surface)',
                                                            cursor: 'pointer',
                                                            borderRadius: '12px',
                                                            textAlign: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <User size={32} style={{ marginBottom: '12px', color: activeTab === 'nin' ? 'var(--primary)' : 'var(--text-secondary)' }} />
                                                        <h4 style={{ margin: 0, fontSize: '15px' }}>NIN</h4>
                                                        <p className="text-secondary" style={{ fontSize: '12px', margin: '4px 0 0' }}>National ID</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {currentStep === 2 && (
                                            <div className="animate-slide-in">
                                                {activeTab === 'bvn' ? (
                                                    <>
                                                        <div className="form-group">
                                                            <label>Bank Verification Number (BVN) *</label>
                                                            <input
                                                                type="text"
                                                                name="bvn"
                                                                value={formData.bvn}
                                                                onChange={handleInputChange}
                                                                className="form-input"
                                                                placeholder="11-digit BVN"
                                                                maxLength="11"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Date of Birth *</label>
                                                            <input
                                                                type="date"
                                                                name="dob"
                                                                value={formData.dob}
                                                                onChange={handleInputChange}
                                                                className="form-input"
                                                                required
                                                            />
                                                            <p className="field-note">Must match your official BVN records.</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="form-group">
                                                        <label>National Identity Number (NIN) *</label>
                                                        <input
                                                            type="text"
                                                            name="nin"
                                                            value={formData.nin}
                                                            onChange={handleInputChange}
                                                            className="form-input"
                                                            placeholder="11-digit NIN"
                                                            maxLength="11"
                                                            required
                                                        />
                                                    </div>
                                                )}

                                                <div className="form-group" style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            name="consent"
                                                            checked={formData.consent}
                                                            onChange={handleInputChange}
                                                            required
                                                            style={{ marginTop: '4px', width: '18px', height: '18px' }}
                                                        />
                                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                                            I give consent for my identity details to be verified against government databases. I understand that this information will be handled securely.
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="focus-view-footer">
                                        {currentStep === 1 ? (
                                            <button
                                                type="button"
                                                className="btn-primary"
                                                onClick={() => setCurrentStep(2)}
                                            >
                                                Proceed to Verify
                                                <ChevronRight size={18} />
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn-secondary"
                                                    onClick={() => setCurrentStep(1)}
                                                >
                                                    Change Method
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="btn-primary"
                                                    disabled={formLoading || !formData.consent}
                                                >
                                                    {formLoading ? 'Verifying Identity...' : 'Submit Verification'}
                                                    {!formLoading && <ShieldCheck size={18} />}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </main>


        </div>
    );
};

export default MarketplaceVerification;
