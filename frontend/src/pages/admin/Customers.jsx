import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FaSearch, FaPhone, FaCalendarAlt, FaMobileAlt, FaTimes, FaUser } from 'react-icons/fa';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import './Customers.css';

const Customers = () => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerHistory, setCustomerHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPhone, setSelectedPhone] = useState(null);
    const [showPhoneModal, setShowPhoneModal] = useState(false);

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

    // Filter customers when search term changes
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredCustomers(customers);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = customers.filter(c =>
                c.customer_name.toLowerCase().includes(lowerTerm) ||
                (c.customer_phone && c.customer_phone.includes(lowerTerm))
            );
            setFilteredCustomers(filtered);
        }
    }, [searchTerm, customers]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers.php', {
                params: { action: 'get_customers' }
            });
            if (response.data.success) {
                setCustomers(response.data.data);
                setFilteredCustomers(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

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
        setShowPhoneModal(true);
    };

    const closePhoneModal = () => {
        setShowPhoneModal(false);
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
                    <div className="page-header">
                        <div>
                            <h1 className="heading-1">Customers</h1>
                            <p className="text-secondary">View and manage customer purchase history</p>
                        </div>
                    </div>

                    <div className="customers-container dashboard-card">
                        {/* Left Panel: Customer List */}
                        <div className={`customers-list-panel ${selectedCustomer ? 'hidden-mobile' : ''}`}>
                            <div className="search-bar-container">
                                <div className="search-input-wrapper">
                                    <FaSearch className="search-icon" />
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
                                ) : filteredCustomers.length === 0 ? (
                                    <div className="empty-state">No customers found</div>
                                ) : (
                                    filteredCustomers.map((customer, index) => (
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
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right Panel: Customer Details */}
                        <div className={`customer-details-panel ${!selectedCustomer ? 'hidden-mobile' : ''}`}>
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
                                            <p className="phone-number">
                                                <FaPhone /> {selectedCustomer.customer_phone}
                                            </p>
                                        )}
                                        <div className="customer-stats">
                                            <div className="stat-item">
                                                <span className="stat-label">Total Purchases</span>
                                                <span className="stat-value">{selectedCustomer.total_purchases}</span>
                                            </div>
                                            <div className="stat-item">
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
                                                        className="history-item"
                                                        onClick={() => handlePhoneClick(item)}
                                                    >
                                                        <div className="phone-icon">
                                                            <FaMobileAlt />
                                                        </div>
                                                        <div className="history-details">
                                                            <h4>{item.brand} {item.model}</h4>
                                                            <p className="purchase-date">
                                                                <FaCalendarAlt /> {new Date(item.purchase_date).toLocaleDateString()}
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
                                    <FaUser className="prompt-icon" />
                                    <p>Select a customer to view details</p>
                                </div>
                            )}
                        </div>

                        {/* Phone Details Modal */}
                        {showPhoneModal && selectedPhone && (
                            <div className="modal-overlay" onClick={closePhoneModal}>
                                <div className="modal-content" onClick={e => e.stopPropagation()}>
                                    <div className="modal-header">
                                        <h3>Phone Details</h3>
                                        <button className="close-btn" onClick={closePhoneModal}><FaTimes /></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="phone-detail-row">
                                            <span className="label">Device:</span>
                                            <span className="value">{selectedPhone.brand} {selectedPhone.model}</span>
                                        </div>
                                        <div className="phone-detail-row">
                                            <span className="label">IMEI:</span>
                                            <span className="value">{selectedPhone.imei}</span>
                                        </div>
                                        <div className="phone-detail-row">
                                            <span className="label">Color:</span>
                                            <span className="value">{selectedPhone.color || 'N/A'}</span>
                                        </div>
                                        <div className="phone-detail-row">
                                            <span className="label">Storage:</span>
                                            <span className="value">{selectedPhone.storage || 'N/A'}</span>
                                        </div>
                                        <div className="phone-detail-row">
                                            <span className="label">Condition:</span>
                                            <span className="value capitalize">{selectedPhone.condition_status}</span>
                                        </div>
                                        <div className="phone-detail-row">
                                            <span className="label">Price Sold:</span>
                                            <span className="value">₦{parseFloat(selectedPhone.item_price).toLocaleString()}</span>
                                        </div>
                                        <div className="phone-detail-row">
                                            <span className="label">Purchase Date:</span>
                                            <span className="value">{new Date(selectedPhone.purchase_date).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Customers;

