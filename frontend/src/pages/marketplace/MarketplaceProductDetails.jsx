
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';
import api from '../../utils/api';
import { FaMoneyBillWave, FaComment, FaGavel } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';

const MarketplaceProductDetails = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);

    // Responsive Sidebar State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

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

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await api.get(`/marketplace/listings/get_details.php?id=${id}`);
                if (response.data.success) {
                    setListing(response.data.listing);
                }
            } catch (error) {
                console.error("Error fetching listing details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleBuyNow = async () => {
        if (!window.confirm("Are you sure you want to purchase this item? Funds will be held in escrow.")) return;
        setBuying(true);
        try {
            const response = await api.post('/marketplace/orders/create.php', { listing_id: listing.id });
            if (response.data.success) {
                alert("Order placed successfully! Funds are held in escrow.");
                navigate('/marketplace/orders'); // Redirect to orders page
            }
        } catch (error) {
            alert(error.response?.data?.error || "Purchase failed");
        } finally {
            setBuying(false);
        }
    };

    const handleMessage = () => {
        // Navigate to messages with listing ID to start conversation
        navigate(`/marketplace/messages?new=${listing.id}`);
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!listing) return <div className="p-10 text-center">Listing not found</div>;

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
                    <button onClick={() => navigate(-1)} className="mb-4 text-blue-500 hover:underline">
                        ← Back to Listings
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Images Section */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                                <img
                                    src={listing.images[0]?.image_url || '/placeholder-phone.png'}
                                    alt={listing.title}
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                            {/* Thumbnail gallery logic would go here */}
                        </div>

                        {/* Details Section */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{listing.title}</h1>
                                <p className="text-3xl font-bold text-blue-600 mb-4">
                                    ₦{Number(listing.price).toLocaleString()}
                                </p>

                                <div className="flex space-x-4 mb-6">
                                    {listing.listing_type === 'fixed_price' ? (
                                        <button
                                            onClick={handleBuyNow}
                                            disabled={buying || listing.status !== 'active'}
                                            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center"
                                        >
                                            {buying ? 'Processing...' : (
                                                <><FaMoneyBillWave className="mr-2" /> Buy Now</>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition flex items-center justify-center"
                                            onClick={() => alert("Auction UI coming soon!")}
                                        >
                                            <FaGavel className="mr-2" /> Place Bid
                                        </button>
                                    )}

                                    <button
                                        onClick={handleMessage}
                                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-3 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center justify-center"
                                    >
                                        <FaComment className="mr-2" /> Chat with Seller
                                    </button>
                                </div>

                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Details</h3>
                                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <li><span className="font-medium">Condition:</span> {listing.condition_state}</li>
                                        <li><span className="font-medium">Model:</span> {listing.phone_model}</li>
                                        <li><span className="font-medium">Location:</span> {listing.shop_name} ({listing.branch_name})</li>
                                        <li><span className="font-medium">Posted:</span> {new Date(listing.created_at).toLocaleDateString()}</li>
                                    </ul>
                                </div>

                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                                        {listing.description}
                                    </p>
                                </div>
                            </div>

                            {/* Seller Info Card */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex items-center space-x-4">
                                <div className="w-16 h-16 bg-gray-300 rounded-full overflow-hidden">
                                    <img
                                        src={listing.seller_profile_image || '/user-avatar.png'}
                                        alt={listing.seller_name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white">{listing.seller_name}</h3>
                                    <div className="text-yellow-500 text-sm">
                                        ★ {listing.seller_rating || 'New Seller'}
                                    </div>
                                    <p className="text-xs text-gray-500">Verified Seller</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceProductDetails;
