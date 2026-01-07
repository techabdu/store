import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaStore, FaUser, FaEnvelope, FaLock, FaPhone, FaMapMarkerAlt, FaEye, FaEyeSlash, FaCheckCircle, FaArrowRight, FaArrowLeft, FaSpinner, FaTimes } from 'react-icons/fa';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import ParticlesBackground from '../../components/landing/ParticlesBackground';
import '../../styles/register.css';

const Register = () => {
    const [step, setStep] = useState(1); // 1: Plan Selection, 2: Registration Form
    const [formStep, setFormStep] = useState(1); // 1: Owner Info, 2: Shop Info
    const [selectedPlan, setSelectedPlan] = useState(null);
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showError, showSuccess } = useNotification();
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [resendStatus, setResendStatus] = useState('idle'); // idle, sending, success, error
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState(null); // null, true, false

    const navigate = useNavigate();

    useEffect(() => {
        let interval;
        if (registrationSuccess && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [registrationSuccess, resendTimer]);

    // Check username availability
    useEffect(() => {
        const checkUsername = async () => {
            if (formData.owner_username.length < 3) {
                setUsernameAvailable(null);
                return;
            }

            setIsCheckingUsername(true);
            try {
                const response = await api.post('/auth/check-username.php', {
                    username: formData.owner_username
                });
                if (response.data.success) {
                    setUsernameAvailable(response.data.available);
                }
            } catch (err) {
                console.error('Failed to check username:', err);
            } finally {
                setIsCheckingUsername(false);
            }
        };

        const timeoutId = setTimeout(checkUsername, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.owner_username]);

    const handleResendEmail = async () => {
        if (resendTimer > 0 || resendStatus === 'sending') return;

        setResendStatus('sending');
        try {
            const response = await api.post('/auth/resend-verification.php', { email: formData.owner_email });
            if (response.data.success) {
                setResendStatus('success');
                setResendTimer(60);
                showSuccess('A verification email has been sent to your inbox.');
                setTimeout(() => setResendStatus('idle'), 3000);
            } else {
                setResendStatus('error');
                showError(response.data.error || 'Unable to send the email.');
                setTimeout(() => setResendStatus('idle'), 3000);
            }
        } catch (err) {
            setResendStatus('error');
            showError(err.response?.data?.error || 'An error occurred.');
            setTimeout(() => setResendStatus('idle'), 3000);
        }
    };

    // Available plans - matching landing page pricing
    const plans = [
        {
            id: 'basic',
            name: 'Starter',
            price: 39999,
            originalPrice: 39999,
            isFree: true,
            currency: '₦',
            duration: '14 days free, then /month',
            features: [
                'Up to 29 items in inventory',
                'Last 50 sales in history',
                '2 User accounts (Admin + 1)',
                'Basic sales tracking',
                'POS system access',
                'Stock level alerts',
                'Basic reporting'
            ],
            recommended: false
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 50000,
            duration: 'per month',
            currency: '₦',
            features: [
                'Unlimited inventory items',
                'Unlimited sales history',
                'Unlimited User accounts',
                'Advanced analytics',
                'Priority support',
                'Receipt printing',
                'Finance Calculation',
                'Customer Management',
                'Multi-store management',
                'Debt Management'
            ],
            recommended: true
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 'Custom',
            duration: '',
            features: [
                'Unlimited everything',
                'Custom integrations',
                'Multi-user support',
                'Dedicated support',
                'API access'
            ],
            isContact: true,
            contactEmail: 'support@prhub.shop',
            recommended: false
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
    };

    // Step 1 is now Owner Info
    const validateStep1 = () => {
        if (!formData.owner_username.trim()) {
            showError('A username is required.');
            return false;
        }

        if (usernameAvailable === false) {
            showError('This username is already taken. Please choose another one.');
            return false;
        }

        if (isCheckingUsername) {
            showError('Checking username availability...');
            return false;
        }
        if (!formData.owner_email.trim()) {
            showError('An email address is required.');
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.owner_email)) {
            showError('Please enter a valid email address.');
            return false;
        }
        if (!formData.password) {
            showError('A password is required.');
            return false;
        }
        if (formData.password.length < 8) {
            showError('The password must be at least 8 characters long.');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            showError('The passwords do not match.');
            return false;
        }
        return true;
    };

    // Step 2 is now Shop Info
    const validateStep2 = () => {
        if (!formData.shop_name.trim()) {
            showError('A shop name is required.');
            return false;
        }
        if (!formData.shop_phone.trim()) {
            showError('A shop phone number is required.');
            return false;
        }
        return true;
    };

    const handleNextStep = () => {
        if (formStep === 1) {
            if (validateStep1()) {
                setFormStep(2);
            }
        }
    };

    const handlePrevStep = () => {
        if (formStep === 2) {
            setFormStep(1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateStep2()) { // Validate the final step (Shop Info) before submission
            return;
        }

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
                showSuccess('Your account has been successfully registered.');
            } else {
                showError(response.data.error || 'Unable to complete the registration.');
            }
        } catch (err) {
            showError(err.response?.data?.error || 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (registrationSuccess) {
        return (
            <div className="register-page split-layout success-mode" data-theme="light">
                <div className="register-container">
                    {/* Left Side - Visual Section */}
                    <div className="register-visual-section">
                        <ParticlesBackground style={{ position: 'absolute' }} />
                        <div className="prhub-logo">PRHub</div>
                        <div className="success-message-visual">
                            <div className="success-icon">
                                <FaCheckCircle />
                            </div>
                            <h1>Registration Successful!</h1>
                            <p>Thank you for registering your shop with us.</p>
                        </div>
                    </div>

                    {/* Right Side - Action Section */}
                    <div className="register-form-section">
                        <div className="success-action-content">
                            <p className="email-instruction">
                                We've sent a verification email to <strong>{formData.owner_email}</strong>.
                                Please check your inbox and click the verification link to activate your account.
                            </p>
                            <div className="success-actions">
                                <button onClick={() => navigate('/login')} className="btn-primary">
                                    Go to Login
                                </button>
                                <button
                                    onClick={handleResendEmail}
                                    className={`btn-resend ${resendTimer > 0 || resendStatus === 'sending' ? 'disabled' : ''} ${resendStatus === 'success' ? 'text-success' : ''} ${resendStatus === 'error' ? 'text-error' : ''}`}
                                    disabled={resendTimer > 0 || resendStatus === 'sending'}
                                >
                                    {resendStatus === 'sending' ? 'Sending...' :
                                        resendStatus === 'success' ? 'Sent!' :
                                            resendStatus === 'error' ? 'Failed, try again' :
                                                resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}
                                </button>
                            </div>
                            <p className="resend-note">
                                Didn't receive the email? Check your spam folder or contact support.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step 1: Plan Selection
    if (step === 1) {
        return (
            <div className="register-page" data-theme="light">
                <ParticlesBackground />
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
                                onClick={() => !plan.isContact && setSelectedPlan(plan.id)}
                            >
                                {plan.recommended && <div className="recommended-badge">Recommended</div>}
                                <h3>{plan.name}</h3>
                                <div className="plan-price-wrapper">
                                    {plan.isFree && plan.originalPrice ? (
                                        <div className="price-stack">
                                            <div className="price-focus is-free">FREE</div>
                                            <div className="price-details">
                                                <span className="price-old">{plan.currency || '₦'}{plan.originalPrice.toLocaleString()}</span>
                                                <span className="price-condition">14 days free, then {plan.currency || '₦'}{plan.originalPrice.toLocaleString()}/month</span>
                                            </div>
                                        </div>
                                    ) : plan.price === 'Custom' ? (
                                        <div className="price-stack">
                                            <div className="price-focus">Custom</div>
                                            <div className="price-details">
                                                <span className="price-condition">Contact for tailored pricing</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="price-stack">
                                            <div className="price-focus">
                                                {plan.currency || '₦'}
                                                {typeof plan.price === 'number' ? plan.price.toLocaleString() : plan.price}
                                            </div>
                                            <div className="price-details">
                                                <span className="price-condition">billed monthly</span>
                                            </div>
                                        </div>
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
                                {plan.isContact ? (
                                    <button
                                        className="select-plan-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = `mailto:${plan.contactEmail}?subject=Enterprise Plan Inquiry`;
                                        }}
                                    >
                                        Contact Us
                                    </button>
                                ) : (
                                    <button
                                        className={`select-plan-btn ${selectedPlan === plan.id ? 'is-selected' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPlan(plan.id);
                                        }}
                                    >
                                        {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="plan-actions">
                        <button
                            onClick={() => setStep(2)}
                            className="continue-button"
                            disabled={!selectedPlan}
                        >
                            {selectedPlan ? `Continue with ${plans.find(p => p.id === selectedPlan)?.name}` : 'Select a Plan to Continue'}
                        </button>
                        <div className="login-link">
                            Already have an account? <Link to="/login">Sign in here</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Registration Form (Multi-step)
    return (
        <div className="register-page split-layout" data-theme="light">
            <div className="register-container">
                {/* Left Side - Visual Section */}
                <div className="register-visual-section">
                    <ParticlesBackground style={{ position: 'absolute' }} />
                    <div className="prhub-logo">PRHub</div>
                    <div className="register-header">
                        <h1>Create Your Shop Account</h1>
                        <p>Selected Plan: <strong>{plans.find(p => p.id === selectedPlan)?.name}</strong></p>
                    </div>
                </div>

                {/* Right Side - Form Section */}
                <div className="register-form-section">

                    <form onSubmit={handleSubmit} className="register-form">

                        {/* Step 1: Owner Information */}
                        {formStep === 1 && (
                            <div className="form-section form-section-animated">
                                <h3>Owner Information</h3>

                                <div className="form-group">
                                    <label htmlFor="owner_username">Username *</label>
                                    <div className={`input-wrapper ${usernameAvailable === false ? 'input-error' : ''} ${usernameAvailable === true ? 'input-success' : ''}`}>
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
                                            autoFocus
                                            className={usernameAvailable === false ? 'error' : usernameAvailable === true ? 'success' : ''}
                                        />
                                        <div className="input-status-icon">
                                            {isCheckingUsername && <FaSpinner className="spinner" />}
                                            {!isCheckingUsername && usernameAvailable === true && <FaCheckCircle className="text-success" title="Username available" />}
                                            {!isCheckingUsername && usernameAvailable === false && <FaTimes className="text-error" title="Username taken" />}
                                        </div>
                                    </div>
                                    {usernameAvailable === false && <small className="field-error">This username is already taken</small>}
                                    {usernameAvailable === true && <small className="field-success">Username is available!</small>}
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

                                <div className="form-navigation">
                                    <button type="button" onClick={handleNextStep} className="btn-next">
                                        Next Step <FaArrowRight className="btn-icon-shift" />
                                    </button>
                                </div>

                                <div className="change-plan-link">
                                    <button onClick={() => setStep(1)} className="change-plan-btn">Change Plan</button>
                                </div>

                                <div className="login-link">
                                    Already have an account? <Link to="/login">Sign in here</Link>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Shop Information */}
                        {formStep === 2 && (
                            <div className="form-section form-section-animated">
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

                                <div className="form-navigation">
                                    <button type="button" onClick={handlePrevStep} className="btn-back">
                                        <FaArrowLeft className="btn-icon-back" /> Back
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="btn-next">
                                        {isSubmitting ? (
                                            <>
                                                <FaSpinner className="spinner" /> Creating Account...
                                            </>
                                        ) : (
                                            <>
                                                Create Account <FaArrowRight className="btn-icon-shift" />
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="change-plan-link">
                                    <button onClick={() => setStep(1)} className="change-plan-btn">Change Plan</button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
