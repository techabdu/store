import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FaCheckCircle, FaExclamationCircle, FaEnvelope, FaSignInAlt } from 'react-icons/fa';
import ParticlesBackground from '../../components/landing/ParticlesBackground';
import '../../styles/register.css'; // Reuse register styles for consistency

const VerifyStatus = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const status = params.get('status'); // 'already_verified', 'invalid', 'expired'

    const getStatusConfig = () => {
        switch (status) {
            case 'already_verified':
                return {
                    icon: <FaCheckCircle style={{ color: '#10b981' }} />,
                    title: 'Account Already Verified',
                    message: 'Your account has already been verified. You can proceed to login and start managing your shop.',
                    btnText: 'Go to Login',
                    btnLink: '/login'
                };
            case 'expired':
                return {
                    icon: <FaExclamationCircle style={{ color: '#f59e0b' }} />,
                    title: 'Verification Link Expired',
                    message: 'This verification link has expired. Please log in to request a fresh verification email.',
                    btnText: 'Go to Login',
                    btnLink: '/login'
                };
            case 'invalid':
            default:
                return {
                    icon: <FaExclamationCircle style={{ color: '#ef4444' }} />,
                    title: 'Invalid Verification Link',
                    message: 'We couldn\'t verify your email with this link. It may be broken or already used.',
                    btnText: 'Back to Registration',
                    btnLink: '/register'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className="register-page split-layout success-mode">
            <div className="register-container">
                {/* Left Side */}
                <div className="register-visual-section">
                    <ParticlesBackground style={{ position: 'absolute' }} />
                    <div className="prhub-logo">PRHub</div>
                    <div className="success-message-visual">
                        <div className="success-icon">
                            {config.icon}
                        </div>
                        <h1>{config.title}</h1>
                    </div>
                </div>

                {/* Right Side */}
                <div className="register-form-section">
                    <div className="success-action-content">
                        <p className="email-instruction" style={{ textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderLeft: 'none', padding: '2rem', borderRadius: '12px' }}>
                            {config.message}
                        </p>

                        <div className="success-actions" style={{ justifyContent: 'center', marginTop: '2rem' }}>
                            <button
                                onClick={() => navigate(config.btnLink)}
                                className="btn-primary"
                                style={{ width: '100%', maxWidth: '300px' }}
                            >
                                <FaSignInAlt style={{ marginRight: '8px' }} /> {config.btnText}
                            </button>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <Link to="/" style={{ color: '#667eea', fontWeight: '600', textDecoration: 'none' }}>
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyStatus;
