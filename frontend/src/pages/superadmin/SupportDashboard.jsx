import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import TopBar from '../../components/TopBar';
import Sidebar from '../../components/Sidebar';
import MetricCard from '../../components/MetricCard';
import DataTable from '../../components/Tables/DataTable';
import {
    MessageSquare,
    Clock,
    CheckCircle,
    AlertCircle,
    Filter,
    Search,
    ChevronDown,
    ArrowLeft,
    Send,
    History,
    RefreshCw,
    X
} from 'lucide-react';
import './SupportDashboard.css';

const SupportDashboard = () => {
    const { user } = useAuth();
    const { showSuccess, showError } = useNotification();

    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [responses, setResponses] = useState([]);
    const [history, setHistory] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data State
    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        open_tickets: 0,
        awaiting: 0,
        resolved: 0
    });

    // Filter State
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        type: '',
        search: ''
    });

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await api.get('/superadmin/support_tickets.php', {
                params: {
                    action: 'list',
                    status: filters.status,
                    priority: filters.priority,
                    type: filters.type
                }
            });
            if (response.data.success) {
                setTickets(response.data.tickets);
                setStats(response.data.stats || stats);
            }
        } catch (err) {
            showError("Failed to fetch support tickets");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [filters.status, filters.priority, filters.type]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setSidebarOpen(false);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleTicketClick = async (ticket) => {
        try {
            const response = await api.get('/superadmin/support_tickets.php', {
                params: { action: 'detail', id: ticket.id }
            });
            if (response.data.success) {
                setSelectedTicket(response.data.ticket);
                setResponses(response.data.responses);
                setHistory(response.data.history);
                setShowDetail(true);
            }
        } catch (err) {
            showError("Failed to fetch ticket details");
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        setIsSubmitting(true);
        try {
            const response = await api.post('/superadmin/support_tickets.php?action=respond', {
                ticket_id: selectedTicket.id,
                message: replyText
            });
            if (response.data.success) {
                showSuccess("Response sent successfully");
                setReplyText('');
                // Refresh detail
                handleTicketClick(selectedTicket);
            }
        } catch (err) {
            showError("Failed to send response");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!window.confirm(`Change ticket status to ${newStatus}?`)) return;
        try {
            const response = await api.post('/superadmin/support_tickets.php?action=change_status', {
                ticket_id: selectedTicket.id,
                status: newStatus,
                notes: `Status changed by admin ${user?.username}`
            });
            if (response.data.success) {
                showSuccess("Ticket status updated");
                // Refresh list and detail
                fetchTickets();
                handleTicketClick(selectedTicket);
            }
        } catch (err) {
            showError("Failed to update status");
        }
    };

    const columns = [
        {
            key: 'ticket_number',
            label: 'Ticket #',
            sortable: true,
            render: (val) => <span className="ticket-id-tag">{val}</span>
        },
        {
            key: 'creator_name',
            label: 'User',
            sortable: true,
            render: (val, row) => (
                <div className="user-cell">
                    <strong>{val}</strong>
                    <small>{row.tenant_name}</small>
                </div>
            )
        },
        {
            key: 'type',
            label: 'Type',
            sortable: true,
            render: (val) => <span className="type-badge">{val.replace('_', ' ')}</span>
        },
        {
            key: 'subject',
            label: 'Subject',
            sortable: true,
            render: (val) => <div className="subject-cell">{val}</div>
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (val) => <span className={`status-badge ${val}`}>{val.replace('_', ' ')}</span>
        },
        {
            key: 'priority',
            label: 'Priority',
            sortable: true,
            render: (val) => <span className={`priority-badge ${val}`}>{val}</span>
        },
        {
            key: 'created_at',
            label: 'Received',
            sortable: true,
            render: (val) => new Date(val).toLocaleString()
        }
    ];

    const filteredTickets = tickets.filter(t =>
        t.ticket_number.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.subject.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.creator_name.toLowerCase().includes(filters.search.toLowerCase())
    );

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <Sidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? '256px' : '72px') }}>
                <div className="content-wrapper">
                    <div className="page-header">
                        <div>
                            <h1 className="heading-1">Support Dashboard</h1>
                            <p className="text-secondary">Manage marketplace reports and disputes</p>
                        </div>
                        <button className="refresh-btn" onClick={fetchTickets}>
                            <RefreshCw size={18} />
                            Refresh
                        </button>
                    </div>

                    <div className="metrics-grid">
                        <MetricCard
                            title="Open Tickets"
                            value={stats.open_tickets}
                            icon={AlertCircle}
                            trend="+2 from yesterday"
                            color="blue"
                        />
                        <MetricCard
                            title="Awaiting Response"
                            value={stats.awaiting}
                            icon={Clock}
                            trend="-1 from morning"
                            color="yellow"
                        />
                        <MetricCard
                            title="Resolved (Total)"
                            value={stats.resolved}
                            icon={CheckCircle}
                            trend="+15 this week"
                            color="green"
                        />
                        <MetricCard
                            title="Total System Tickets"
                            value={stats.total}
                            icon={MessageSquare}
                            color="purple"
                        />
                    </div>

                    <div className="dashboard-card glass-card">
                        <div className="table-header">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search tickets, users, subjects..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                            </div>
                            <div className="filters-group">
                                <div className="filter-select">
                                    <Filter size={14} />
                                    <select
                                        value={filters.status}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="awaiting_response">Awaiting User</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                                <div className="filter-select">
                                    <select
                                        value={filters.priority}
                                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                                    >
                                        <option value="">All Priorities</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <DataTable
                            columns={columns}
                            data={filteredTickets}
                            onRowClick={handleTicketClick}
                        />
                    </div>
                </div>
            </main>

            {/* Ticket Detail Side Overlay */}
            {showDetail && selectedTicket && (
                <div className="detail-overlay" onClick={() => setShowDetail(false)}>
                    <div className="detail-panel glass-card animate-slide-in" onClick={e => e.stopPropagation()}>
                        <div className="detail-header">
                            <div className="header-top">
                                <button className="close-panel-btn" onClick={() => setShowDetail(false)}>
                                    <X size={24} />
                                </button>
                                <div className="ticket-meta-info">
                                    <span className="ticket-id">{selectedTicket.ticket_number}</span>
                                    <span className={`status-badge ${selectedTicket.status}`}>
                                        {selectedTicket.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            <h2 className="ticket-subject">{selectedTicket.subject}</h2>
                        </div>

                        <div className="detail-body">
                            <div className="tabs-header">
                                <button className="tab active">Conversation</button>
                                <button className="tab">Details</button>
                                <button className="tab">Activity Log</button>
                            </div>

                            <div className="conversation-thread">
                                {/* Original Request */}
                                <div className="message original">
                                    <div className="message-header">
                                        <strong>{selectedTicket.creator_name}</strong>
                                        <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="message-content">
                                        {selectedTicket.description}
                                    </div>
                                    {selectedTicket.order_id && (
                                        <div className="related-entity">
                                            Related Order ID: #{selectedTicket.order_id}
                                        </div>
                                    )}
                                </div>

                                {responses.map(resp => (
                                    <div key={resp.id} className={`message ${resp.is_admin_response ? 'admin' : 'user'}`}>
                                        <div className="message-header">
                                            <strong>{resp.responder_name} {resp.is_admin_response && '(Admin)'}</strong>
                                            <span>{new Date(resp.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="message-content">
                                            {resp.message}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="reply-section">
                                <textarea
                                    placeholder="Type your response to the user..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    disabled={selectedTicket.status === 'closed'}
                                />
                                <div className="reply-actions">
                                    <div className="status-quick-actions">
                                        <button
                                            className="action-link"
                                            onClick={() => handleStatusChange('in_progress')}
                                            disabled={selectedTicket.status === 'in_progress'}
                                        >
                                            Mark In Progress
                                        </button>
                                        <button
                                            className="action-link success"
                                            onClick={() => handleStatusChange('resolved')}
                                            disabled={selectedTicket.status === 'resolved'}
                                        >
                                            Resolve Ticket
                                        </button>
                                    </div>
                                    <button
                                        className="send-btn"
                                        onClick={handleSendReply}
                                        disabled={isSubmitting || !replyText.trim() || selectedTicket.status === 'closed'}
                                    >
                                        <Send size={18} />
                                        {isSubmitting ? 'Sending...' : 'Send Response'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="detail-sidebar">
                            <h3>Ticket Information</h3>
                            <div className="info-list">
                                <div className="info-item">
                                    <label>Created By</label>
                                    <span>{selectedTicket.creator_name}</span>
                                </div>
                                <div className="info-item">
                                    <label>Tenant</label>
                                    <span>{selectedTicket.tenant_name}</span>
                                </div>
                                <div className="info-item">
                                    <label>Type</label>
                                    <span className="capitalize">{selectedTicket.type.replace('_', ' ')}</span>
                                </div>
                                <div className="info-item">
                                    <label>Priority</label>
                                    <span className={`priority-badge ${selectedTicket.priority}`}>{selectedTicket.priority}</span>
                                </div>
                                <div className="info-item">
                                    <label>Last Updated</label>
                                    <span>{new Date(selectedTicket.updated_at).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="sidebar-actions">
                                {selectedTicket.status !== 'closed' ? (
                                    <button
                                        className="btn-danger-outline full-width"
                                        onClick={() => handleStatusChange('closed')}
                                    >
                                        Close Ticket
                                    </button>
                                ) : (
                                    <button
                                        className="btn-primary-outline full-width"
                                        onClick={() => handleStatusChange('open')}
                                    >
                                        Reopen Ticket
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportDashboard;
