
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';
import { FaStore, FaWallet, FaCommentDots, FaUserCircle, FaGavel } from 'react-icons/fa';
import api from '../../utils/api';

const MarketplaceDashboard = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Profile
                const profileRes = await api.get('/marketplace/profile/get.php');
                if (profileRes.data.success) {
                    setProfile(profileRes.data.profile);
                }

                // Fetch Wallet
                const walletRes = await api.get('/marketplace/wallet/get_balance.php');
                if (walletRes.data.success) {
                    setWallet(walletRes.data.wallet);
                }
            } catch (error) {
                console.error("Error fetching marketplace data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const cards = [
        {
            title: "Browse Listings",
            icon: <FaStore className="text-3xl text-blue-500" />,
            desc: "Buy phones from verified sellers.",
            action: () => navigate('/marketplace/listings'),
            color: "border-l-4 border-blue-500"
        },
        {
            title: "My Wallet",
            icon: <FaWallet className="text-3xl text-green-500" />,
            desc: `Balance: ₦${wallet ? Number(wallet.available_balance).toLocaleString() : '---'}`,
            action: () => navigate('/marketplace/wallet'),
            color: "border-l-4 border-green-500"
        },
        {
            title: "Messages",
            icon: <FaCommentDots className="text-3xl text-purple-500" />,
            desc: "Chat with buyers and sellers.",
            action: () => navigate('/marketplace/messages'),
            color: "border-l-4 border-purple-500"
        },
        {
            title: "My Profile",
            icon: <FaUserCircle className="text-3xl text-orange-500" />,
            desc: profile ? `${profile.display_name}` : "Create your profile",
            action: () => navigate('/marketplace/profile'),
            color: "border-l-4 border-orange-500"
        }
    ];

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
                    <div className="container mx-auto">
                        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
                            Marketplace Dashboard
                        </h1>

                        {!profile && !loading && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
                                <p className="font-bold">Complete your Profile</p>
                                <p>You need to verify your identity to buy or sell on the marketplace.</p>
                                <button
                                    onClick={() => navigate('/marketplace/profile')}
                                    className="mt-2 bg-yellow-500 text-white px-4 py-1 rounded hover:bg-yellow-600 transition"
                                >
                                    Get Verified
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {cards.map((card, index) => (
                                <div
                                    key={index}
                                    onClick={card.action}
                                    className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer flex items-center space-x-4 ${card.color}`}
                                >
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                                        {card.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{card.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{card.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Activity or Featured Listings could go here */}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MarketplaceDashboard;
