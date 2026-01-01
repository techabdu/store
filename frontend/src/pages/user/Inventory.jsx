import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import { Plus, ArrowLeft, Check, Package, Edit2, Trash2, Filter, ChevronRight, Search } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import './Inventory.css';
import '../../styles/wizard.css';

const Inventory = () => {
    const { user } = useAuth();
    const { showError, showSuccess } = useNotification();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(''); // Keep this for hard data loading errors
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('in_stock');
    const [view, setView] = useState('list'); // 'list', 'add', 'edit'

    const [selectedItem, setSelectedItem] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [visibleRows, setVisibleRows] = useState(20);
    const [submitting, setSubmitting] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

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

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Fetch inventory when filters or debounced search changes
    useEffect(() => {
        fetchInventory(isInitialLoad);
    }, [statusFilter, debouncedSearchTerm]);

    // Vendors State
    const [vendors, setVendors] = useState([]);

    // Fetch vendors for dropdown
    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const response = await api.get('/admin/vendors.php?status=active');
                if (response.data.success) {
                    setVendors(response.data.vendors);
                }
            } catch (err) {
                console.error("Failed to fetch vendors:", err);
                showError('Unable to load the vendor list.');
            }
        };
        fetchVendors();
    }, []);

    // Fetch inventory function
    const fetchInventory = async (showGlobalLoading = false) => {
        try {
            if (showGlobalLoading) setLoading(true);
            setIsSearching(true);

            const response = await api.get('/inventory/read.php', {
                params: {
                    status: statusFilter,
                    search: debouncedSearchTerm,
                    limit: 200
                }
            });

            if (response.data.success) {
                setInventory(response.data.inventory);
                setVisibleRows(20);
                if (showGlobalLoading) setIsInitialLoad(false);
            } else {
                setError(response.data.error || 'Failed to load inventory');
            }
        } catch (err) {
            setError('Failed to load inventory');
            console.error('Fetch inventory error:', err);
            showError('Unable to load the inventory list.');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const loadMore = () => {
        setVisibleRows(prev => prev + 20);
    };

    // Handle add item
    const handleAddItem = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);

        try {
            const response = await api.post('/inventory/create.php', formData);

            if (response.data.success) {
                setView('list');
                resetForm();
                fetchInventory();
                showSuccess('The new item has been successfully added to the inventory.');
            } else {
                showError(response.data.error || 'Unable to add the new item.');
            }
        } catch (err) {
            showError(err.response?.data?.error || 'Unable to add the new item.');
            console.error('Add item error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle edit item
    const handleEditItem = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);

        try {
            const response = await api.put('/inventory/update.php', {
                id: selectedItem.id,
                ...formData
            });

            if (response.data.success) {
                setView('list');
                setSelectedItem(null);
                resetForm();
                fetchInventory();
                showSuccess('The item has been successfully updated.');
            } else {
                showError(response.data.error || 'Unable to update the item details.');
            }
        } catch (err) {
            showError(err.response?.data?.error || 'Unable to update the item details.');
            console.error('Update item error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete item
    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await api.delete('/inventory/delete.php', {
                data: { id: itemId }
            });

            if (response.data.success) {
                fetchInventory();
                showSuccess('The item has been removed from the inventory.');
            } else {
                showError(response.data.error || 'Unable to delete the item.');
            }
        } catch (err) {
            showError(err.response?.data?.error || 'Unable to delete the item.');
            console.error('Delete item error:', err);
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
        setCurrentStep(1);
        setError('');
        setView('edit');
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
            condition_status: 'New',
            price: '',
            cost_price: '',
            status: 'in_stock'
        });
        setCurrentStep(1);
    };

    // Validate Step 1
    const validateStep1 = () => {
        return formData.brand?.trim() !== '' &&
            formData.model?.trim() !== '' &&
            formData.imei?.trim() !== '' &&
            formData.imei?.length === 15;
    };

    const handleNext = (e) => {
        if (e) e.preventDefault();
        if (validateStep1()) {
            setCurrentStep(2);
        } else {
            showError('Please provide the brand, model, and a valid 15-digit IMEI.');
        }
    };

    const handlePrevious = (e) => {
        if (e) e.preventDefault();
        setCurrentStep(1);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    return (
        <AdminLayout
            title={view === 'list' ? "Inventory Management" : (view === 'add' ? "Add New Phone" : "Edit Item")}
            subtitle={view === 'list' ? "Track and manage your mobile device stock" : ""}
            loading={loading && isInitialLoad && view === 'list'}
            error={view === 'list' ? error : null}
            headerActions={view === 'list' && (
                <button className="btn-primary" onClick={() => {
                    setView('add');
                    resetForm();
                }} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px', whiteSpace: 'nowrap' }}>
                    <Plus size={20} />
                    <span className="btn-text">Add New Phone</span>
                </button>
            )}
        >
            <div className="inventory-page-container">
                {view === 'list' ? (
                    <>
                        {/* Unified Toolbar: Search, Add, and Filter */}
                        <div className="search-filter-section mb-24">
                            <div className="search-input-wrapper">
                                {isSearching ? (
                                    <div className="search-icon-new searching-icon">
                                        <div className="tiny-spinner"></div>
                                    </div>
                                ) : (
                                    <Search size={18} className="search-icon-new" />
                                )}
                                <input
                                    type="text"
                                    placeholder="Search brand, model, IMEI, vendor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input-new"
                                />
                            </div>

                            <div className="filter-group-new">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="filter-select-new"
                                >
                                    <option value="all">All Status</option>
                                    <option value="in_stock">In Stock</option>
                                    <option value="in_transit">In Transit</option>
                                    <option value="sold">Sold</option>
                                    <option value="returned">Returned</option>
                                </select>
                            </div>
                        </div>

                        {/* Inventory Table */}
                        <div className="table-container glass-card">
                            <div className="table-responsive">
                                <table className="inventory-table">
                                    <thead>
                                        <tr>
                                            <th>Device Details</th>
                                            <th>IMEI / ID</th>
                                            <th>Vendor</th>
                                            <th>Condition</th>
                                            <th>Prices</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventory.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="empty-row">
                                                    <div className="empty-state">
                                                        <Package size={48} />
                                                        <p>No inventory items matching your filters</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            inventory.slice(0, visibleRows).map((item) => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div className="device-cell">
                                                            <div className="device-main">{item.brand} {item.model}</div>
                                                            <div className="device-sub">{item.color} | {item.storage}</div>
                                                        </div>
                                                    </td>
                                                    <td><span className="imei-badge">{item.imei}</span></td>
                                                    <td><span className="vendor-text">{item.vendor || 'Direct Purchase'}</span></td>
                                                    <td>
                                                        <span className={`condition-badge ${item.condition_status.toLowerCase().replace(' ', '-')}`}>
                                                            {item.condition_status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="price-cell">
                                                            <div className="price-sell">{formatCurrency(item.price)}</div>
                                                            <div className="price-cost">Cost: {formatCurrency(item.cost_price)}</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${item.status}`}>
                                                            {item.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="icon-btn edit"
                                                                onClick={() => openEditModal(item)}
                                                                title="Edit Item"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            {(user.role === 'admin' || user.role === 'superadmin') && (
                                                                <button
                                                                    className="icon-btn delete"
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                    title="Delete Item"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {visibleRows < inventory.length && (
                            <div className="load-more-container">
                                <button className="btn-load-more" onClick={loadMore}>
                                    Load More Inventory
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="focus-view-container">
                        <div className="focus-view-header">
                            <button className="btn-back" onClick={() => setView('list')}>
                                <ArrowLeft size={18} />
                                <span>Back to Inventory</span>
                            </button>
                            <h2>
                                {view === 'add' ? 'Add New Phone' : `Update Stock: ${selectedItem?.brand} ${selectedItem?.model}`}
                            </h2>
                        </div>

                        <div className="focus-view-content">
                            <form onSubmit={view === 'add' ? handleAddItem : handleEditItem}>
                                <div className="focus-view-card glass-card">
                                    <div className="wizard-steps">
                                        <div className={`step ${currentStep === 1 ? 'active' : 'completed'}`}>
                                            <div className="step-number">{currentStep > 1 ? <Check size={14} /> : '1'}</div>
                                            <div className="step-label">Device Info</div>
                                        </div>
                                        <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
                                            <div className="step-number">2</div>
                                            <div className="step-label">Financials</div>
                                        </div>
                                    </div>

                                    <div className="focus-view-body">
                                        {currentStep === 1 ? (
                                            <div className="form-grid-focus">
                                                <div className="form-group-focus">
                                                    <label>Brand Name *</label>
                                                    <input
                                                        type="text"
                                                        className="form-input-focus"
                                                        value={formData.brand}
                                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                                        placeholder="e.g. Apple"
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group-focus">
                                                    <label>Model Name *</label>
                                                    <input
                                                        type="text"
                                                        className="form-input-focus"
                                                        value={formData.model}
                                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                        placeholder="e.g. iPhone 15 Pro"
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group-focus full-width">
                                                    <label>IMEI Number (15 Digits) *</label>
                                                    <input
                                                        type="text"
                                                        className={`form-input-focus ${(user.role !== 'admin' && user.role !== 'superadmin' && view === 'edit') ? 'locked' : ''}`}
                                                        value={formData.imei}
                                                        onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                                                        pattern="[0-9]{15}"
                                                        maxLength="15"
                                                        placeholder="000000000000000"
                                                        disabled={user.role !== 'admin' && user.role !== 'superadmin' && view === 'edit'}
                                                        required
                                                    />
                                                    {user.role !== 'admin' && user.role !== 'superadmin' && view === 'edit' && (
                                                        <p className="field-note">IMEI can only be modified by administrators</p>
                                                    )}
                                                </div>
                                                <div className="form-group-focus">
                                                    <label>Color</label>
                                                    <input
                                                        type="text"
                                                        className="form-input-focus"
                                                        value={formData.color}
                                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                        placeholder="e.g. Titanium"
                                                    />
                                                </div>
                                                <div className="form-group-focus">
                                                    <label>Storage</label>
                                                    <input
                                                        type="text"
                                                        className="form-input-focus"
                                                        value={formData.storage}
                                                        onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                                                        placeholder="e.g. 512GB"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="form-grid-focus">
                                                <div className="form-group-focus">
                                                    <label>Device Condition *</label>
                                                    <select
                                                        className="form-input-focus"
                                                        value={formData.condition_status}
                                                        onChange={(e) => setFormData({ ...formData, condition_status: e.target.value })}
                                                        required
                                                    >
                                                        <option value="New">Brand New</option>
                                                        <option value="Open Box">Open Box</option>
                                                        <option value="UK Used">UK Used</option>
                                                        <option value="Used">Local Used</option>
                                                    </select>
                                                </div>
                                                <div className="form-group-focus">
                                                    <label>Inventory Status *</label>
                                                    <select
                                                        className="form-input-focus"
                                                        value={formData.status}
                                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                        required
                                                    >
                                                        <option value="in_stock">Ready for Sale (In Stock)</option>
                                                        <option value="in_transit">In Transit</option>
                                                        <option value="returned">Returned / RMA</option>
                                                        {view === 'edit' && <option value="sold">Marked as Sold</option>}
                                                    </select>
                                                </div>
                                                <div className="form-group-focus">
                                                    <label>Expected Sales Price (₦) *</label>
                                                    <input
                                                        type="number"
                                                        className="form-input-focus"
                                                        value={formData.price}
                                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group-focus">
                                                    <label>Purchase Cost (₦) *</label>
                                                    <input
                                                        type="number"
                                                        className="form-input-focus"
                                                        value={formData.cost_price}
                                                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group-focus full-width">
                                                    <label>Vendor / Supplier Details</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="text"
                                                            className="form-input-focus"
                                                            value={formData.vendor}
                                                            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                                                            placeholder="Select or type supplier name/contact"
                                                            list="vendor-options"
                                                        />
                                                        <datalist id="vendor-options">
                                                            {vendors.map(v => (
                                                                <option key={v.id} value={v.name}>{v.contact_info ? ` (${v.contact_info})` : ''}</option>
                                                            ))}
                                                        </datalist>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="focus-view-actions">
                                    {currentStep === 1 ? (
                                        <button type="button" className="btn-cancel" onClick={() => setView('list')}>
                                            Discard Changes
                                        </button>
                                    ) : (
                                        <button type="button" className="btn-cancel" onClick={handlePrevious}>
                                            ← Go Back
                                        </button>
                                    )}

                                    {currentStep === 1 ? (
                                        <button type="button" className="btn-primary" onClick={handleNext}>
                                            Continue to Pricing →
                                        </button>
                                    ) : (
                                        <button type="submit" className="btn-primary" disabled={submitting}>
                                            {submitting ? 'Processing...' : (view === 'add' ? 'Confirm & Stock In' : 'Save Changes')}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout >
    );
};

export default Inventory;
