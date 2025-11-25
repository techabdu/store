import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import './POS.css';

const POS = () => {
    const { user } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Customer details
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Trade-in modal
    const [showTradeInModal, setShowTradeInModal] = useState(false);
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
            } else {
                setSidebarOpen(true);
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

        setCart([...cart, {
            type: 'sale',
            inventory_id: item.id,
            brand: item.brand,
            model: item.model,
            imei: item.imei,
            price: parseFloat(item.price)
        }]);

        setSearchTerm('');
        setInventory([]);
    };

    // Remove item from cart
    const removeFromCart = (index) => {
        setCart(cart.filter((_, i) => i !== index));
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

        setShowTradeInModal(false);
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

    // Calculate total
    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + item.price, 0);
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

        const total = calculateTotal();
        if (total < 0) {
            setError('Total amount cannot be negative');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/transactions/create.php', {
                customer_name: customerName,
                customer_phone: customerPhone,
                payment_method: paymentMethod,
                items: cart
            });

            if (response.data.success) {
                setSuccess(`Transaction completed successfully! Total: ₦${response.data.total_amount.toFixed(2)}`);

                // Reset form
                setCart([]);
                setCustomerName('');
                setCustomerPhone('');
                setPaymentMethod('cash');

                // Clear success message after 5 seconds
                setTimeout(() => setSuccess(''), 5000);
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
                        <h1>Point of Sale</h1>

                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <div className="pos-layout">
                            {/* Left Side - Product Search */}
                            <div className="pos-search-section">
                                <h2>Add Products</h2>

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

                                <button
                                    className="btn-trade-in"
                                    onClick={() => setShowTradeInModal(true)}
                                >
                                    + Add Trade-In
                                </button>
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
                                                    <span className={`cart-item-price ${item.type === 'trade_in' ? 'credit' : ''}`}>
                                                        {item.type === 'trade_in' ? '-' : ''}₦{Math.abs(item.price).toFixed(2)}
                                                    </span>
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
                                    <span>Total:</span>
                                    <span className="total-amount">₦{calculateTotal().toFixed(2)}</span>
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

                        {/* Trade-In Modal */}
                        {showTradeInModal && (
                            <div className="modal-overlay" onClick={() => setShowTradeInModal(false)}>
                                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                    <h2>Add Trade-In Device</h2>
                                    <form onSubmit={addTradeIn}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Brand *</label>
                                                <input
                                                    type="text"
                                                    value={tradeInData.brand}
                                                    onChange={(e) => setTradeInData({ ...tradeInData, brand: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Model *</label>
                                                <input
                                                    type="text"
                                                    value={tradeInData.model}
                                                    onChange={(e) => setTradeInData({ ...tradeInData, model: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>IMEI (15 digits) *</label>
                                            <input
                                                type="text"
                                                value={tradeInData.imei}
                                                onChange={(e) => setTradeInData({ ...tradeInData, imei: e.target.value })}
                                                pattern="[0-9]{15}"
                                                maxLength="15"
                                                required
                                            />
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Color</label>
                                                <input
                                                    type="text"
                                                    value={tradeInData.color}
                                                    onChange={(e) => setTradeInData({ ...tradeInData, color: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Storage</label>
                                                <input
                                                    type="text"
                                                    value={tradeInData.storage}
                                                    onChange={(e) => setTradeInData({ ...tradeInData, storage: e.target.value })}
                                                    placeholder="e.g., 128GB"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Trade-In Value *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={tradeInData.trade_in_value}
                                                onChange={(e) => setTradeInData({ ...tradeInData, trade_in_value: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="modal-actions">
                                            <button type="button" className="btn-secondary" onClick={() => {
                                                setShowTradeInModal(false);
                                                setTradeInData({
                                                    brand: '',
                                                    model: '',
                                                    imei: '',
                                                    color: '',
                                                    storage: '',
                                                    trade_in_value: ''
                                                });
                                            }}>
                                                Cancel
                                            </button>
                                            <button type="submit" className="btn-primary">
                                                Add to Cart
                                            </button>
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
