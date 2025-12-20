import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
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

            <main className="main-content marketplace-page-main">
                <div className="content-wrapper">
                    <div className="page-header">
                        <h1 className="heading-1">Create New Listing</h1>
                        <p className="text-secondary">List a phone from your inventory for sale</p>
                    </div>

                    <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {error && (
                            <div className="alert-banner error" style={{ marginBottom: '20px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                <FaExclamationCircle style={{ marginRight: '8px' }} />
                                <span>{error}</span>
                            </div>
                        )}

                        {loading ? (
                            <p>Loading inventory...</p>
                        ) : inventory.length === 0 ? (
                            <div className="empty-state">
                                <FaBox size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
                                <h3>No Items Available</h3>
                                <p>You verify have any items in stock to sell. Add items to your inventory first.</p>
                                <button
                                    onClick={() => navigate(user?.role === 'admin' ? '/admin/inventory' : '/user/inventory')}
                                    className="btn-primary"
                                    style={{ marginTop: '16px' }}
                                >
                                    Go to Inventory
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {/* Step 1: Select Item */}
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Select Item to Sell</label>
                                    <select
                                        name="inventory_id"
                                        value={formData.inventory_id}
                                        onChange={handleChange}
                                        className="form-control"
                                        required
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    >
                                        <option value="">-- Select a phone --</option>
                                        {inventory.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.brand} {item.model} ({item.storage}) - {item.color}
                                            </option>
                                        ))}
                                    </select>
                                    <small className="text-secondary">Only 'in stock' items are shown.</small>
                                </div>

                                {/* Step 2: Listing Details */}
                                {formData.inventory_id && (
                                    <>
                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Listing Title</label>
                                            <input
                                                type="text"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleChange}
                                                className="form-control"
                                                required
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Description</label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                className="form-control"
                                                rows="4"
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                            ></textarea>
                                        </div>

                                        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group">
                                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Listing Type</label>
                                                <select
                                                    name="listing_type"
                                                    value={formData.listing_type}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                                >
                                                    <option value="fixed_price">Fixed Price</option>
                                                    <option value="auction">Auction</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Price (₦)</label>
                                                <input
                                                    type="number"
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Listing Images</label>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                                                {images.map((url, index) => (
                                                    <div key={index} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
                                                        <img src={getImageUrl(url)} alt={`Listing ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(index)}
                                                            style={{
                                                                position: 'absolute', top: '2px', right: '2px',
                                                                background: 'rgba(255,0,0,0.7)', color: 'white',
                                                                border: 'none', borderRadius: '50%', width: '20px', height: '20px',
                                                                cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ))}

                                                <label style={{
                                                    width: '80px', height: '80px', borderRadius: '6px', border: '2px dashed #ddd',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                    cursor: uploading ? 'not-allowed' : 'pointer', backgroundColor: '#f9fafb'
                                                }}>
                                                    {uploading ? (
                                                        <span style={{ fontSize: '10px' }}>Uploading...</span>
                                                    ) : (
                                                        <>
                                                            <span style={{ fontSize: '24px', color: '#999' }}>+</span>
                                                            <span style={{ fontSize: '10px', color: '#666' }}>Add</span>
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
                                            </div>
                                            <small className="text-secondary">Upload up to 5 images. Successive uploads will append.</small>
                                        </div>

                                        {formData.listing_type === 'auction' && (
                                            <div className="form-group" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                                    <FaClock style={{ marginRight: '6px' }} />
                                                    Auction End Date
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    name="auction_ends_at"
                                                    value={formData.auction_ends_at}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    required={formData.listing_type === 'auction'}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                                />
                                            </div>
                                        )}

                                        <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/marketplace/listings')}
                                                className="btn-text"
                                                style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="btn-primary"
                                                style={{
                                                    padding: '10px 24px',
                                                    backgroundColor: 'var(--primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                                    opacity: submitting ? 0.7 : 1
                                                }}
                                            >
                                                {submitting ? 'Creating...' : 'Create Listing'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceCreateListing;
