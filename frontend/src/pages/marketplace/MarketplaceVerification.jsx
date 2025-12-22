import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { Shield, ShieldCheck, ShieldAlert, CreditCard, User, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceProfile.css';

const MarketplaceVerification = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null); // 'not_verified', 'verified', 'pending'
    const [verificationData, setVerificationData] = useState(null);

    // Form States
    const [activeTab, setActiveTab] = useState('bvn'); // 'bvn' or 'nin'
    const [formData, setFormData] = useState({
        bvn: '',
        nin: '',
        dob: '',
        consent: false
    });
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

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
            setError("Failed to load verification status.");
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
        setError(null);
        setSuccess(null);
        setFormLoading(true);

        // Validation
        if (!formData.consent) {
            setError("You must provide consent to verify your identity.");
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
                setSuccess(response.data.message || "Verification successful!");

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
                setError(response.data.error || "Verification failed. Please try again.");
            }
        } catch (err) {
            console.error("Verification error:", err);
            setError(err.response?.data?.error || "Verification failed. Please check your details and try again.");
        } finally {
            setFormLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
                <MarketplaceSidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />
                <main className="main-content marketplace-page-main">
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

            <main className="main-content marketplace-page-main">
                <div className="content-wrapper" style={{ maxWidth: '800px', margin: '0 auto' }}>

                    <div className="page-header">
                        <h1 className="heading-1">Identity Verification</h1>
                        <p className="text-secondary">Verify your identity to increase trust and unlock selling features.</p>
                    </div>

                    {status === 'verified' ? (
                        <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                backgroundColor: 'rgba(52, 168, 83, 0.1)', color: 'var(--success)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                            }}>
                                <ShieldCheck size={40} />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>You are Verified!</h2>
                            <p className="text-secondary" style={{ marginBottom: '20px' }}>
                                Your identity has been successfully verified. You now have full access to marketplace features.
                            </p>

                            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span className="text-secondary">Verified With:</span>
                                    <span style={{ fontWeight: '500', textTransform: 'uppercase' }}>{verificationData?.verification_type}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span className="text-secondary">Name:</span>
                                    <span style={{ fontWeight: '500' }}>{verificationData?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-secondary">Verified On:</span>
                                    <span style={{ fontWeight: '500' }}>{new Date(verificationData?.verified_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <br />
                            <button onClick={() => navigate('/marketplace')} className="btn-primary">
                                Go to Marketplace
                            </button>
                        </div>
                    ) : (
                        <div className="dashboard-card">
                            <div style={{ marginBottom: '25px', display: 'flex', borderBottom: '1px solid #eee' }}>
                                <button
                                    onClick={() => setActiveTab('bvn')}
                                    style={{
                                        padding: '15px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'bvn' ? '2px solid var(--primary)' : '2px solid transparent',
                                        color: activeTab === 'bvn' ? 'var(--primary)' : 'var(--text-secondary)',
                                        fontWeight: activeTab === 'bvn' ? '600' : '400',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <CreditCard size={18} />
                                    BVN Verification
                                </button>
                                <button
                                    onClick={() => setActiveTab('nin')}
                                    style={{
                                        padding: '15px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'nin' ? '2px solid var(--primary)' : '2px solid transparent',
                                        color: activeTab === 'nin' ? 'var(--primary)' : 'var(--text-secondary)',
                                        fontWeight: activeTab === 'nin' ? '600' : '400',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <User size={18} />
                                    NIN Verification
                                </button>
                            </div>

                            {/* Informational Alert */}
                            <div style={{
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #DBEAFE',
                                borderRadius: '8px',
                                padding: '16px',
                                marginBottom: '25px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px'
                            }}>
                                <AlertCircle size={20} style={{ color: '#2563EB', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <h4 style={{ color: '#1E40AF', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Why verification is needed</h4>
                                    <p style={{ color: '#1E3A8A', fontSize: '14px', lineHeight: '1.5' }}>
                                        To ensure a safe marketplace for everyone, we require all sellers to verify their identity. Your details are encrypted and securely passed to our verification partner. We do not store your full ID number.
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div className="alert-banner error" style={{
                                    marginBottom: '20px', backgroundColor: '#fee2e2', color: '#dc2626',
                                    padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    <ShieldAlert size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {success && (
                                <div className="alert-banner success" style={{
                                    marginBottom: '20px', backgroundColor: '#ecfdf5', color: '#059669',
                                    padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    <CheckCircle size={18} />
                                    <span>{success}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {activeTab === 'bvn' && (
                                    <>
                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Bank Verification Number (BVN)</label>
                                            <input
                                                type="text"
                                                name="bvn"
                                                value={formData.bvn}
                                                onChange={handleInputChange}
                                                className="form-control"
                                                placeholder="Enter your 11-digit BVN"
                                                maxLength="11"
                                                required
                                                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Date of Birth</label>
                                            <input
                                                type="date"
                                                name="dob"
                                                value={formData.dob}
                                                onChange={handleInputChange}
                                                className="form-control"
                                                required
                                                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                            />
                                            <small className="text-secondary" style={{ display: 'block', marginTop: '5px' }}>Must match your BVN record.</small>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'nin' && (
                                    <div className="form-group" style={{ marginBottom: '20px' }}>
                                        <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>National Identity Number (NIN)</label>
                                        <input
                                            type="text"
                                            name="nin"
                                            value={formData.nin}
                                            onChange={handleInputChange}
                                            className="form-control"
                                            placeholder="Enter your 11-digit NIN"
                                            maxLength="11"
                                            required
                                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                        />
                                    </div>
                                )}

                                <div className="form-group" style={{ marginBottom: '25px' }}>
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="consent"
                                            checked={formData.consent}
                                            onChange={handleInputChange}
                                            required
                                            style={{ marginTop: '4px' }}
                                        />
                                        <span style={{ fontSize: '14px', color: '#555', lineHeight: '1.4' }}>
                                            I consent to having my identity details processed for verification purposes. I understand this checks against government databases.
                                        </span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={formLoading || !formData.consent}
                                    className="btn-primary"
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        backgroundColor: 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: (formLoading || !formData.consent) ? 'not-allowed' : 'pointer',
                                        opacity: (formLoading || !formData.consent) ? 0.7 : 1,
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'
                                    }}
                                >
                                    {formLoading ? (
                                        <>
                                            <div className="spinner-border" style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={20} />
                                            Verify Identity
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>

        </div>
    );
};

export default MarketplaceVerification;
