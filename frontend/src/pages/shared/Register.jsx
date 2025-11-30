import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaStore, FaUser, FaEnvelope, FaLock, FaPhone, FaMapMarkerAlt, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import api from '../../utils/api';
import '../../styles/register.css';

const Register = () => {
    const [step, setStep] = useState(1); // 1: Plan Selection, 2: Registration Form
    const [selectedPlan, setSelectedPlan] = useState('free_trial');
    const [formData, setFormData] = useState({
        shop_name: '',
        owner_username: '',
        owner_email: '',
        password: '',
        confirmPassword: '',
        shop_phone: '',
        shop_address: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const navigate = useNavigate();

    // Available plans
    const plans = [
        {
            id: 'free_trial',
            name: 'Free Trial',
            price: 0,
            duration: '25 days',
            features: [
                'Full access to all features',
                'Up to 5 users',
                'Unlimited inventory items',
                'Basic support',
                'No credit card required'
            ],
            recommended: true
        },
        {
            id: 'basic',
            name: 'Basic Plan',
            price: 29.99,
            duration: 'per month',
            features: [
                'All trial features',
                'Up to 10 users',
                'Priority support',
                'Advanced reporting',
                'Email notifications'
            ]
        },
        {
            id: 'premium',
            name: 'Premium Plan',
            price: 79.99,
            duration: 'per month',
            features: [
                'All basic features',
                'Unlimited users',
                '24/7 support',
                'Custom integrations',
                'API access',
                'Advanced analytics'
            ]
        }
    ];

    // Password strength calculation
    const calculatePasswordStrength = (password) => {
        if (!password) return { strength: 0, label: '', color: '' };

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        if (strength <= 2) return { strength: 1, label: 'Weak', color: '#ef4444' };
        if (strength <= 4) return { strength: 2, label: 'Medium', color: '#f59e0b' };
        return { strength: 3, label: 'Strong', color: '#10b981' };
    };

    const passwordStrength = calculatePasswordStrength(formData.password);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const validateForm = () => {
        if (!formData.shop_name.trim()) {
            setError('Shop name is required');
            return false;
        }
        if (!formData.owner_username.trim()) {
            setError('Username is required');
            return false;
        }
        if (!formData.owner_email.trim()) {
            setError('Email is required');
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.owner_email)) {
            setError('Please enter a valid email address');
            return false;
        }
        if (!formData.password) {
            setError('Password is required');
            return false;
        }
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        if (!formData.shop_phone.trim()) {
            setError('Shop phone number is required');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setError('');
        setIsSubmitting(true);

        try {
            const response = await api.post('/auth/register.php', {
                shop_name: formData.shop_name,
                owner_username: formData.owner_username,
                owner_email: formData.owner_email,
                password: formData.password,
                shop_phone: formData.shop_phone,
                shop_address: formData.shop_address
            });

            if (response.data.success) {
                setRegistrationSuccess(true);
            } else {
                setError(response.data.error || 'Registration failed');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (registrationSuccess) {
        return (
            <div className="register-page">
                <div className="register-container">
                    <div className="success-message-container">
                        <div className="success-icon">
                            <FaCheckCircle />
                        </div>
                        <h1>Registration Successful!</h1>
                        <p>Thank you for registering your shop with us.</p>
                        <p className="email-instruction">
                            We've sent a verification email to <strong>{formData.owner_email}</strong>.
                            Please check your inbox and click the verification link to activate your account.
                        </p>
                        <div className="success-actions">
                            <button onClick={() => navigate('/login')} className="btn-primary">
                                Go to Login
                            </button>
                        </div>
                        <p className="resend-note">
                            Didn't receive the email? Check your spam folder or contact support.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Step 1: Plan Selection
    if (step === 1) {
        return (
            <div className="register-page">
                <div className="register-container plan-selection">
                    <div className="register-header">
                        <h1>Choose Your Plan</h1>
                        <p>Select the plan that best fits your business needs</p>
                    </div>

                    <div className="plans-grid">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.recommended ? 'recommended' : ''}`}
                                onClick={() => setSelectedPlan(plan.id)}
                            >
                                {plan.recommended && <div className="recommended-badge">Recommended</div>}
                                <h3>{plan.name}</h3>
                                <div className="plan-price">
                                    {plan.price === 0 ? (
                                        <>
                                            <span className="price">Free</span>
                                            <span className="duration">{plan.duration}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="currency">$</span>
                                            <span className="price">{plan.price}</span>
                                            <span className="duration">/{plan.duration.split(' ')[1]}</span>
                                        </>
                                    )}
                                </div>
                                <ul className="plan-features">
                                    {plan.features.map((feature, index) => (
                                        <li key={index}>
                                            <FaCheckCircle className="feature-icon" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="plan-actions">
                        <button
                            onClick={() => setStep(2)}
                            className="continue-button"
                        >
                            Continue with {plans.find(p => p.id === selectedPlan)?.name}
                        </button>
                        <div className="login-link">
                            Already have an account? <Link to="/login">Sign in here</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Registration Form
    return (
        <div className="register-page">
            <div className="register-container">
                <div className="register-header">
                    <h1>Create Your Shop Account</h1>
                    <p>Selected Plan: <strong>{plans.find(p => p.id === selectedPlan)?.name}</strong></p>
                    <button onClick={() => setStep(1)} className="change-plan-btn">Change Plan</button>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="register-form">
                    {/* Shop Information */}
                    <div className="form-section">
                        <h3>Shop Information</h3>

                        <div className="form-group">
                            <label htmlFor="shop_name">Shop Name *</label>
                            <div className="input-wrapper">
                                <FaStore className="input-icon" />
                                <input
                                    type="text"
                                    id="shop_name"
                                    name="shop_name"
                                    placeholder="Enter your shop name"
                                    value={formData.shop_name}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="shop_phone">Shop Phone *</label>
                            <div className="input-wrapper">
                                <FaPhone className="input-icon" />
                                <input
                                    type="tel"
                                    id="shop_phone"
                                    name="shop_phone"
                                    placeholder="e.g., +1234567890"
                                    value={formData.shop_phone}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="shop_address">Shop Address</label>
                            <div className="input-wrapper">
                                <FaMapMarkerAlt className="input-icon" />
                                <input
                                    type="text"
                                    id="shop_address"
                                    name="shop_address"
                                    placeholder="Enter your shop address"
                                    value={formData.shop_address}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Owner Information */}
                    <div className="form-section">
                        <h3>Owner Information</h3>

                        <div className="form-group">
                            <label htmlFor="owner_username">Username *</label>
                            <div className="input-wrapper">
                                <FaUser className="input-icon" />
                                <input
                                    type="text"
                                    id="owner_username"
                                    name="owner_username"
                                    placeholder="Choose a username"
                                    value={formData.owner_username}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="owner_email">Email Address *</label>
                            <div className="input-wrapper">
                                <FaEnvelope className="input-icon" />
                                <input
                                    type="email"
                                    id="owner_email"
                                    name="owner_email"
                                    placeholder="your@email.com"
                                    value={formData.owner_email}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password *</label>
                            <div className="input-wrapper">
                                <FaLock className="input-icon" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    placeholder="Create a strong password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            {formData.password && (
                                <div className="password-strength">
                                    <div className="strength-bar">
                                        <div
                                            className="strength-fill"
                                            style={{
                                                width: `${(passwordStrength.strength / 3) * 100}%`,
                                                backgroundColor: passwordStrength.color
                                            }}
                                        ></div>
                                    </div>
                                    <span style={{ color: passwordStrength.color }}>
                                        {passwordStrength.label}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password *</label>
                            <div className="input-wrapper">
                                <FaLock className="input-icon" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    placeholder="Re-enter your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    autoComplete="new-password"
                                    required
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
                    </div>

                    <button type="submit" disabled={isSubmitting} className="register-button">
                        {isSubmitting ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <div className="login-link">
                        Already have an account? <Link to="/login">Sign in here</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
