import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { FaSearch } from 'react-icons/fa';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import './Inventory.css';

const Inventory = () => {
    const { user } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('in_stock');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [selectedItem, setSelectedItem] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [currentStep, setCurrentStep] = useState(1); // Step 1 or 2 for multi-step modal

    // Form state for add/edit
    const [formData, setFormData] = useState({
        brand: '',
        model: '',
        imei: '',
        vendor: '',
        color: '',
        storage: '',
        condition_status: 'New',
        price: '',
        cost_price: '',
        status: 'in_stock'
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

    // Fetch inventory
    const fetchInventory = async () => {
        try {
            setLoading(true);
            const response = await api.get('/inventory/read.php', {
                params: {
                    status: statusFilter,
                    search: searchTerm,
                    limit: 100
                }
            });

            if (response.data.success) {
                setInventory(response.data.inventory);
            } else {
                setError(response.data.error || 'Failed to load inventory');
            }
        } catch (err) {
            setError('Failed to load inventory');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, [statusFilter, searchTerm]);

    // Handle add item
    const handleAddItem = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post('/inventory/create.php', formData);

            if (response.data.success) {
                setShowAddModal(false);
                resetForm();
                fetchInventory();
            } else {
                setError(response.data.error || 'Failed to add item');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add item');
            console.error(err);
        }
    };

    // Handle edit item
    const handleEditItem = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.put('/inventory/update.php', {
                id: selectedItem.id,
                ...formData
            });

            if (response.data.success) {
                setShowEditModal(false);
                setSelectedItem(null);
                resetForm();
                fetchInventory();
            } else {
                setError(response.data.error || 'Failed to update item');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update item');
            console.error(err);
        }
    };

    // Handle delete item (Admin only)
    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item?')) {
            return;
        }

        setError('');

        try {
            const response = await api.delete('/inventory/delete.php', {
                data: { id: itemId }
            });

            if (response.data.success) {
                fetchInventory();
            } else {
                setError(response.data.error || 'Failed to delete item');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete item');
            console.error(err);
        }
    };

    // Open edit modal
    const openEditModal = (item) => {
        setSelectedItem(item);
        setFormData({
            brand: item.brand,
            model: item.model,
            imei: item.imei,
            vendor: item.vendor || '',
            color: item.color || '',
            storage: item.storage || '',
            condition_status: item.condition_status,
            price: item.price,
            cost_price: item.cost_price,
            status: item.status
        });
        setCurrentStep(1); // Reset to step 1
        setError(''); // Clear any errors
        setShowEditModal(true);
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            brand: '',
            model: '',
            imei: '',
            vendor: '',
            color: '',
            storage: '',
            color: '',
            storage: '',
            condition_status: 'New',
            price: '',
            price: '',
            cost_price: '',
            status: 'in_stock'
        });
        setCurrentStep(1); // Reset to step 1
    };

    // Validate Step 1 fields
    const validateStep1 = () => {
        if (!formData) return false;
        return formData.brand?.trim() !== '' &&
            formData.model?.trim() !== '' &&
            formData.imei?.trim() !== '' &&
            formData.imei?.length === 15;
    };

    // Handle Next button
    const handleNext = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (validateStep1()) {
            setCurrentStep(2);
            setError('');
        } else {
            setError('Please fill in all required fields in Step 1 (Brand, Model, and valid 15-digit IMEI)');
        }
    };

    // Handle Previous button
    const handlePrevious = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setCurrentStep(1);
        setError(''); // Clear any errors when going back
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
                    <div className="inventory-container">
                        <div className="inventory-header">
                            <div className="header-content">
                                <h1>Inventory Management</h1>
                                <p className="text-secondary">View and Manage Inventory</p>
                            </div>
                            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                                + Add Phone
                            </button>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <div className="search-bar-container">
                            <div className="search-input-wrapper">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by brand, model, IMEI, vendor, color, or storage..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="status-filter"
                            >
                                <option value="all">All Status</option>
                                <option value="in_stock">In Stock</option>
                                <option value="sold">Sold</option>
                                <option value="returned">Returned</option>
                            </select>
                        </div>

                        {loading ? (
                            <div className="loading">Loading inventory...</div>
                        ) : (
                            <div className="inventory-table-container">
                                <table className="inventory-table">
                                    <thead>
                                        <tr>
                                            <th>Brand</th>
                                            <th>Model</th>
                                            <th>IMEI</th>
                                            <th>Vendor</th>
                                            <th>Color</th>
                                            <th>Storage</th>
                                            <th>Condition</th>
                                            <th>Price</th>
                                            <th>Cost</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventory.length === 0 ? (
                                            <tr>
                                                <td colSpan="12" className="no-data">No inventory items found</td>
                                            </tr>
                                        ) : (
                                            inventory.map((item) => (
                                                <tr key={item.id}>
                                                    <td>{item.brand}</td>
                                                    <td>{item.model}</td>
                                                    <td>{item.imei}</td>
                                                    <td>{item.vendor || '-'}</td>
                                                    <td>{item.color || '-'}</td>
                                                    <td>{item.storage || '-'}</td>
                                                    <td>
                                                        <span className={`badge badge-${item.condition_status}`}>
                                                            {item.condition_status}
                                                        </span>
                                                    </td>
                                                    <td>₦{parseFloat(item.price).toFixed(2)}</td>
                                                    <td>₦{parseFloat(item.cost_price).toFixed(2)}</td>
                                                    <td>
                                                        <span className={`badge badge-${item.status}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="actions">
                                                        <button
                                                            className="btn-edit"
                                                            onClick={() => openEditModal(item)}
                                                        >
                                                            Edit
                                                        </button>
                                                        {(user.role === 'admin' || user.role === 'superadmin') && (
                                                            <button
                                                                className="btn-delete"
                                                                onClick={() => handleDeleteItem(item.id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Add Modal - Multi-Step */}
                        {showAddModal && (
                            <div className="modal-overlay" onClick={() => {
                                setShowAddModal(false);
                                resetForm();
                            }}>
                                <div className="modal-content" onClick={(e) => e.stopPropagation()}>

                                    <form onSubmit={handleAddItem}>
                                        {/* Step 1: Basic Information */}
                                        {currentStep === 1 && (
                                            <div className="form-step">
                                                <h3 className="step-title">Basic Information</h3>

                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Brand *</label>
                                                        <input
                                                            type="text"
                                                            value={formData.brand}
                                                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                                            placeholder="e.g., iPhone, Samsung"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Model *</label>
                                                        <input
                                                            type="text"
                                                            value={formData.model}
                                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                            placeholder="e.g., 14 Pro Max"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label>IMEI (15 digits) *</label>
                                                    <input
                                                        type="text"
                                                        value={formData.imei}
                                                        onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                                                        pattern="[0-9]{15}"
                                                        maxLength="15"
                                                        placeholder="Enter 15-digit IMEI"
                                                    />
                                                </div>

                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Color</label>
                                                        <input
                                                            type="text"
                                                            value={formData.color}
                                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                            placeholder="e.g., Black, White"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Storage</label>
                                                        <input
                                                            type="text"
                                                            value={formData.storage}
                                                            onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                                                            placeholder="e.g., 128GB, 256GB"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 2: Pricing & Status */}
                                        {currentStep === 2 && (
                                            <div className="form-step">
                                                <h3 className="step-title">Pricing & Status</h3>

                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Condition *</label>
                                                        <select
                                                            value={formData.condition_status}
                                                            onChange={(e) => setFormData({ ...formData, condition_status: e.target.value })}
                                                            required
                                                        >
                                                            <option value="New">New</option>
                                                            <option value="Open Box">Open Box</option>
                                                            <option value="UK Used">UK Used</option>
                                                            <option value="Used">Used</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Status *</label>
                                                        <select
                                                            value={formData.status}
                                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                            required
                                                        >
                                                            <option value="in_stock">In Stock</option>
                                                            <option value="returned">Returned</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Selling Price (₦) *</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={formData.price}
                                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                            placeholder="0.00"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Cost Price (₦) *</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={formData.cost_price}
                                                            onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                                            placeholder="0.00"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label>Vendor</label>
                                                    <input
                                                        type="text"
                                                        value={formData.vendor}
                                                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                                                        placeholder="e.g., Supplier Name"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Navigation Buttons */}
                                        <div className="modal-actions">
                                            {currentStep === 1 ? (
                                                <>
                                                    <button type="button" className="btn-secondary" onClick={() => {
                                                        setShowAddModal(false);
                                                        resetForm();
                                                    }}>
                                                        Cancel
                                                    </button>
                                                    <button type="button" className="btn-primary" onClick={handleNext}>
                                                        Next →
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button" className="btn-secondary" onClick={handlePrevious}>
                                                        ← Previous
                                                    </button>
                                                    <button type="submit" className="btn-primary">
                                                        Add Phone
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Edit Modal - Multi-Step */}
                        {showEditModal && selectedItem && (
                            <div className="modal-overlay" onClick={() => {
                                setShowEditModal(false);
                                setSelectedItem(null);
                                resetForm();
                            }}>
                                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                    <form onSubmit={handleEditItem}>
                                        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                                        {/* Step 1: Basic Information */}
                                        {currentStep === 1 && (
                                            <div className="form-step">
                                                <h3 className="step-title">Basic Information</h3>

                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Brand *</label>
                                                        <input
                                                            type="text"
                                                            value={formData.brand}
                                                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                                            placeholder="e.g., iPhone, Samsung"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Model *</label>
                                                        <input
                                                            type="text"
                                                            value={formData.model}
                                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                            placeholder="e.g., 14 Pro Max"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label>IMEI (15 digits) *</label>
                                                    <input
                                                        type="text"
                                                        value={formData.imei}
                                                        onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                                                        pattern="[0-9]{15}"
                                                        maxLength="15"
                                                        placeholder="Enter 15-digit IMEI"
                                                        disabled={user.role !== 'admin' && user.role !== 'superadmin'}
                                                        className={user.role !== 'admin' && user.role !== 'superadmin' ? 'disabled-input' : ''}
                                                    />
                                                    {user.role !== 'admin' && user.role !== 'superadmin' && (
                                                        <small>IMEI can only be edited by Admin</small>
                                                    )}
                                                </div>

                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Color</label>
                                                        <input
                                                            type="text"
                                                            value={formData.color}
                                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                            placeholder="e.g., Black, White"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Storage</label>
                                                        <input
                                                            type="text"
                                                            value={formData.storage}
                                                            onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                                                            placeholder="e.g., 128GB, 256GB"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 2: Pricing & Status */}
                                        {currentStep === 2 && (
                                            <div className="form-step">
                                                <h3 className="step-title">Pricing & Status</h3>

                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Condition *</label>
                                                        <select
                                                            value={formData.condition_status}
                                                            onChange={(e) => setFormData({ ...formData, condition_status: e.target.value })}
                                                            required
                                                        >
                                                            <option value="New">New</option>
                                                            <option value="Open Box">Open Box</option>
                                                            <option value="UK Used">UK Used</option>
                                                            <option value="Used">Used</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Status *</label>
                                                        <select
                                                            value={formData.status}
                                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                            required
                                                        >
                                                            <option value="in_stock">In Stock</option>
                                                            <option value="sold">Sold</option>
                                                            <option value="returned">Returned</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Selling Price (₦) *</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={formData.price}
                                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                            placeholder="0.00"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Cost Price (₦) *</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={formData.cost_price}
                                                            onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                                            placeholder="0.00"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label>Vendor</label>
                                                    <input
                                                        type="text"
                                                        value={formData.vendor}
                                                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                                                        placeholder="e.g., Supplier Name"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Navigation Buttons */}
                                        <div className="modal-actions">
                                            {currentStep === 1 ? (
                                                <>
                                                    <button type="button" className="btn-secondary" onClick={() => {
                                                        setShowEditModal(false);
                                                        setSelectedItem(null);
                                                        resetForm();
                                                    }}>
                                                        Cancel
                                                    </button>
                                                    <button type="button" className="btn-primary" onClick={handleNext}>
                                                        Next →
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button" className="btn-secondary" onClick={handlePrevious}>
                                                        ← Previous
                                                    </button>
                                                    <button type="submit" className="btn-primary">
                                                        Update Phone
                                                    </button>
                                                </>
                                            )}
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

export default Inventory;
