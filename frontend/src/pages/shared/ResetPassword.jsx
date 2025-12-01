import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import loginIllustration from '../../assets/login-illustration.png';
import '../../styles/login.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [username, setUsername] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Invalid reset link');
            setIsVerifying(false);
            return;
        }

        // Verify token on mount
        const verifyToken = async () => {
            try {
                const response = await api.post('/auth/verify-reset-token.php', { token });
                if (response.data.success) {
                    setUsername(response.data.username);
                } else {
                    setError(response.data.error || 'Invalid or expired reset link');
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Invalid or expired reset link');
            } finally {
                setIsVerifying(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setError('');
        setIsSubmitting(true);

        try {
            const response = await api.post('/auth/reset-password.php', {
                token,
                password
            });

            if (response.data.success) {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setError(response.data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isVerifying) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-visual-section">
                        <div className="illustration-container">
                            <img src={loginIllustration} alt="Loading" />
                        </div>
                    </div>
                    <div className="login-form-section">
                        <div className="login-header">
                            <h1>Verifying...</h1>
                            <p>Please wait</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-visual-section">
                        <div className="illustration-container">
                            <img src={loginIllustration} alt="Success" />
                        </div>
                    </div>
                    <div className="login-form-section">
                        <div className="login-header">
                            <h1>Password Reset!</h1>
                            <p>Your password has been successfully reset</p>
                        </div>
                        <div className="success-message">
                            <FaCheckCircle style={{ fontSize: '3rem', color: '#059669', marginBottom: '1rem' }} />
                            <p>You can now login with your new password.</p>
                            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--login-text-secondary)' }}>
                                Redirecting to login page...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !token) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-visual-section">
                        <div className="illustration-container">
                            <img src={loginIllustration} alt="Error" />
                        </div>
                    </div>
                    <div className="login-form-section">
                        <div className="login-header">
                            <h1>Invalid Link</h1>
                            <p>This password reset link is invalid</p>
                        </div>
                        <div className="error-message">{error}</div>
                        <Link to="/forgot-password" className="login-button" style={{ textAlign: 'center', display: 'block', marginTop: '2rem', textDecoration: 'none' }}>
                            Request New Reset Link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-visual-section">
                    <div className="illustration-container">
                        <img src={loginIllustration} alt="Reset Password" />
                    </div>
                </div>

                <div className="login-form-section">
                    <div className="login-header">
                        <h1>Reset Password</h1>
                        <p>Enter your new password for <strong>{username}</strong></p>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="New Password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <small style={{ color: 'var(--login-text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                                Must be at least 8 characters
                            </small>
                        </div>

                        <div className="form-group">
                            <div className="input-wrapper">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    placeholder="Confirm New Password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setError('');
                                    }}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="login-button">
                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                        </button>

                        <div className="register-link">
                            Remember your password? <Link to="/login">Back to Login</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
