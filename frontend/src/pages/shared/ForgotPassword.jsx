import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { FaEnvelope, FaCheckCircle } from 'react-icons/fa';
import '../../styles/login.css';

const ForgotPassword = () => {
    const [identifier, setIdentifier] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!identifier.trim()) {
            setError('Please enter your username or email');
            return;
        }

        setError('');
        setIsSubmitting(true);

        try {
            const response = await api.post('/auth/request-password-reset.php', {
                identifier: identifier.trim()
            });

            if (response.data.success) {
                setSuccess(true);
            } else {
                setError(response.data.error || 'Failed to send reset email');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-visual-section">
                        <div className="illustration-container">
                            <img src={loginIllustration} alt="Success Illustration" />
                        </div>
                    </div>

                    <div className="login-form-section">
                        <div className="login-header">
                            <h1>Check Your Email</h1>
                            <p>Password reset instructions sent</p>
                        </div>

                        <div className="success-message">
                            <FaCheckCircle style={{ fontSize: '3rem', color: '#059669', marginBottom: '1rem' }} />
                            <p>If an account exists with that username or email, we've sent password reset instructions to the associated email address.</p>
                            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--login-text-secondary)' }}>
                                Please check your inbox and follow the link to reset your password.
                            </p>
                        </div>

                        <Link to="/login" className="login-button" style={{ textAlign: 'center', display: 'block', marginTop: '2rem', textDecoration: 'none' }}>
                            Back to Login
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
                        <img src={loginIllustration} alt="Forgot Password Illustration" />
                    </div>
                </div>

                <div className="login-form-section">
                    <div className="login-header">
                        <h1>Forgot Password?</h1>
                        <p>Enter your username or email to reset your password</p>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    id="identifier"
                                    placeholder="Username or Email"
                                    value={identifier}
                                    onChange={(e) => {
                                        setIdentifier(e.target.value);
                                        setError('');
                                    }}
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="login-button">
                            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
