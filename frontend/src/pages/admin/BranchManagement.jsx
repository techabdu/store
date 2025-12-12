import React, { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    Plus,
    Trash2,
    Edit2,
    MapPin,
    Phone,
    Mail,
    DollarSign,
    Building,
    Star,
    X,
    AlertTriangle,
    Check
} from 'lucide-react';
import { FaSearch } from 'react-icons/fa';
import '../../styles/dashboard.css';
import './BranchManagement.css';

const BranchManagement = () => {
    const { user, isOwner, refreshShops } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        shop_name: '',
        shop_address: '',
        shop_phone: '',
        shop_email: '',
        business_capital: '',
        low_stock_threshold: '5'
    });

    // Fetch branches
    const fetchBranches = async () => {
        try {
            setLoading(true);
            const response = await api.get('/shops/list.php');
            if (response.data.success) {
                setBranches(response.data.shops);
            }
        } catch (err) {
            console.error('Failed to fetch branches:', err);
            setError('Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            shop_name: '',
            shop_address: '',
            shop_phone: '',
            shop_email: '',
            business_capital: '',
            low_stock_threshold: '5'
        });
        setCurrentStep(1);
    };

    const validateStep1 = () => {
        return formData.shop_name && formData.shop_name.trim() !== '';
    };

    const handleNext = (e) => {
        e.preventDefault();
        if (validateStep1()) {
            setCurrentStep(2);
        } else {
            alert('Please enter a branch name to proceed.');
        }
    };

    const handlePrevious = (e) => {
        e.preventDefault();
        setCurrentStep(1);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await api.post('/shops/create.php', {
                ...formData,
                business_capital: parseFloat(formData.business_capital) || 0,
                low_stock_threshold: parseInt(formData.low_stock_threshold) || 5
            });
            if (response.data.success) {
                setBranches([...branches, response.data.shop]);
                setShowCreateModal(false);
                resetForm();
                refreshShops(); // Update AuthContext shops list
                alert('Branch created successfully!');
            }
        } catch (err) {
            console.error('Failed to create branch:', err);
            alert(err.response?.data?.error || 'Failed to create branch');
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (branch) => {
        setSelectedBranch(branch);
        setFormData({
            shop_name: branch.shop_name,
            shop_address: branch.shop_address || '',
            shop_phone: branch.shop_phone || '',
            shop_email: branch.shop_email || '',
            business_capital: branch.business_capital || '',
            low_stock_threshold: branch.low_stock_threshold || '5'
        });
        setCurrentStep(1);
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBranch) return;

        setSubmitting(true);
        try {
            const response = await api.put('/shops/update.php', {
                id: selectedBranch.id,
                ...formData,
                business_capital: parseFloat(formData.business_capital) || 0,
                low_stock_threshold: parseInt(formData.low_stock_threshold) || 5
            });
            if (response.data.success) {
                setBranches(branches.map(b =>
                    b.id === selectedBranch.id
                        ? { ...b, ...formData, business_capital: parseFloat(formData.business_capital) || 0, low_stock_threshold: parseInt(formData.low_stock_threshold) || 5 }
                        : b
                ));
                setShowEditModal(false);
                setSelectedBranch(null);
                resetForm();
                refreshShops();
                alert('Branch updated successfully!');
            }
        } catch (err) {
            console.error('Failed to update branch:', err);
            alert(err.response?.data?.error || 'Failed to update branch');
        } finally {
            setSubmitting(false);
        }
    };

    const openDeleteModal = (branch) => {
        setSelectedBranch(branch);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!selectedBranch) return;

        setSubmitting(true);
        try {
            const response = await api.delete('/shops/delete.php', {
                data: {
                    id: selectedBranch.id,
                    confirm: true
                }
            });
            if (response.data.success) {
                setBranches(branches.filter(b => b.id !== selectedBranch.id));
                setShowDeleteModal(false);
                setSelectedBranch(null);
                refreshShops();
                alert('Branch deleted successfully!');
            }
        } catch (err) {
            console.error('Failed to delete branch:', err);
            alert(err.response?.data?.error || 'Failed to delete branch');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredBranches = branches.filter(b =>
        b.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.shop_address && b.shop_address.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    // Check if user is owner
    if (!isOwner) {
        return (
            <div className="dashboard-container">
                <TopBar toggleSidebar={toggleSidebar} user={user} />
                <Sidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />
                <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                    <div className="content-wrapper">
                        <div className="access-denied">
                            <AlertTriangle size={48} />
                            <h2>Access Denied</h2>
                            <p>Only shop owners can manage branches.</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

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
                    {/* Page Header */}
                    <div className="branch-management-header">
                        <div>
                            <h1 className="heading-1">Branch Management</h1>
                            <p className="text-secondary">Manage your store locations and branches</p>
                        </div>
                        <button className="add-branch-btn" onClick={() => {
                            setShowCreateModal(true);
                            resetForm();
                        }}>
                            <Plus size={20} />
                            Add Branch
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="search-bar-container">
                        <div className="search-input-wrapper">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search by name or address..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Branches Grid */}
                    {loading ? (
                        <div className="loading-state">Loading branches...</div>
                    ) : error ? (
                        <div className="error-state">{error}</div>
                    ) : (
                        <div className="branches-grid">
                            {filteredBranches.map((branch) => (
                                <div key={branch.id} className={`branch-card ${branch.is_main_branch ? 'main-branch' : ''}`}>
                                    <div className="branch-card-header">
                                        <div className="branch-icon">
                                            <Building size={24} />
                                        </div>
                                        <div className="branch-title-section">
                                            <h3 className="branch-name">
                                                {branch.shop_name}
                                                {branch.is_main_branch && (
                                                    <span className="main-badge">
                                                        <Star size={12} /> Main
                                                    </span>
                                                )}
                                            </h3>
                                            <span className={`status-badge ${branch.status}`}>
                                                {branch.status}
                                            </span>
                                        </div>
                                        <div className="branch-actions">
                                            <button
                                                className="action-btn edit"
                                                title="Edit Branch"
                                                onClick={() => openEditModal(branch)}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            {!branch.is_main_branch && (
                                                <button
                                                    className="action-btn delete"
                                                    title="Delete Branch"
                                                    onClick={() => openDeleteModal(branch)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="branch-card-body">
                                        {branch.shop_address && (
                                            <div className="branch-info-row">
                                                <MapPin size={16} />
                                                <span>{branch.shop_address}</span>
                                            </div>
                                        )}
                                        {branch.shop_phone && (
                                            <div className="branch-info-row">
                                                <Phone size={16} />
                                                <span>{branch.shop_phone}</span>
                                            </div>
                                        )}
                                        {branch.shop_email && (
                                            <div className="branch-info-row">
                                                <Mail size={16} />
                                                <span>{branch.shop_email}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="branch-card-footer">
                                        <div className="capital-display">
                                            <DollarSign size={16} />
                                            <span>Capital: {formatCurrency(branch.business_capital)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredBranches.length === 0 && (
                                <div className="empty-state">
                                    <Building size={48} />
                                    <p>No branches found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Branch Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleCreateSubmit}>
                            <div className="modal-body">
                                {currentStep === 1 && (
                                    <div className="form-step">
                                        <h3 className="step-title">Basic Information</h3>
                                        <div className="form-group">
                                            <label>Branch Name *</label>
                                            <input
                                                type="text"
                                                name="shop_name"
                                                className="form-input"
                                                value={formData.shop_name}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Enter branch name"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Address</label>
                                            <input
                                                type="text"
                                                name="shop_address"
                                                className="form-input"
                                                value={formData.shop_address}
                                                onChange={handleInputChange}
                                                placeholder="Enter branch address"
                                            />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Phone</label>
                                                <input
                                                    type="tel"
                                                    name="shop_phone"
                                                    className="form-input"
                                                    value={formData.shop_phone}
                                                    onChange={handleInputChange}
                                                    placeholder="+234..."
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Email</label>
                                                <input
                                                    type="email"
                                                    name="shop_email"
                                                    className="form-input"
                                                    value={formData.shop_email}
                                                    onChange={handleInputChange}
                                                    placeholder="branch@example.com"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="form-step">
                                        <h3 className="step-title">Business Constraints</h3>
                                        <div className="form-group">
                                            <label>Starting Capital (₦)</label>
                                            <input
                                                type="number"
                                                name="business_capital"
                                                className="form-input"
                                                value={formData.business_capital}
                                                onChange={handleInputChange}
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Low Stock Threshold</label>
                                            <input
                                                type="number"
                                                name="low_stock_threshold"
                                                className="form-input"
                                                value={formData.low_stock_threshold}
                                                onChange={handleInputChange}
                                                min="1"
                                                placeholder="5"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                {currentStep === 1 ? (
                                    <>
                                        <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
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
                                        <button type="submit" className="btn-primary" disabled={submitting}>
                                            {submitting ? 'Creating...' : 'Create Branch'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Branch Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body">
                                {currentStep === 1 && (
                                    <div className="form-step">
                                        <h3 className="step-title">Basic Information</h3>
                                        <div className="form-group">
                                            <label>Branch Name *</label>
                                            <input
                                                type="text"
                                                name="shop_name"
                                                className="form-input"
                                                value={formData.shop_name}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Address</label>
                                            <input
                                                type="text"
                                                name="shop_address"
                                                className="form-input"
                                                value={formData.shop_address}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Phone</label>
                                                <input
                                                    type="tel"
                                                    name="shop_phone"
                                                    className="form-input"
                                                    value={formData.shop_phone}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Email</label>
                                                <input
                                                    type="email"
                                                    name="shop_email"
                                                    className="form-input"
                                                    value={formData.shop_email}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="form-step">
                                        <h3 className="step-title">Business Constraints</h3>
                                        <div className="form-group">
                                            <label>Business Capital (₦)</label>
                                            <input
                                                type="number"
                                                name="business_capital"
                                                className="form-input"
                                                value={formData.business_capital}
                                                onChange={handleInputChange}
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Low Stock Threshold</label>
                                            <input
                                                type="number"
                                                name="low_stock_threshold"
                                                className="form-input"
                                                value={formData.low_stock_threshold}
                                                onChange={handleInputChange}
                                                min="1"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                {currentStep === 1 ? (
                                    <>
                                        <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
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
                                        <button type="submit" className="btn-primary" disabled={submitting}>
                                            {submitting ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header danger">
                            <AlertTriangle size={24} />
                            <h2 className="modal-title">Delete Branch</h2>
                            <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="delete-warning">
                                Are you sure you want to delete <strong>{selectedBranch?.shop_name}</strong>?
                            </p>
                            <p className="delete-info">
                                This action will permanently delete all data associated with this branch, including:
                            </p>
                            <ul className="delete-list">
                                <li>All inventory items</li>
                                <li>All transactions</li>
                                <li>All expenses</li>
                                <li>All activity logs</li>
                            </ul>
                            <p className="delete-note">This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                onClick={handleDelete}
                                disabled={submitting}
                            >
                                {submitting ? 'Deleting...' : 'Delete Branch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchManagement;
