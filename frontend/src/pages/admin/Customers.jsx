import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../utils/api';
import { Plus, ArrowLeft, Check, Package, Edit2, Trash2, Filter, ChevronRight, Search, Phone, MapPin, Calendar, Smartphone, X, User, Printer, CreditCard } from 'lucide-react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import './Customers.css';

const Customers = () => {
    const { user } = useAuth();
    const [view, setView] = useState('list'); // 'list', 'details'
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerHistory, setCustomerHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPhone, setSelectedPhone] = useState(null);

    // Lazy Loading State for Customer List
    const [visibleCount, setVisibleCount] = useState(20);
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

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Fetch customers on mount
    useEffect(() => {
        fetchCustomers();
    }, []);

    // Intersection Observer for Lazy Loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && filteredCustomers.length > visibleCount) {
                    setVisibleCount(prev => prev + 20);
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
    }, [customers.length, visibleCount, searchTerm]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers.php', {
                params: { action: 'get_customers' }
            });
            if (response.data.success) {
                setCustomers(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtered customers
    const filteredCustomers = useMemo(() => {
        if (!searchTerm.trim()) return customers;
        const lowerTerm = searchTerm.toLowerCase();
        return customers.filter(c =>
            c.customer_name.toLowerCase().includes(lowerTerm) ||
            (c.customer_phone && c.customer_phone.includes(lowerTerm))
        );
    }, [searchTerm, customers]);

    // Displayed customers (sliced for lazy loading)
    const displayedCustomers = useMemo(() => {
        return filteredCustomers.slice(0, visibleCount);
    }, [filteredCustomers, visibleCount]);

    const handleCustomerClick = async (customer) => {
        setSelectedCustomer(customer);
        setLoadingHistory(true);
        try {
            const response = await api.get('/customers.php', {
                params: {
                    action: 'get_customer_details',
                    name: customer.customer_name,
                    phone: customer.customer_phone || ''
                }
            });
            if (response.data.success) {
                setCustomerHistory(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching customer history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handlePhoneClick = (phone) => {
        setSelectedPhone(phone);
        setView('phone-details');
    };

    const closePhoneDetails = () => {
        setView('list');
        setSelectedPhone(null);
    };

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const getRandomColor = (name) => {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
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
                    {view === 'list' ? (
                        <>
                            <div className="page-header">
                                <div>
                                    <h1 className="heading-1">Customers</h1>
                                    <p className="text-secondary">View and manage customer purchase history</p>
                                </div>
                            </div>

                            <div className="customers-container">
                                {/* Left Panel: Customer List */}
                                <div className={`customers-list-panel glass-card ${selectedCustomer ? 'hidden-mobile' : ''}`}>
                                    <div className="search-bar-container">
                                        <div className="search-input-wrapper">
                                            <Search className="search-icon" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Search customers..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="customers-list">
                                        {loading ? (
                                            <div className="loading-state">Loading customers...</div>
                                        ) : displayedCustomers.length === 0 ? (
                                            <div className="empty-state">No customers found</div>
                                        ) : (
                                            <>
                                                {displayedCustomers.map((customer, index) => (
                                                    <div
                                                        key={index}
                                                        className={`customer-item ${selectedCustomer === customer ? 'active' : ''}`}
                                                        onClick={() => handleCustomerClick(customer)}
                                                    >
                                                        <div
                                                            className="customer-avatar"
                                                            style={{ backgroundColor: getRandomColor(customer.customer_name) }}
                                                        >
                                                            {getInitials(customer.customer_name)}
                                                        </div>
                                                        <div className="customer-info-preview">
                                                            <h3>{customer.customer_name}</h3>
                                                            {customer.customer_phone && (
                                                                <p> {customer.customer_phone}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Lazy Load Trigger */}
                                                {filteredCustomers.length > visibleCount && (
                                                    <div ref={observerTarget} className="lazy-load-trigger">
                                                        <span className="loading-dots">Loading more customers</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Right Panel: Customer Details */}
                                <div className={`customer-details-panel glass-card ${!selectedCustomer ? 'hidden-mobile' : ''}`}>
                                    {selectedCustomer ? (
                                        <>
                                            <div className="details-header-mobile">
                                                <button onClick={() => setSelectedCustomer(null)}>Back to List</button>
                                            </div>

                                            <div className="customer-profile-header">
                                                <div
                                                    className="large-avatar"
                                                    style={{ backgroundColor: getRandomColor(selectedCustomer.customer_name) }}
                                                >
                                                    {getInitials(selectedCustomer.customer_name)}
                                                </div>
                                                <h2>{selectedCustomer.customer_name}</h2>
                                                {selectedCustomer.customer_phone && (
                                                    <p className="phone-number" style={{ marginBottom: selectedCustomer.customer_address ? '5px' : '20px' }}>
                                                        <Phone size={16} /> {selectedCustomer.customer_phone}
                                                    </p>
                                                )}
                                                {selectedCustomer.customer_address && (
                                                    <p className="address-text" style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                                        <MapPin size={16} /> {selectedCustomer.customer_address}
                                                    </p>
                                                )}
                                                <div className="customer-stats">
                                                    <div className="stat-item glass-card">
                                                        <span className="stat-label">Total Purchases</span>
                                                        <span className="stat-value">{selectedCustomer.total_purchases}</span>
                                                    </div>
                                                    <div className="stat-item glass-card">
                                                        <span className="stat-label">Total Spent</span>
                                                        <span className="stat-value">₦{parseFloat(selectedCustomer.total_spent).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="purchase-history-section">
                                                <h3>Purchase History</h3>
                                                {loadingHistory ? (
                                                    <div className="loading-state">Loading history...</div>
                                                ) : customerHistory.length === 0 ? (
                                                    <div className="empty-state">No purchase history</div>
                                                ) : (
                                                    <div className="history-list">
                                                        {customerHistory.map((item) => (
                                                            <div
                                                                key={item.transaction_id + item.imei}
                                                                className="history-item glass-card"
                                                                onClick={() => handlePhoneClick(item)}
                                                                style={{ marginBottom: '10px', border: 'none' }}
                                                            >
                                                                <div className="phone-icon">
                                                                    <Smartphone size={20} />
                                                                </div>
                                                                <div className="history-details">
                                                                    <h4>{item.brand} {item.model}</h4>
                                                                    <p className="purchase-date">
                                                                        <Calendar size={14} /> {new Date(item.purchase_date).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                                <div className="history-arrow">›</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="select-prompt">
                                            <User className="prompt-icon" size={64} />
                                            <p>Select a customer to view details</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="focus-view-container">
                            <div className="focus-view-header">
                                <button className="btn-back" onClick={closePhoneDetails}>
                                    <ArrowLeft size={18} />
                                    <span>Back to Customer</span>
                                </button>
                                <h2>Phone Purchase Details</h2>
                            </div>

                            <div className="focus-view-content">
                                <div className="focus-view-card glass-card">
                                    <div className="focus-view-body">
                                        <div className="detail-section">
                                            <div className="section-header">
                                                <div className="section-icon">
                                                    <Package size={20} />
                                                </div>
                                                <h4>Device Information</h4>
                                            </div>
                                            <div className="summary-grid-focus">
                                                <div className="summary-item-focus">
                                                    <span className="label">Brand & Model</span>
                                                    <span className="value">{selectedPhone?.brand} {selectedPhone?.model}</span>
                                                </div>
                                                <div className="summary-item-focus">
                                                    <span className="label">IMEI</span>
                                                    <span className="value" style={{ fontSize: '1.2rem' }}>{selectedPhone?.imei}</span>
                                                </div>
                                                <div className="summary-item-focus">
                                                    <span className="label">Color</span>
                                                    <span className="value">{selectedPhone?.color || 'N/A'}</span>
                                                </div>
                                                <div className="summary-item-focus">
                                                    <span className="label">Storage</span>
                                                    <span className="value">{selectedPhone?.storage || 'N/A'}</span>
                                                </div>
                                                <div className="summary-item-focus">
                                                    <span className="label">Condition</span>
                                                    <span className="value capitalize">{selectedPhone?.condition_status}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="divider"></div>

                                        <div className="detail-section">
                                            <div className="section-header">
                                                <div className="section-icon">
                                                    <CreditCard size={20} />
                                                </div>
                                                <h4>Transaction Details</h4>
                                            </div>
                                            <div className="summary-grid-focus">
                                                <div className="summary-item-focus">
                                                    <span className="label">Sold Price</span>
                                                    <span className="value" style={{ color: 'var(--success-color)' }}>
                                                        ₦{parseFloat(selectedPhone?.item_price).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="summary-item-focus">
                                                    <span className="label">Date Sold</span>
                                                    <span className="value" style={{ fontSize: '1.2rem' }}>
                                                        {new Date(selectedPhone?.purchase_date).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="focus-view-actions">
                                    <button className="btn-cancel" onClick={closePhoneDetails}>
                                        Close View
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            if (selectedPhone && selectedPhone.transaction_id) {
                                                window.open(`/admin/receipt/${selectedPhone.transaction_id}`, '_blank');
                                            }
                                        }}
                                    >
                                        <Printer size={18} /> Print Receipt
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Customers;

