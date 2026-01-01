import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import { Plus, Edit2, Trash2, X, Calendar, Tag, ArrowLeft } from 'lucide-react';
import { FaSearch } from 'react-icons/fa';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
import '../../styles/wizard.css';
import './Expenses.css';

const Expenses = () => {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'add', 'edit'
    const [currentExpense, setCurrentExpense] = useState(null);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
    });
    const { showError, showSuccess } = useNotification();

    // Layout State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Lazy Loading State
    const [visibleCount, setVisibleCount] = useState(20);
    const observerTarget = useRef(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        fetchExpenses();

        // Responsive Sidebar Logic
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

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const response = await api.get('/expenses.php');
            if (response.data.success) {
                setExpenses(response.data.expenses);
            }
        } catch (err) {
            console.error('Failed to fetch expenses:', err);
            showError('Unable to load the expense list.');
        } finally {
            setLoading(false);
        }
    };

    // Filtered expenses
    const filteredExpenses = useMemo(() => {
        if (!searchTerm.trim()) return expenses;
        const lowerTerm = searchTerm.toLowerCase();
        return expenses.filter(expense =>
            expense.description.toLowerCase().includes(lowerTerm) ||
            expense.category.toLowerCase().includes(lowerTerm) ||
            expense.amount.toString().includes(lowerTerm) ||
            expense.date.includes(lowerTerm) ||
            (expense.created_by_name && expense.created_by_name.toLowerCase().includes(lowerTerm))
        );
    }, [searchTerm, expenses]);

    // Intersection Observer for Lazy Loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && filteredExpenses.length > visibleCount) {
                    setVisibleCount(prev => prev + 20);
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [filteredExpenses.length, visibleCount]);

    // Reset visible count when search changes
    useEffect(() => {
        setVisibleCount(20);
    }, [searchTerm]);

    // Slice for lazy loading
    const displayedExpenses = useMemo(() => {
        return filteredExpenses.slice(0, visibleCount);
    }, [filteredExpenses, visibleCount]);

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

    const openAddModal = () => {
        setCurrentExpense(null);
        setFormData({
            description: '',
            amount: '',
            category: '',
            date: new Date().toISOString().split('T')[0]
        });
        setView('add');
    };

    const openEditModal = (expense) => {
        setCurrentExpense(expense);
        setFormData({
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            date: expense.date
        });
        setView('edit');
    };

    const closeModal = () => {
        setView('list');
        setCurrentExpense(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (currentExpense) {
                // Update
                const response = await api.put('/expenses.php', {
                    id: currentExpense.id,
                    ...formData
                });
                if (response.data.success) {
                    showSuccess('The expense record has been successfully updated.');
                    fetchExpenses();
                    closeModal();
                }
            } else {
                // Create
                const response = await api.post('/expenses.php', formData);
                if (response.data.success) {
                    showSuccess('The new expense has been successfully recorded.');
                    fetchExpenses();
                    closeModal();
                }
            }
        } catch (err) {
            console.error('Expense operation failed:', err);
            showError(err.response?.data?.error || 'The action could not be completed.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;

        try {
            const response = await api.delete(`/expenses.php?id=${id}`);
            if (response.data.success) {
                showSuccess('The expense record has been deleted.');
                setExpenses(prev => prev.filter(exp => exp.id !== id));
            }
        } catch (err) {
            console.error('Expense delete failed:', err);
            showError(err.response?.data?.error || 'Unable to delete the expense record.');
        }
    };

    if (loading) return <div className="expenses-container">Loading...</div>;

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
                            <div className="header-section">
                                <div>
                                    <h1>Expenses</h1>
                                    <p className="text-secondary" style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage your daily expenses</p>
                                </div>
                                <button className="btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Plus size={20} />
                                    <span className="btn-text">Add Expense</span>
                                </button>
                            </div>


                            <div className="search-bar-container glass-card" style={{ marginBottom: '24px', padding: '16px' }}>
                                <div className="search-input-wrapper">
                                    <FaSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search expenses by description, category, amount, date, or creator..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ background: 'transparent', border: 'none', color: 'inherit' }}
                                    />
                                </div>
                            </div>

                            <div className="table-container glass-card">
                                <div className="table-responsive">
                                    <table className="data-table glass-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Description</th>
                                                <th>Category</th>
                                                <th>Amount</th>
                                                <th>Created By</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedExpenses.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                                                        {searchTerm ? 'No expenses match your search' : 'No expenses found'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                displayedExpenses.map(expense => (
                                                    <tr key={expense.id}>
                                                        <td>{expense.date}</td>
                                                        <td>{expense.description}</td>
                                                        <td>
                                                            <span className="category-badge">
                                                                {expense.category ? expense.category.charAt(0).toUpperCase() + expense.category.slice(1) : ''}
                                                            </span>
                                                        </td>
                                                        <td>₦{parseFloat(expense.amount).toFixed(2)}</td>
                                                        <td>{expense.created_by_name || 'Unknown'}</td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                <button
                                                                    className="edit-btn"
                                                                    onClick={() => openEditModal(expense)}
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                {isAdmin && (
                                                                    <button
                                                                        className="delete-btn"
                                                                        onClick={() => handleDelete(expense.id)}
                                                                        title="Delete"
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

                                {/* Lazy Load Trigger */}
                                {filteredExpenses.length > visibleCount && (
                                    <div ref={observerTarget} className="lazy-load-trigger">
                                        <span className="loading-dots">Loading more expenses</span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="focus-view-container">
                            <div className="focus-view-header">
                                <button className="btn-back" onClick={closeModal}>
                                    <ArrowLeft size={18} />
                                    <span>Back to List</span>
                                </button>
                                <h2>{currentExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
                            </div>

                            <div className="focus-view-content">
                                <div className="focus-view-card">
                                    <form onSubmit={handleSubmit}>
                                        <div className="focus-view-body">
                                            <div className="form-grid">
                                                <div className="form-group">
                                                    <label>Description</label>
                                                    <input
                                                        type="text"
                                                        name="description"
                                                        className="form-input-focus"
                                                        value={formData.description}
                                                        onChange={handleInputChange}
                                                        required
                                                        placeholder="e.g., Office Supplies"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label>Amount</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 'bold' }}>₦</span>
                                                        <input
                                                            type="number"
                                                            name="amount"
                                                            className="form-input-focus"
                                                            style={{ paddingLeft: '36px' }}
                                                            value={formData.amount}
                                                            onChange={handleInputChange}
                                                            required
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label>Category</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <Tag size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-secondary)' }} />
                                                        <select
                                                            name="category"
                                                            className="form-input-focus"
                                                            style={{ paddingLeft: '40px' }}
                                                            value={formData.category}
                                                            onChange={handleInputChange}
                                                            required
                                                        >
                                                            <option value="">Select Category</option>
                                                            <option value="utilities">Utilities</option>
                                                            <option value="rent">Rent</option>
                                                            <option value="supplies">Supplies</option>
                                                            <option value="salaries">Salaries</option>
                                                            <option value="repairs">Repairs & Maintenance</option>
                                                            <option value="marketing">Marketing</option>
                                                            <option value="transportation">Transportation</option>
                                                            <option value="other">Other</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label>Date</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-secondary)' }} />
                                                        <input
                                                            type="date"
                                                            name="date"
                                                            className="form-input-focus"
                                                            style={{ paddingLeft: '40px' }}
                                                            value={formData.date}
                                                            onChange={handleInputChange}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>


                                            <div className="focus-view-actions">
                                                <div className="secondary-actions">
                                                    <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                                                </div>
                                                <div className="primary-actions">
                                                    <button type="submit" className="btn-primary">
                                                        {currentExpense ? 'Update Expense' : 'Add Expense'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Expenses;
