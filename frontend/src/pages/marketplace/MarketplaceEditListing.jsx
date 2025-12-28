import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Check, ChevronRight, Plus } from 'lucide-react';
import { FaBox, FaExclamationCircle, FaClock } from 'react-icons/fa';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import '../../styles/wizard.css';

const MarketplaceEditListing = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState(1);

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

            <main className="main-content marketplace-main">
                <div className="content-wrapper">
                    <div className="focus-view-container">
                        <div className="focus-view-header">
                            <button className="btn-back" onClick={() => navigate('/marketplace/selling')}>
                                <ArrowLeft size={18} />
                                <span>Back to Listings</span>
                            </button>
                            <h2 className="heading-2">Edit Listing</h2>
                        </div>

                        <div className="focus-view-card glass-card">
                            <div className="wizard-steps">
                                <div className={`step ${currentStep === 1 ? 'active' : 'completed'}`}>
                                    <div className="step-number">{currentStep > 1 ? <Check size={14} /> : '1'}</div>
                                    <div className="step-label">Listing Content</div>
                                </div>
                                <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
                                    <div className="step-number">2</div>
                                    <div className="step-label">Pricing & Photos</div>
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

                                    {currentStep === 1 && (
                                        <div className="animate-slide-in">
                                            {/* Read-only Item Info - Styled as a note */}
                                            <div className="form-group alert-banner" style={{ background: 'rgba(var(--primary-rgb), 0.05)', borderLeftColor: 'var(--primary)', marginBottom: '24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <FaBox size={24} style={{ color: 'var(--primary)' }} />
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '15px' }}>{listing?.phone_brand} {listing?.phone_model}</h4>
                                                        <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>{listing?.phone_storage} • {listing?.phone_color}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Listing Title *</label>
                                                <input
                                                    type="text"
                                                    name="title"
                                                    value={formData.title}
                                                    onChange={handleChange}
                                                    className="form-input"
                                                    required
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
                                                ></textarea>
                                            </div>

                                            <div className="form-group">
                                                <label>Condition</label>
                                                <select
                                                    name="phone_condition"
                                                    value={formData.phone_condition}
                                                    onChange={handleChange}
                                                    className="form-input"
                                                >
                                                    <option value="new">New</option>
                                                    <option value="like_new">Like New</option>
                                                    <option value="good">Good</option>
                                                    <option value="fair">Fair</option>
                                                    <option value="poor">Poor</option>
                                                </select>
                                                <p className="field-note">Update the physical condition of your item.</p>
                                            </div>
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
                                                <p className="field-note">You can add or remove images for your listing.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="focus-view-footer">
                                    {currentStep === 1 ? (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={() => setCurrentStep(2)}
                                            disabled={!formData.title}
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
                                                {submitting ? 'Updating Listing...' : 'Save Changes'}
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

export default MarketplaceEditListing;
