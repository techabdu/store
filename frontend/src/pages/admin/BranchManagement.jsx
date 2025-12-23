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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [view, setView] = useState('list'); // 'list', 'add', 'edit'
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
                setView('list');
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
        setView('edit');
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
                setView('list');
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
                    {view === 'list' ? (
                        <>
                            {/* Page Header */}
                            <div className="branch-management-header">
                                <div>
                                    <h1 className="heading-1">Branch Management</h1>
                                    <p className="text-secondary">Manage your store locations and branches</p>
                                </div>
                                <button className="add-branch-btn" onClick={() => {
                                    setView('add');
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
                                                <div className="branch-icon-container">
                                                    <div className="branch-icon-box">
                                                        <Building size={24} />
                                                    </div>
                                                </div>

                                                <div className="branch-info-header">
                                                    <h3 className="branch-name">
                                                        {branch.shop_name}
                                                        {branch.is_main_branch && (
                                                            <span className="main-badge">
                                                                <Star size={10} /> MAIN
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <div className="status-badge-container">
                                                        <span className={`status-badge-pill ${branch.status}`}>
                                                            {branch.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="branch-card-actions">
                                                    <button
                                                        className="card-action-btn edit"
                                                        title="Edit Branch"
                                                        onClick={() => openEditModal(branch)}
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    {!branch.is_main_branch && (
                                                        <button
                                                            className="card-action-btn delete"
                                                            title="Delete Branch"
                                                            onClick={() => openDeleteModal(branch)}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="branch-card-details">
                                                {branch.shop_address && (
                                                    <div className="detail-item">
                                                        <MapPin size={16} />
                                                        <span>{branch.shop_address}</span>
                                                    </div>
                                                )}
                                                {branch.shop_phone && (
                                                    <div className="detail-item">
                                                        <Phone size={16} />
                                                        <span>{branch.shop_phone}</span>
                                                    </div>
                                                )}
                                                {branch.shop_email && (
                                                    <div className="detail-item">
                                                        <Mail size={16} />
                                                        <span>{branch.shop_email}</span>
                                                    </div>
                                                )}
                                                <div className="detail-item capital">
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
                        </>
                    ) : (
                        <div className="focus-view-container animate-slide-in">
                            <div className="focus-view-header">
                                <h2 className="heading-2">
                                    {view === 'add' ? 'Add New Branch' : `Edit ${selectedBranch?.shop_name}`}
                                </h2>
                                <button className="back-btn" onClick={() => setView('list')}>
                                    <X size={20} />
                                    <span>Back to List</span>
                                </button>
                            </div>

                            <div className="dashboard-card focus-view-card">
                                <div className="wizard-steps">
                                    <div className={`step ${currentStep === 1 ? 'active' : 'completed'}`}>
                                        <div className="step-number">{currentStep > 1 ? <Check size={14} /> : '1'}</div>
                                        <div className="step-label">Basic Info</div>
                                    </div>
                                    <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
                                        <div className="step-number">2</div>
                                        <div className="step-label">Constraints</div>
                                    </div>
                                </div>

                                <form onSubmit={view === 'add' ? handleCreateSubmit : handleEditSubmit}>
                                    <div className="focus-view-body">
                                        {currentStep === 1 && (
                                            <div className="form-grid">
                                                <div className="form-group full-width">
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
                                                <div className="form-group full-width">
                                                    <label>Physical Address</label>
                                                    <input
                                                        type="text"
                                                        name="shop_address"
                                                        className="form-input"
                                                        value={formData.shop_address}
                                                        onChange={handleInputChange}
                                                        placeholder="Street address, City, State"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Phone Number</label>
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
                                                    <label>Email Address</label>
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
                                        )}

                                        {currentStep === 2 && (
                                            <div className="form-grid">
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
                                                    <label>Low Stock Alert Threshold</label>
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

                                        <div className="focus-view-footer">
                                            {currentStep === 1 ? (
                                                <>
                                                    <button type="button" className="btn-secondary" onClick={() => setView('list')}>
                                                        Cancel
                                                    </button>
                                                    <button type="button" className="btn-primary" onClick={handleNext}>
                                                        Next Step →
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button" className="btn-secondary" onClick={handlePrevious}>
                                                        ← Previous
                                                    </button>
                                                    <button type="submit" className="btn-primary" disabled={submitting}>
                                                        {submitting ? 'Saving...' : (view === 'add' ? 'Create Branch' : 'Save Changes')}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main>


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
