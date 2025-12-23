import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import './POS.css';

import { useNavigate } from 'react-router-dom';

const POS = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [editingItemIndex, setEditingItemIndex] = useState(null);
    const [tempPrice, setTempPrice] = useState('');

    // Customer details
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Trade-in modal
    const [view, setView] = useState('pos'); // 'pos', 'trade-in'
    const [tradeInData, setTradeInData] = useState({
        brand: '',
        model: '',
        imei: '',
        color: '',
        storage: '',
        trade_in_value: ''
    });

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
            const response = await api.get('/inventory/read.php', {
                params: {
                    status: 'in_stock',
                    search: searchTerm,
                    limit: 50
                }
            });

            if (response.data.success) {
                setInventory(response.data.inventory);
            }
        } catch (err) {
            console.error('Failed to load inventory', err);
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

    // Add item to cart
    const addToCart = (item) => {
        // Check if item already in cart
        if (cart.find(cartItem => cartItem.type === 'sale' && cartItem.inventory_id === item.id)) {
            setError('Item already in cart');
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
        setError('');
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
            setError('Price must be a positive number');
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
        setError('');
    };

    // Add trade-in to cart
    const addTradeIn = (e) => {
        e.preventDefault();

        // Validate IMEI
        if (!tradeInData.imei.match(/^[0-9]{15}$/)) {
            setError('Invalid IMEI format. Must be 15 digits.');
            return;
        }

        // Check if IMEI already in cart
        if (cart.find(item => item.imei === tradeInData.imei)) {
            setError('This IMEI is already in the cart');
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
        setError('');
    };

    // Calculate total (uses customPrice for sale items, price for trade-ins)
    const calculateTotal = () => {
        return cart.reduce((sum, item) => {
            const itemPrice = item.type === 'sale' ? (item.customPrice || item.price) : item.price;
            return sum + itemPrice;
        }, 0);
    };

    // Process checkout
    const handleCheckout = async () => {
        // Validation
        if (cart.length === 0) {
            setError('Cart is empty');
            return;
        }

        if (!customerName.trim()) {
            setError('Customer name is required');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

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
                setError(response.data.error || 'Transaction failed');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Transaction failed');
            console.error(err);
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

                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        {view === 'pos' ? (
                            <div className="pos-layout animate-slide-in">
                                {/* Left Side - Product Search */}
                                <div className="pos-search-section">
                                    <div className="section-header">
                                        <h2>Add Products</h2>
                                        <button
                                            className="btn-trade-in-outline"
                                            onClick={() => setView('trade-in')}
                                        >
                                            + Trade-In
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Search by brand, model, or IMEI..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="search-input"
                                    />

                                    {inventory.length > 0 && (
                                        <div className="search-results">
                                            {inventory.map((item) => (
                                                <div key={item.id} className="search-result-item">
                                                    <div className="item-info">
                                                        <strong>{item.brand} {item.model}</strong>
                                                        <span className="item-details">
                                                            {item.storage} • {item.color} • {item.condition_status}
                                                        </span>
                                                        <span className="item-imei">IMEI: {item.imei}</span>
                                                    </div>
                                                    <div className="item-price-action">
                                                        <span className="item-price">₦{parseFloat(item.price).toFixed(2)}</span>
                                                        <button
                                                            className="btn-add"
                                                            onClick={() => addToCart(item)}
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right Side - Cart & Checkout */}
                                <div className="pos-cart-section">
                                    <h2>Cart</h2>

                                    <div className="cart-items">
                                        {cart.length === 0 ? (
                                            <div className="empty-cart">Cart is empty</div>
                                        ) : (
                                            cart.map((item, index) => (
                                                <div key={index} className={`cart-item ${item.type}`}>
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
                                                                    // Edit mode
                                                                    <div className="price-edit-mode">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            className="price-input"
                                                                            value={tempPrice}
                                                                            onChange={(e) => setTempPrice(e.target.value)}
                                                                            onKeyPress={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    updateCartItemPrice(index);
                                                                                } else if (e.key === 'Escape') {
                                                                                    cancelEditingPrice();
                                                                                }
                                                                            }}
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            className="btn-save-price"
                                                                            onClick={() => updateCartItemPrice(index)}
                                                                            title="Save price"
                                                                        >
                                                                            ✓
                                                                        </button>
                                                                        <button
                                                                            className="btn-cancel-price"
                                                                            onClick={cancelEditingPrice}
                                                                            title="Cancel"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    // Display mode
                                                                    <div className="price-display-mode">
                                                                        <div className="price-info">
                                                                            <span className="cart-item-price">
                                                                                ₦{(item.customPrice || item.price).toFixed(2)}
                                                                            </span>
                                                                            {item.customPrice && item.customPrice !== item.originalPrice && (
                                                                                <span className="original-price">
                                                                                    ₦{item.originalPrice.toFixed(2)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            className="btn-edit-price"
                                                                            onClick={() => startEditingPrice(index, item.customPrice || item.price)}
                                                                            title="Edit price"
                                                                        >
                                                                            ✎
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            // Trade-in items (non-editable)
                                                            <span className={`cart-item-price credit`}>
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

                                    <div className="cart-total">
                                        {(() => {
                                            const total = calculateTotal();
                                            const isNegative = total < 0;
                                            return (
                                                <>
                                                    <span>{isNegative ? 'Change Due to Customer:' : 'Total:'}</span>
                                                    <span className={`total-amount ${isNegative ? 'negative' : ''}`}>
                                                        ₦{Math.abs(total).toFixed(2)}
                                                    </span>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    <div className="checkout-section">
                                        <h3>Customer Details</h3>

                                        <div className="form-group">
                                            <label>Customer Name *</label>
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Enter customer name"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Phone Number</label>
                                            <input
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="Enter phone number"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Address</label>
                                            <input
                                                type="text"
                                                value={customerAddress}
                                                onChange={(e) => setCustomerAddress(e.target.value)}
                                                placeholder="Enter address"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Payment Method *</label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="card">Card</option>
                                                <option value="transfer">Transfer</option>
                                                <option value="mixed">Mixed</option>
                                            </select>
                                        </div>

                                        <button
                                            className="btn-checkout"
                                            onClick={handleCheckout}
                                            disabled={loading || cart.length === 0}
                                        >
                                            {loading ? 'Processing...' : 'Complete Sale'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="focus-view-container animate-slide-in">
                                <div className="focus-view-header">
                                    <h2 className="heading-2">Add Trade-In Device</h2>
                                    <button className="back-btn" onClick={() => setView('pos')}>
                                        <span>Back to POS</span>
                                    </button>
                                </div>

                                <div className="dashboard-card focus-view-card">
                                    <form onSubmit={addTradeIn}>
                                        <div className="focus-view-body">
                                            <div className="form-grid">
                                                <div className="form-group">
                                                    <label>Brand *</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
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
                                                        className="form-input"
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
                                                        className="form-input"
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
                                                        className="form-input"
                                                        value={tradeInData.color}
                                                        onChange={(e) => setTradeInData({ ...tradeInData, color: e.target.value })}
                                                        placeholder="e.g., Graphite"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Storage Capacity</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={tradeInData.storage}
                                                        onChange={(e) => setTradeInData({ ...tradeInData, storage: e.target.value })}
                                                        placeholder="e.g., 128GB"
                                                    />
                                                </div>
                                                <div className="form-group full-width">
                                                    <label>Trade-In Value (₦) *</label>
                                                    <input
                                                        type="number"
                                                        className="form-input highlight-input"
                                                        step="0.01"
                                                        min="0"
                                                        value={tradeInData.trade_in_value}
                                                        onChange={(e) => setTradeInData({ ...tradeInData, trade_in_value: e.target.value })}
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="focus-view-footer">
                                                <button type="button" className="btn-secondary" onClick={() => setView('pos')}>
                                                    Cancel
                                                </button>
                                                <button type="submit" className="btn-primary">
                                                    Add Device to Cart
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
};

export default POS;
