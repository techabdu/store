import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { FaBox, FaExclamationCircle, FaClock } from 'react-icons/fa';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';

const MarketplaceEditListing = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        listing_type: 'fixed_price',
        phone_condition: 'good',
        auction_ends_at: ''
    });

    const [listing, setListing] = useState(null);

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

    // Image Upload State
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Fetch Listing Data
    useEffect(() => {
        const fetchListing = async () => {
            try {
                const response = await api.get(`/marketplace/listings/get_details.php?id=${id}`);
                if (response.data.success) {
                    const listing = response.data.listing;

                    // Check if user owns this listing
                    if (listing.user_id != user.id) {
                        setError("You do not have permission to edit this listing.");
                        setLoading(false);
                        return;
                    }

                    setListing(listing); // Keep this for read-only info
                    setFormData({
                        id: listing.id,
                        title: listing.title,
                        description: listing.description,
                        price: listing.price,
                        listing_type: listing.listing_type,
                        phone_condition: listing.phone_condition,
                        auction_ends_at: listing.auction_ends_at ? listing.auction_ends_at.replace(' ', 'T') : '',
                        auction_reserve_price: listing.auction_reserve_price || ''
                    });

                    if (listing.images && Array.isArray(listing.images)) {
                        setImages(listing.images);
                    }
                }
            } catch (err) {
                console.error("Error fetching listing:", err);
                setError("Failed to load listing details.");
            } finally {
                setLoading(false);
            }
        };

        if (user && id) {
            fetchListing();
        }
    }, [id, user]);

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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
                id: id,
                ...formData,
                price: parseFloat(formData.price),
                images: images
            };

            const response = await api.post('/marketplace/listings/update.php', payload);

            if (response.data.success) {
                alert("Listing updated successfully!");
                navigate('/marketplace/selling');
            }
        } catch (err) {
            console.error("Error updating listing:", err);
            setError(err.response?.data?.error || "Failed to update listing.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-5">Loading...</div>;

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
                        <h1 className="heading-1">Edit Listing</h1>
                        <p className="text-secondary">Update details for your listing</p>
                    </div>

                    <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {error && (
                            <div className="alert-banner error" style={{ marginBottom: '20px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                <FaExclamationCircle style={{ marginRight: '8px' }} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Read-only Item Info */}
                            <div className="form-group" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Item Details (Cannot be changed)</label>
                                <p><strong>{listing?.phone_brand} {listing?.phone_model}</strong></p>
                                <p className="text-secondary">{listing?.phone_storage} - {listing?.phone_color}</p>
                            </div>

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
                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Condition</label>
                                <select
                                    name="phone_condition"
                                    value={formData.phone_condition}
                                    onChange={handleChange}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    <option value="new">New</option>
                                    <option value="like_new">Like New</option>
                                    <option value="good">Good</option>
                                    <option value="fair">Fair</option>
                                    <option value="poor">Poor</option>
                                </select>
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

                            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/marketplace/selling')}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-primary"
                                >
                                    {submitting ? 'Updating...' : 'Update Listing'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceEditListing;
