import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Plus, Edit2, Trash2, X, Calendar, Tag } from 'lucide-react';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
import './Expenses.css';

const Expenses = () => {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState(null);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');

    // Layout State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        fetchExpenses();

        // Responsive Sidebar Logic
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

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const response = await api.get('/expenses.php');
            if (response.data.success) {
                setExpenses(response.data.expenses);
            }
        } catch (err) {
            console.error('Failed to fetch expenses:', err);
            setError('Failed to load expenses');
        } finally {
            setLoading(false);
        }
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
        setIsModalOpen(true);
        setError('');
    };

    const openEditModal = (expense) => {
        setCurrentExpense(expense);
        setFormData({
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            date: expense.date
        });
        setIsModalOpen(true);
        setError('');
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentExpense(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (currentExpense) {
                // Update
                const response = await api.put('/expenses.php', {
                    id: currentExpense.id,
                    ...formData
                });
                if (response.data.success) {
                    fetchExpenses();
                    closeModal();
                }
            } else {
                // Create
                const response = await api.post('/expenses.php', formData);
                if (response.data.success) {
                    fetchExpenses();
                    closeModal();
                }
            }
        } catch (err) {
            console.error('Operation failed:', err);
            setError(err.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;

        try {
            const response = await api.delete(`/expenses.php?id=${id}`);
            if (response.data.success) {
                setExpenses(prev => prev.filter(exp => exp.id !== id));
            }
        } catch (err) {
            console.error('Delete failed:', err);
            alert(err.response?.data?.error || 'Failed to delete expense');
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
                    <div className="header-section">
                        <div>
                            <h1>Expenses</h1>
                            <p className="text-secondary" style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage your daily expenses</p>
                        </div>
                        <button className="add-expense-btn" onClick={openAddModal}>
                            <Plus size={20} />
                            Add Expense
                        </button>
                    </div>

                    {error && <div className="error-message" style={{ color: 'var(--error)', marginBottom: '16px' }}>{error}</div>}

                    <div className="table-container">
                        <table className="data-table">
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
                                {expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No expenses found</td>
                                    </tr>
                                ) : (
                                    expenses.map(expense => (
                                        <tr key={expense.id}>
                                            <td>{expense.date}</td>
                                            <td>{expense.description}</td>
                                            <td>
                                                <span className="category-badge">
                                                    {expense.category}
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

                    {/* Modal */}
                    {isModalOpen && (
                        <div className="modal-overlay">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h2 className="modal-title">
                                        {currentExpense ? 'Edit Expense' : 'Add New Expense'}
                                    </h2>
                                    <button className="close-btn" onClick={closeModal}>
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <input
                                            type="text"
                                            name="description"
                                            className="form-input"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="e.g., Office Supplies"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Amount</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 'bold' }}>₦</span>
                                            <input
                                                type="number"
                                                name="amount"
                                                className="form-input"
                                                style={{ paddingLeft: '32px' }}
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
                                        <label className="form-label">Category</label>
                                        <div style={{ position: 'relative' }}>
                                            <Tag size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
                                            <select
                                                name="category"
                                                className="form-input"
                                                style={{ paddingLeft: '32px' }}
                                                value={formData.category}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select Category</option>
                                                <option value="Utilities">Utilities</option>
                                                <option value="Rent">Rent</option>
                                                <option value="Supplies">Supplies</option>
                                                <option value="Salaries">Salaries</option>
                                                <option value="Maintenance">Maintenance</option>
                                                <option value="Marketing">Marketing</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Date</label>
                                        <div style={{ position: 'relative' }}>
                                            <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
                                            <input
                                                type="date"
                                                name="date"
                                                className="form-input"
                                                style={{ paddingLeft: '32px' }}
                                                value={formData.date}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="modal-actions">
                                        <button type="button" className="cancel-btn" onClick={closeModal}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="save-btn">
                                            {currentExpense ? 'Update Expense' : 'Add Expense'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Expenses;
