import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md';
import ParticlesBackground from '../../components/landing/ParticlesBackground';
import '../../styles/login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResendLink, setShowResendLink] = useState(false);
    const [resendStatus, setResendStatus] = useState('idle');
    const [resendMessage, setResendMessage] = useState('');

    const { login, isAuthenticated, getDashboardRoute } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isVerified = new URLSearchParams(location.search).get('verified') === 'true';

    useEffect(() => {
        if (isAuthenticated) {
            navigate(getDashboardRoute(), { replace: true });
        }
    }, [isAuthenticated, navigate, getDashboardRoute]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        setError('');
        setShowResendLink(false);
        setResendMessage('');
        setIsSubmitting(true);

        try {
            const result = await login(username, password);
            if (!result.success) {
                setError(result.error || 'Login failed');
                if (result.error && result.error.includes('verify your email address')) {
                    setShowResendLink(true);
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendVerification = async () => {
        setResendStatus('sending');
        setResendMessage('');
        try {
            const response = await api.post('/auth/resend-verification.php', { username });
            if (response.data.success) {
                setResendStatus('success');
                setResendMessage('Verification email sent! Please check your inbox.');
            } else {
                setResendStatus('error');
                setResendMessage(response.data.error || 'Failed to send email.');
            }
        } catch (err) {
            setResendStatus('error');
            setResendMessage(err.response?.data?.error || 'An error occurred.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Left Side - Illustration */}
                <div className="login-visual-section">
                    <ParticlesBackground style={{ position: 'absolute' }} />
                    <div className="prhub-logo">PRHub</div>
                    <div className="login-tagline">
                        <h2>Management Software</h2>
                        <h2>for Phone Retailers</h2>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="login-form-section">

                    <div className="login-header">
                        <h1>Hello, <br />Welcome Back</h1>
                        <p>please enter your credentials to login</p>
                    </div>

                    {isVerified && !error && (
                        <div className="success-message">
                            <p style={{ margin: 0 }}><strong>Email Verified!</strong> You can now sign in to your account.</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            {error}
                            {showResendLink && (
                                <div className="resend-verification-section">
                                    <button
                                        type="button"
                                        className="resend-link-button"
                                        onClick={handleResendVerification}
                                        disabled={resendStatus === 'sending' || resendStatus === 'success'}
                                    >
                                        {resendStatus === 'sending' ? 'Sending...' : 'Click here to resend verification email'}
                                    </button>
                                    {resendMessage && (
                                        <div className={`resend-message ${resendStatus}`}>
                                            {resendMessage}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <div className="input-wrapper">
                                <FaUser className="input-icon" />
                                <input
                                    type="text"
                                    id="username"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        setError('');
                                    }}
                                    disabled={isSubmitting}
                                    autoFocus
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="input-wrapper">
                                <FaLock className="input-icon" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    disabled={isSubmitting}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        <div className="form-actions">
                            <label className="remember-me">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="checkbox-custom">
                                    {rememberMe ? <MdCheckBox className="checked-icon" /> : <MdCheckBoxOutlineBlank className="unchecked-icon" />}
                                </span>
                                <span>Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="forgot-password">
                                Forgot Password?
                            </Link>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="login-button">
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                        </button>

                        <div className="register-link">
                            Don't have a shop? <Link to="/register">Create Shop Account</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
