import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { FaBox, FaMoneyBillWave, FaClock, FaExclamationCircle } from 'react-icons/fa';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';

const MarketplaceCreateListing = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState(1);

    // Form State
    const [formData, setFormData] = useState({
        inventory_id: '',
        title: '',
        description: '',
        price: '',
        listing_type: 'fixed_price', // fixed_price or auction
        condition: '', // will be populated from inventory
        auction_ends_at: ''
    });

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen size
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) setSidebarOpen(false);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch Inventory
    useEffect(() => {
        const fetchInventory = async () => {
            try {
                // Fetch inventory items that are 'in_stock'
                // We're using the standard inventory read endpoint. 
                // We might need to filter client-side if the API doesn't support status filtering yet, 
                // but usually inventory APIs return all items.
                const response = await api.get('/inventory/read.php');
                if (response.data.success) {
                    // Filter for in_stock items only
                    const inventoryList = response.data.inventory || [];
                    const inStockItems = inventoryList.filter(item => item.status === 'in_stock');
                    setInventory(inStockItems);
                }
            } catch (err) {
                console.error("Error fetching inventory:", err);
                setError("Failed to load your inventory. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchInventory();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // If inventory item selected, auto-populate details
        if (name === 'inventory_id') {
            const selectedItem = inventory.find(item => item.id == value);
            if (selectedItem) {
                setFormData(prev => ({
                    ...prev,
                    inventory_id: value,
                    title: `${selectedItem.brand} ${selectedItem.model} - ${selectedItem.storage}`,
                    condition: selectedItem.condition_status || 'used',
                    description: `Selling my ${selectedItem.brand} ${selectedItem.model}. Color: ${selectedItem.color}. Storage: ${selectedItem.storage}.`,
                    price: selectedItem.price || ''
                }));
            }
        }
    };

    // Image Upload State
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        const newImages = [];

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('image', file);

                const response = await api.post('/marketplace/listings/upload_image.php', formData);

                if (response.data.success) {
                    newImages.push(response.data.url);
                }
            }

            setImages(prev => [...prev, ...newImages]);
        } catch (err) {
            console.error("Upload error:", err);
            const errorMessage = err.response?.data?.error || "Failed to upload images. Please try again.";
            setError(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (indexToRemove) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
    };

    const getImageUrl = (url) => {
        if (!url) return '/placeholder-phone.png';
        if (url.startsWith('http')) return url;
        return `${SERVER_URL}${url}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                images: images
            };

            const response = await api.post('/marketplace/listings/create.php', payload);

            if (response.data.success) {
                alert("Listing created successfully!");
                navigate('/marketplace/selling');
            }
        } catch (err) {
            console.error("Error creating listing:", err);
            setError(err.response?.data?.error || "Failed to create listing.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content marketplace-main">
                <div className="content-wrapper">
                    <div className="focus-view-container">
                        <div className="focus-view-header">
                            <button className="back-btn" onClick={() => navigate('/marketplace/selling')}>
                                <ArrowLeft size={18} />
                                <span>Back to Listings</span>
                            </button>
                            <h1 className="heading-2">Create New Listing</h1>
                        </div>

                        <div className="focus-view-card glass-card">
                            <div className="wizard-steps">
                                <div className={`step ${currentStep === 1 ? 'active' : 'completed'}`}>
                                    <div className="step-number">{currentStep > 1 ? <Check size={14} /> : '1'}</div>
                                    <div className="step-label">Product Details</div>
                                </div>
                                <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
                                    <div className="step-number">2</div>
                                    <div className="step-label">Pricing & Media</div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="focus-view-body">
                                    {error && (
                                        <div className="alert-banner error" style={{ marginBottom: '24px' }}>
                                            <FaExclamationCircle size={18} />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {loading ? (
                                        <div style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner-border" style={{ margin: '0 auto 16px' }}></div>
                                            <p>Loading inventory...</p>
                                        </div>
                                    ) : inventory.length === 0 ? (
                                        <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
                                            <FaBox size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
                                            <h3>No Items Available</h3>
                                            <p>You don't have any items in stock to sell. Add items to your inventory first.</p>
                                            <button
                                                onClick={() => navigate(user?.role === 'admin' ? '/admin/inventory' : '/user/inventory')}
                                                className="btn-primary"
                                                style={{ marginTop: '24px', marginInline: 'auto' }}
                                            >
                                                Go to Inventory
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {currentStep === 1 && (
                                                <div className="animate-slide-in">
                                                    <div className="form-group">
                                                        <label>Select Item to Sell *</label>
                                                        <select
                                                            name="inventory_id"
                                                            value={formData.inventory_id}
                                                            onChange={handleChange}
                                                            className="form-input"
                                                            required
                                                        >
                                                            <option value="">-- Select a phone from inventory --</option>
                                                            {inventory.map(item => (
                                                                <option key={item.id} value={item.id}>
                                                                    {item.brand} {item.model} ({item.storage}) - {item.color}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <p className="field-note">Only 'in stock' items are available for listing.</p>
                                                    </div>

                                                    {formData.inventory_id && (
                                                        <>
                                                            <div className="form-group">
                                                                <label>Listing Title *</label>
                                                                <input
                                                                    type="text"
                                                                    name="title"
                                                                    value={formData.title}
                                                                    onChange={handleChange}
                                                                    className="form-input"
                                                                    required
                                                                    placeholder="e.g. Pristine iPhone 15 Pro Max"
                                                                />
                                                            </div>

                                                            <div className="form-group">
                                                                <label>Description</label>
                                                                <textarea
                                                                    name="description"
                                                                    value={formData.description}
                                                                    onChange={handleChange}
                                                                    className="form-input"
                                                                    rows="5"
                                                                    placeholder="Describe the condition, accessories, and any other details..."
                                                                ></textarea>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {currentStep === 2 && (
                                                <div className="animate-slide-in">
                                                    <div className="grid-2" style={{ marginBottom: '24px' }}>
                                                        <div className="form-group">
                                                            <label>Listing Type</label>
                                                            <select
                                                                name="listing_type"
                                                                value={formData.listing_type}
                                                                onChange={handleChange}
                                                                className="form-input"
                                                            >
                                                                <option value="fixed_price">Fixed Price</option>
                                                                <option value="auction">Auction (Bidding)</option>
                                                            </select>
                                                        </div>

                                                        <div className="form-group">
                                                            <label>Price (₦) *</label>
                                                            <input
                                                                type="number"
                                                                name="price"
                                                                value={formData.price}
                                                                onChange={handleChange}
                                                                className="form-input"
                                                                required
                                                                min="0"
                                                                step="0.01"
                                                            />
                                                        </div>
                                                    </div>

                                                    {formData.listing_type === 'auction' && (
                                                        <div className="form-group alert-banner" style={{ borderLeftColor: 'var(--primary)', marginBottom: '24px', background: 'rgba(66, 133, 244, 0.05)' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <FaClock />
                                                                Auction End Date *
                                                            </label>
                                                            <input
                                                                type="datetime-local"
                                                                name="auction_ends_at"
                                                                value={formData.auction_ends_at}
                                                                onChange={handleChange}
                                                                className="form-input"
                                                                required={formData.listing_type === 'auction'}
                                                                style={{ marginTop: '8px' }}
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="form-group">
                                                        <label>Listing Images</label>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                                                            {images.map((url, index) => (
                                                                <div key={index} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                                                    <img src={getImageUrl(url)} alt={`Listing ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeImage(index)}
                                                                        style={{
                                                                            position: 'absolute', top: '5px', right: '5px',
                                                                            background: 'rgba(239, 68, 68, 0.9)', color: 'white',
                                                                            border: 'none', borderRadius: '50%', width: '24px', height: '24px',
                                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                        }}
                                                                    >
                                                                        &times;
                                                                    </button>
                                                                </div>
                                                            ))}

                                                            {images.length < 5 && (
                                                                <label style={{
                                                                    width: '100px', height: '100px', borderRadius: '12px', border: '2px dashed var(--border-color)',
                                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: uploading ? 'not-allowed' : 'pointer', background: 'var(--bg-background)',
                                                                    transition: 'all 0.2s'
                                                                }} className="image-upload-label">
                                                                    {uploading ? (
                                                                        <div className="spinner-border spinner-border-sm"></div>
                                                                    ) : (
                                                                        <>
                                                                            <Plus size={24} style={{ color: 'var(--text-secondary)' }} />
                                                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Add Photo</span>
                                                                        </>
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        multiple
                                                                        onChange={handleImageUpload}
                                                                        style={{ display: 'none' }}
                                                                        disabled={uploading}
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                        <p className="field-note">Upload up to 5 clear images of the device.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="focus-view-footer">
                                    {currentStep === 1 ? (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={() => setCurrentStep(2)}
                                            disabled={!formData.inventory_id || !formData.title}
                                        >
                                            Next: Pricing & Photos
                                            <ChevronRight size={18} />
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={() => setCurrentStep(1)}
                                            >
                                                Back to Details
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-primary"
                                                disabled={submitting}
                                            >
                                                {submitting ? 'Creating Listing...' : 'Complete Listing'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
};

export default MarketplaceCreateListing;
