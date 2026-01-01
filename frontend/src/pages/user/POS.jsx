import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import './POS.css';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, ShoppingCart, User, CreditCard } from 'lucide-react';

const POS = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showError, showSuccess } = useNotification();
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [editingItemIndex, setEditingItemIndex] = useState(null);
    const [tempPrice, setTempPrice] = useState('');

    // Customer details
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Payment and debt tracking
    const [paymentReceived, setPaymentReceived] = useState('');
    const [showDebtOption, setShowDebtOption] = useState(false);

    // Trade-in modal
    const [view, setView] = useState('pos'); // 'pos', 'trade-in', 'debt'
    const [tradeInData, setTradeInData] = useState({
        brand: '',
        model: '',
        imei: '',
        color: '',
        storage: '',
        trade_in_value: ''
    });

    // Debt logging data
    const [debtData, setDebtData] = useState({
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        total_amount: 0,
        paid_amount: 0,
        transaction_id: null
    });

    // Lazy Loading State for Search Results
    const [visibleCount, setVisibleCount] = useState(15);
    const observerTarget = useRef(null);

    // Responsive Sidebar Logic
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Fetch available inventory
    const fetchInventory = async () => {
        try {
            setLoading(true);
            const response = await api.get('/inventory/read.php', {
                params: {
                    status: 'in_stock',
                    search: searchTerm,
                    limit: 100 // Increased limit for frontend lazy loading
                }
            });

            if (response.data.success) {
                setInventory(response.data.inventory);
                setVisibleCount(15);
            }
        } catch (err) {
            console.error('Failed to load inventory', err);
            showError('Unable to load available inventory.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (searchTerm) {
                fetchInventory();
            } else {
                setInventory([]);
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchTerm]);

    // Intersection Observer for Lazy Loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && inventory.length > visibleCount) {
                    setVisibleCount(prev => prev + 15);
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [inventory.length, visibleCount]);

    // Slice for lazy loading
    const displayedInventory = useMemo(() => {
        return inventory.slice(0, visibleCount);
    }, [inventory, visibleCount]);

    // Add item to cart
    const addToCart = (item) => {
        // Check if item already in cart
        if (cart.find(cartItem => cartItem.type === 'sale' && cartItem.inventory_id === item.id)) {
            showError('This item is already in the cart.');
            return;
        }

        const originalPrice = parseFloat(item.price);
        setCart([...cart, {
            type: 'sale',
            inventory_id: item.id,
            brand: item.brand,
            model: item.model,
            imei: item.imei,
            price: originalPrice,
            originalPrice: originalPrice, // Store original price for reference
            customPrice: originalPrice // Current selling price (editable)
        }]);

        setSearchTerm('');
        setInventory([]);
    };

    // Remove item from cart
    const removeFromCart = (index) => {
        setCart(cart.filter((_, i) => i !== index));
        if (editingItemIndex === index) {
            setEditingItemIndex(null);
            setTempPrice('');
        }
    };

    // Start editing price
    const startEditingPrice = (index, currentPrice) => {
        setEditingItemIndex(index);
        setTempPrice(currentPrice.toString());
    };

    // Cancel editing price
    const cancelEditingPrice = () => {
        setEditingItemIndex(null);
        setTempPrice('');
    };

    // Update cart item price
    const updateCartItemPrice = (index) => {
        const newPrice = parseFloat(tempPrice);

        // Validation
        if (isNaN(newPrice) || newPrice <= 0) {
            showError('Please enter a valid price greater than zero.');
            return;
        }

        const updatedCart = [...cart];
        updatedCart[index] = {
            ...updatedCart[index],
            customPrice: newPrice,
            price: newPrice // Update price for total calculation
        };

        setCart(updatedCart);
        setEditingItemIndex(null);
        setTempPrice('');
    };

    // Add trade-in to cart
    const addTradeIn = (e) => {
        e.preventDefault();

        // Validate IMEI
        if (!tradeInData.imei.match(/^[0-9]{15}$/)) {
            showError('Invalid IMEI format. It must be exactly 15 digits.');
            return;
        }

        // Check if IMEI already in cart
        if (cart.find(item => item.imei === tradeInData.imei)) {
            showError('This IMEI is already in the cart.');
            return;
        }

        setCart([...cart, {
            type: 'trade_in',
            brand: tradeInData.brand,
            model: tradeInData.model,
            imei: tradeInData.imei,
            color: tradeInData.color,
            storage: tradeInData.storage,
            trade_in_value: parseFloat(tradeInData.trade_in_value),
            price: -parseFloat(tradeInData.trade_in_value) // Negative for credit
        }]);

        setView('pos');
        setTradeInData({
            brand: '',
            model: '',
            imei: '',
            color: '',
            storage: '',
            trade_in_value: ''
        });
    };

    // Calculate total (uses customPrice for sale items, price for trade-ins)
    const calculateTotal = () => {
        return cart.reduce((sum, item) => {
            const itemPrice = item.type === 'sale' ? (item.customPrice || item.price) : item.price;
            return sum + itemPrice;
        }, 0);
    };

    // Handle payment received change
    const handlePaymentReceivedChange = (value) => {
        setPaymentReceived(value);
    };

    // Keep debt option in sync with cart and payment
    useEffect(() => {
        const total = calculateTotal();
        const payment = parseFloat(paymentReceived) || 0;

        // Show debt option only if payment is entered and is less than total
        // We check paymentReceived !== '' to avoid triggering on initial load or empty input
        const isDebt = total > 0 && paymentReceived !== '' && payment < total;
        setShowDebtOption(isDebt);
    }, [cart, paymentReceived]);

    // Open debt logging wizard
    const openDebtWizard = () => {
        const total = calculateTotal();
        const payment = parseFloat(paymentReceived) || 0;

        setDebtData({
            customer_name: customerName || '',
            customer_phone: customerPhone || '',
            customer_address: customerAddress || '',
            total_amount: total,
            paid_amount: payment
        });

        setView('debt');
    };

    // Create debt record
    const handleCreateDebt = async () => {
        // Validation
        if (!debtData.customer_name.trim()) {
            showError('A customer name is required to log a debt.');
            return;
        }

        if (!debtData.customer_phone.trim()) {
            showError('A customer phone number is required to log a debt.');
            return;
        }

        if (!debtData.customer_address.trim()) {
            showError('A customer address is required to log a debt.');
            return;
        }

        setLoading(true);

        try {
            // First, create the transaction
            const transactionResponse = await api.post('/transactions/create.php', {
                customer_name: debtData.customer_name,
                customer_phone: debtData.customer_phone,
                customer_address: debtData.customer_address,
                payment_method: paymentMethod,
                items: cart
            });

            if (!transactionResponse.data.success) {
                throw new Error(transactionResponse.data.error || 'Transaction failed');
            }

            const transactionId = transactionResponse.data.transaction_id;

            // Then, create the debt record
            const debtResponse = await api.post('/debts/create_debt.php', {
                transaction_id: transactionId,
                customer_name: debtData.customer_name,
                customer_phone: debtData.customer_phone,
                customer_address: debtData.customer_address,
                total_amount: debtData.total_amount,
                paid_amount: debtData.paid_amount,
                payment_method: paymentMethod
            });

            if (debtResponse.data.success) {
                showSuccess('The debt record has been successfully created.');

                // Redirect to receipt page after short delay
                setTimeout(() => {
                    const receiptPath = user.role === 'admin'
                        ? `/admin/receipt/${transactionId}`
                        : `/receipt/${transactionId}`;
                    navigate(receiptPath);
                }, 1500);
            } else {
                showError(debtResponse.data.error || 'Unable to create the debt record.');
            }
        } catch (err) {
            console.error('Debt process error:', err);
            showError(err.response?.data?.error || err.message || 'Unable to process the debt request.');
        } finally {
            setLoading(false);
        }
    };

    // Process checkout
    const handleCheckout = async () => {
        // Validation
        if (cart.length === 0) {
            showError('The cart is empty. Please add items before checking out.');
            return;
        }

        if (!customerName.trim()) {
            showError('A customer name is required for the transaction.');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/transactions/create.php', {
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_address: customerAddress,
                payment_method: paymentMethod,
                items: cart
            });

            if (response.data.success) {
                // Redirect to receipt page based on user role
                const receiptPath = user.role === 'admin'
                    ? `/admin/receipt/${response.data.transaction_id}`
                    : `/receipt/${response.data.transaction_id}`;
                navigate(receiptPath);
            } else {
                showError(response.data.error || 'The transaction could not be completed.');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            showError(err.response?.data?.error || 'The transaction could not be completed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={toggleSidebar} user={user} />

            <Sidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="content-wrapper">
                    <div className="pos-container">
                        <div className="pos-header">
                            <h1>Point of Sale</h1>
                            <p className="text-secondary">Process sales and manage trade-ins</p>
                        </div>

                        {view === 'pos' ? (
                            <div className="pos-layout animate-slide-in">
                                {/* Left Side - Product Search */}
                                <div className="pos-search-section glass-card" style={{ padding: '20px' }}>
                                    <div className="section-header" style={{ marginBottom: '15px' }}>
                                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <PlusCircle size={20} /> Add Products
                                        </h2>
                                        <button
                                            className="btn-trade-in-outline"
                                            onClick={() => setView('trade-in')}
                                        >
                                            + Trade-In
                                        </button>
                                    </div>

                                    <div className="search-bar-wrapper" style={{ position: 'relative', marginBottom: '20px' }}>
                                        <input
                                            type="text"
                                            placeholder="Search by brand, model, or IMEI..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="search-input"
                                            style={{ paddingLeft: '15px', width: '100%', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: 'inherit' }}
                                        />
                                    </div>

                                    {displayedInventory.length > 0 && (
                                        <div className="search-results glass-card" style={{ maxHeight: '500px', overflowY: 'auto', border: 'none', background: 'rgba(255, 255, 255, 0.02)' }}>
                                            {displayedInventory.map((item) => (
                                                <div key={item.id} className="search-result-item" style={{ borderBottom: '1px solid var(--border-color)', padding: '15px' }}>
                                                    <div className="item-info">
                                                        <strong style={{ fontSize: '1.1rem' }}>{item.brand} {item.model}</strong>
                                                        <span className="item-details" style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                            {item.storage} • {item.color} • {item.condition_status}
                                                        </span>
                                                        <span className="item-imei" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>IMEI: {item.imei}</span>
                                                    </div>
                                                    <div className="item-price-action" style={{ textAlign: 'right' }}>
                                                        <span className="item-price" style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>₦{parseFloat(item.price).toFixed(2)}</span>
                                                        <button
                                                            className="btn-add"
                                                            onClick={() => addToCart(item)}
                                                        >
                                                            Add to Cart
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Lazy Load Trigger */}
                                            {inventory.length > visibleCount && (
                                                <div ref={observerTarget} className="lazy-load-trigger" style={{ padding: '20px', textAlign: 'center' }}>
                                                    <span className="loading-dots">Loading more...</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {loading && searchTerm && inventory.length === 0 && (
                                        <div className="loading-state" style={{ textAlign: 'center', padding: '20px' }}>Searching products...</div>
                                    )}
                                </div>

                                {/* Right Side - Cart & Checkout */}
                                <div className="pos-cart-section glass-card" style={{ padding: '20px' }}>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                        <ShoppingCart size={20} /> Cart
                                    </h2>

                                    <div className="cart-items" style={{ marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {cart.length === 0 ? (
                                            <div className="empty-cart" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>Cart is empty</div>
                                        ) : (
                                            cart.map((item, index) => (
                                                <div key={index} className={`cart-item ${item.type} glass-card`} style={{ padding: '12px', marginBottom: '10px', border: 'none', background: 'rgba(255, 255, 255, 0.05)' }}>
                                                    <div className="cart-item-info">
                                                        <strong>{item.brand} {item.model}</strong>
                                                        <span className="cart-item-type">
                                                            {item.type === 'sale' ? '📱 Sale' : '🔄 Trade-In'}
                                                        </span>
                                                        <span className="cart-item-imei">IMEI: {item.imei}</span>
                                                    </div>
                                                    <div className="cart-item-price-action">
                                                        {item.type === 'sale' ? (
                                                            <div className="price-edit-wrapper">
                                                                {editingItemIndex === index ? (
                                                                    <div className="price-edit-mode">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            className="price-input"
                                                                            value={tempPrice}
                                                                            onChange={(e) => setTempPrice(e.target.value)}
                                                                            style={{ background: 'var(--bg-secondary)', color: 'inherit', border: '1px solid var(--primary)' }}
                                                                            autoFocus
                                                                        />
                                                                        <button onClick={() => updateCartItemPrice(index)}>✓</button>
                                                                        <button onClick={cancelEditingPrice}>✕</button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="price-display-mode">
                                                                        <div className="price-info">
                                                                            <span className="cart-item-price">
                                                                                ₦{(item.customPrice || item.price).toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            className="btn-edit-price"
                                                                            onClick={() => startEditingPrice(index, item.customPrice || item.price)}
                                                                        >
                                                                            ✎
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="cart-item-price credit">
                                                                -₦{Math.abs(item.price).toFixed(2)}
                                                            </span>
                                                        )}
                                                        <button
                                                            className="btn-remove"
                                                            onClick={() => removeFromCart(index)}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="cart-total glass-card" style={{ padding: '15px', marginBottom: '25px', background: 'var(--primary-gradient)', color: 'white' }}>
                                        {(() => {
                                            const total = calculateTotal();
                                            const isNegative = total < 0;
                                            return (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{isNegative ? 'Change Due:' : 'Grand Total:'}</span>
                                                    <span className="total-amount" style={{ fontSize: '1.8rem', fontWeight: '800' }}>
                                                        ₦{Math.abs(total).toFixed(2)}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="checkout-section">
                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}><User size={18} /> Customer Info</h3>

                                        <div className="form-group">
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Customer Name *"
                                                style={{ borderRadius: '10px', height: '45px' }}
                                            />
                                        </div>

                                        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div className="form-group">
                                                <input
                                                    type="tel"
                                                    value={customerPhone}
                                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                                    placeholder="Phone Number"
                                                    style={{ borderRadius: '10px', height: '45px' }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <select
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    style={{ borderRadius: '10px', height: '45px' }}
                                                >
                                                    <option value="cash">Cash</option>
                                                    <option value="card">Card</option>
                                                    <option value="transfer">Transfer</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginTop: '10px' }}>
                                            <input
                                                type="text"
                                                value={customerAddress}
                                                onChange={(e) => setCustomerAddress(e.target.value)}
                                                placeholder="Customer Address (Optional)"
                                                style={{ borderRadius: '10px', height: '45px' }}
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginTop: '15px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Payment Received (₦)</label>
                                                {paymentReceived && (() => {
                                                    const total = calculateTotal();
                                                    const payment = parseFloat(paymentReceived);
                                                    const change = payment - total;
                                                    return change >= 0 ?
                                                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Change: ₦{change.toFixed(2)}</span> :
                                                        <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>Balance: ₦{Math.abs(change).toFixed(2)}</span>;
                                                })()}
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={paymentReceived}
                                                onChange={(e) => handlePaymentReceivedChange(e.target.value)}
                                                placeholder="0.00"
                                                style={{ borderRadius: '10px', height: '50px', fontSize: '1.2rem', fontWeight: 'bold' }}
                                            />
                                        </div>

                                        <div className="checkout-buttons" style={{ marginTop: '20px' }}>
                                            {showDebtOption ? (
                                                <button
                                                    className="btn-debt"
                                                    onClick={openDebtWizard}
                                                    disabled={loading || cart.length === 0}
                                                    style={{ width: '100%', height: '55px', fontSize: '1.1rem' }}
                                                >
                                                    {loading ? 'Processing...' : 'Process as Customer Debt'}
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn-checkout"
                                                    onClick={handleCheckout}
                                                    disabled={loading || cart.length === 0}
                                                    style={{ width: '100%', height: '55px', fontSize: '1.1rem' }}
                                                >
                                                    <CreditCard size={20} /> {loading ? 'Processing...' : 'Complete Payment'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : view === 'trade-in' ? (
                            <div className="focus-view-container">
                                <div className="focus-view-header">
                                    <button className="btn-back" onClick={() => setView('pos')}>
                                        <ArrowLeft size={18} />
                                        <span>Back to POS</span>
                                    </button>
                                    <h2>Add Trade-In Device</h2>
                                </div>

                                <div className="focus-view-content">
                                    <div className="focus-view-card glass-card">
                                        <form onSubmit={addTradeIn}>
                                            <div className="focus-view-body">
                                                <div className="form-grid-focus">
                                                    <div className="form-group">
                                                        <label>Brand *</label>
                                                        <input
                                                            type="text"
                                                            className="form-input-focus"
                                                            value={tradeInData.brand}
                                                            onChange={(e) => setTradeInData({ ...tradeInData, brand: e.target.value })}
                                                            placeholder="e.g., Apple, Samsung"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Model *</label>
                                                        <input
                                                            type="text"
                                                            className="form-input-focus"
                                                            value={tradeInData.model}
                                                            onChange={(e) => setTradeInData({ ...tradeInData, model: e.target.value })}
                                                            placeholder="e.g., iPhone 13"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="form-group full-width">
                                                        <label>IMEI (15 digits) *</label>
                                                        <input
                                                            type="text"
                                                            className="form-input-focus"
                                                            value={tradeInData.imei}
                                                            onChange={(e) => setTradeInData({ ...tradeInData, imei: e.target.value })}
                                                            pattern="[0-9]{15}"
                                                            maxLength="15"
                                                            placeholder="Enter 15-digit IMEI"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Color</label>
                                                        <input
                                                            type="text"
                                                            className="form-input-focus"
                                                            value={tradeInData.color}
                                                            onChange={(e) => setTradeInData({ ...tradeInData, color: e.target.value })}
                                                            placeholder="e.g., Graphite"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Storage Capacity</label>
                                                        <input
                                                            type="text"
                                                            className="form-input-focus"
                                                            value={tradeInData.storage}
                                                            onChange={(e) => setTradeInData({ ...tradeInData, storage: e.target.value })}
                                                            placeholder="e.g., 128GB"
                                                        />
                                                    </div>
                                                    <div className="form-group full-width">
                                                        <label>Trade-In Value (₦) *</label>
                                                        <input
                                                            type="number"
                                                            className="form-input-focus highlighted-input"
                                                            step="0.01"
                                                            min="0"
                                                            value={tradeInData.trade_in_value}
                                                            onChange={(e) => setTradeInData({ ...tradeInData, trade_in_value: e.target.value })}
                                                            placeholder="0.00"
                                                            required
                                                            style={{ fontSize: '1.5rem', height: '60px', fontWeight: 'bold' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="focus-view-actions">
                                                    <div className="secondary-actions">
                                                        <button type="button" className="btn-cancel" onClick={() => setView('pos')}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                    <div className="primary-actions">
                                                        <button type="submit" className="btn-primary">
                                                            Add to Cart
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        ) : view === 'debt' ? (
                            <div className="focus-view-container">
                                <div className="focus-view-header">
                                    <button className="btn-back" onClick={() => setView('pos')}>
                                        <ArrowLeft size={18} />
                                        <span>Back to POS</span>
                                    </button>
                                    <h2>Log Customer Debt</h2>
                                </div>

                                <div className="focus-view-content">
                                    <div className="focus-view-card glass-card">
                                        <div className="focus-view-body">
                                            {/* Debt Summary */}
                                            <div className="debt-summary-section glass-card" style={{ padding: '20px', marginBottom: '25px', background: 'rgba(255, 255, 255, 0.05)', border: 'none' }}>
                                                <h3 style={{ marginBottom: '15px' }}>Transaction Summary</h3>
                                                <div className="summary-grid-focus">
                                                    <div className="summary-item-focus">
                                                        <span className="label">Total Amount:</span>
                                                        <span className="value">₦{debtData.total_amount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="summary-item-focus">
                                                        <span className="label">Amount Paid:</span>
                                                        <span className="value paid">₦{debtData.paid_amount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="summary-item-focus highlight">
                                                        <span className="label">Remaining Balance:</span>
                                                        <span className="value remaining" style={{ fontSize: '1.4rem' }}>₦{(debtData.total_amount - debtData.paid_amount).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Customer Information Form */}
                                            <div className="customer-info-section">
                                                <h3 style={{ marginBottom: '15px' }}>Customer Details for Debt Logging</h3>
                                                <div className="form-grid-focus">
                                                    <div className="form-group full-width">
                                                        <label>Customer Name *</label>
                                                        <input
                                                            type="text"
                                                            className="form-input-focus"
                                                            value={debtData.customer_name}
                                                            onChange={(e) => setDebtData({ ...debtData, customer_name: e.target.value })}
                                                            placeholder="Enter customer full name"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="form-group full-width">
                                                        <label>Phone Number *</label>
                                                        <input
                                                            type="tel"
                                                            className="form-input-focus"
                                                            value={debtData.customer_phone}
                                                            onChange={(e) => setDebtData({ ...debtData, customer_phone: e.target.value })}
                                                            placeholder="+234XXXXXXXXXX or 0XXXXXXXXXX"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="form-group full-width">
                                                        <label>Customer Address *</label>
                                                        <textarea
                                                            className="form-input-focus"
                                                            value={debtData.customer_address}
                                                            onChange={(e) => setDebtData({ ...debtData, customer_address: e.target.value })}
                                                            placeholder="Enter complete address"
                                                            rows="3"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="focus-view-actions">
                                                <div className="secondary-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-cancel"
                                                        onClick={() => setView('pos')}
                                                        disabled={loading}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                                <div className="primary-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        onClick={handleCreateDebt}
                                                        disabled={loading}
                                                    >
                                                        {loading ? 'Processing...' : 'Complete & Log Debt'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                    </div>
                </div>
            </main>
        </div>
    );
};

export default POS;
