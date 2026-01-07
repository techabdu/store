import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DataTable from '../../components/Tables/DataTable';
import { Plus, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import './Support.css';

const MyTickets = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/marketplace/support/my_tickets.php?action=list', {
                withCredentials: true
            });
            if (response.data.success) {
                setTickets(response.data.tickets);
            } else {
                setError(response.data.error || 'Failed to fetch tickets');
            }
        } catch (err) {
            setError('An error occurred while fetching your tickets');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: 'ticket_number',
            label: 'Ticket #',
            sortable: true,
            render: (val) => <span className="ticket-number">{val}</span>
        },
        {
            key: 'subject',
            label: 'Subject',
            sortable: true,
            render: (val) => <span className="ticket-subject">{val}</span>
        },
        {
            key: 'type',
            label: 'Type',
            sortable: true,
            render: (val) => (
                <span className={`badge badge-type type-${val}`}>
                    {val.replace('_', ' ')}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (val) => (
                <span className={`badge badge-status status-${val}`}>
                    {val.replace('_', ' ')}
                </span>
            )
        },
        {
            key: 'priority',
            label: 'Priority',
            sortable: true,
            render: (val) => (
                <span className={`badge badge-priority priority-${val}`}>
                    {val}
                </span>
            )
        },
        {
            key: 'updated_at',
            label: 'Last Updated',
            sortable: true,
            render: (val) => new Date(val).toLocaleString()
        }
    ];

    const handleRowClick = (ticket) => {
        navigate(`/support/ticket/${ticket.id}`);
    };

    if (loading) {
        return (
            <div className="support-container">
                <div className="loading-spinner">Loading tickets...</div>
            </div>
        );
    }

    return (
        <div className="support-container">
            <div className="support-header">
                <div>
                    <h1>My Support Tickets</h1>
                    <p>Track and manage your reports and disputes</p>
                </div>
                <button
                    className="btn-create-ticket"
                    onClick={() => navigate('/marketplace/report')}
                >
                    <Plus size={18} />
                    New Ticket
                </button>
            </div>

            {error && (
                <div className="error-alert">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <div className="glass-card">
                <DataTable
                    columns={columns}
                    data={tickets}
                    onRowClick={handleRowClick}
                    pageSize={10}
                />
            </div>

            <div className="support-info-cards">
                <div className="info-card glass-card">
                    <div className="icon-wrapper blue">
                        <MessageSquare size={24} />
                    </div>
                    <h3>Active Conversations</h3>
                    <p>{tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length} tickets currently active</p>
                </div>
                <div className="info-card glass-card">
                    <div className="icon-wrapper yellow">
                        <Clock size={24} />
                    </div>
                    <h3>Average Response Time</h3>
                    <p>Typically under 24 hours</p>
                </div>
            </div>
        </div>
    );
};

export default MyTickets;
