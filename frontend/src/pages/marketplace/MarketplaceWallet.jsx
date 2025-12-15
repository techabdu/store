
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';
import api from '../../utils/api';
import { FaPlusCircle, FaArrowDown, FaHistory } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';

const MarketplaceWallet = () => {
    const { user } = useAuth();
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [funding, setFunding] = useState(false); // Modal state (simplified for this task)
    const [amount, setAmount] = useState('');

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
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [walletRes, txRes] = await Promise.all([
                api.get('/marketplace/wallet/get_balance.php'),
                api.get('/marketplace/wallet/get_transactions.php?limit=10')
            ]);

            if (walletRes.data.success) {
                setWallet(walletRes.data.wallet);
            }
            if (txRes.data.success) {
                setTransactions(txRes.data.transactions);
            }
        } catch (error) {
            console.error("Error fetching wallet data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFundWallet = async () => {
        if (!amount || amount < 100) return alert("Min funding is ₦100");
        try {
            const res = await api.post('/marketplace/wallet/deposit/initialize.php', { amount });
            if (res.data.success && res.data.checkout_url) {
                window.location.href = res.data.checkout_url; // Redirect to Kora Checkout
            }
        } catch (error) {
            alert(error.response?.data?.error || "Funding failed");
        }
    };

    const handleWithdraw = () => {
        // Simple prompt for now, usually a modal with bank details
        alert("Withdrawal UI to be implemented in full version (requires Bank details form)");
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
                    <div className="page-header">
                        <h1 className="heading-1">My Wallet</h1>
                        <p className="text-secondary">Manage your funds and transactions.</p>
                    </div>

                    {/* Balance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-green-600 text-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-sm font-medium opacity-80">Available Balance</h3>
                            <p className="text-3xl font-bold mt-2">
                                ₦{wallet ? Number(wallet.available_balance).toLocaleString() : '---'}
                            </p>
                            <div className="mt-4 flex space-x-2">
                                <button
                                    onClick={() => setFunding(!funding)}
                                    className="bg-white text-green-700 px-3 py-1 rounded text-sm font-bold flex items-center"
                                >
                                    <FaPlusCircle className="mr-1" /> Fund
                                </button>
                                <button
                                    onClick={handleWithdraw}
                                    className="bg-green-700 text-white border border-white px-3 py-1 rounded text-sm font-bold flex items-center"
                                >
                                    <FaArrowDown className="mr-1" /> Withdraw
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-yellow-500">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending (Escrow)</h3>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                                ₦{wallet ? Number(wallet.pending_balance).toLocaleString() : '---'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Funds from sales not yet released</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-purple-500">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Held (Active Bids)</h3>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                                ₦{wallet ? Number(wallet.held_balance).toLocaleString() : '---'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Locked in active auctions</p>
                        </div>
                    </div>

                    {/* Quick Fund Input */}
                    {funding && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-6 border border-green-200">
                            <h4 className="font-bold mb-2 dark:text-white">Enter Amount to Fund</h4>
                            <div className="flex">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="p-2 border rounded-l w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Min 100"
                                />
                                <button
                                    onClick={handleFundWallet}
                                    className="bg-green-600 text-white px-6 rounded-r font-bold hover:bg-green-700"
                                >
                                    Proceed
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Transaction History */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center">
                                <FaHistory className="mr-2" /> Recent Transactions
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                                        <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                                        <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                                        <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                                        <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="p-4 text-sm dark:text-gray-300 capitalize">{tx.transaction_type}</td>
                                            <td className="p-4 text-sm dark:text-gray-300">{tx.description}</td>
                                            <td className={`p-4 text-sm font-bold ${tx.transaction_type === 'deposit' || tx.transaction_type === 'sale_release'
                                                ? 'text-green-600' : 'text-red-500'
                                                }`}>
                                                {tx.transaction_type === 'deposit' || tx.transaction_type === 'sale_release' ? '+' : '-'}
                                                ₦{Number(tx.amount).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs ${tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-gray-500">No transactions yet</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceWallet;
