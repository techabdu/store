import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md';
import loginIllustration from '../assets/login-illustration.png';
import '../styles/login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, isAuthenticated, getDashboardRoute } = useAuth();
    const navigate = useNavigate();

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
        setIsSubmitting(true);

        try {
            const result = await login(username, password);
            if (!result.success) {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Left Side - Illustration */}
                <div className="login-visual-section">
                    <div className="illustration-container">
                        <img src={loginIllustration} alt="Login Illustration" />
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="login-form-section">

                    <div className="login-header">
                        <h1>Hello, <br />Welcome Back</h1>
                        <p>please enter your credentials to login</p>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    id="username"
                                    placeholder="stanley@gmail.com"
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
                        </div>

                        <button type="submit" disabled={isSubmitting} className="login-button">
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
