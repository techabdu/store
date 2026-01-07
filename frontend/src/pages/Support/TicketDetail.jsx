import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import './Support.css';

const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [responses, setResponses] = useState([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchTicketDetails();
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [responses]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTicketDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/marketplace/support/my_tickets.php?action=detail&id=${id}`, {
                withCredentials: true
            });
            if (response.data.success) {
                setTicket(response.data.ticket);
                setResponses(response.data.responses);
            } else {
                setError(response.data.error || 'Failed to fetch ticket details');
            }
        } catch (err) {
            setError('An error occurred while fetching ticket details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || submitting) return;

        try {
            setSubmitting(true);
            const response = await axios.post('/api/marketplace/support/my_tickets.php?action=respond', {
                ticket_id: id,
                message: message.trim()
            }, {
                withCredentials: true
            });

            if (response.data.success) {
                setMessage('');
                fetchTicketDetails(); // Refresh to show new message
            } else {
                alert(response.data.error || 'Failed to send message');
            }
        } catch (err) {
            alert('An error occurred while sending your message');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="support-container"><div className="loading-spinner">Loading conversation...</div></div>;
    }

    if (error || !ticket) {
        return (
            <div className="support-container">
                <button className="btn-back" onClick={() => navigate('/support/tickets')}>
                    <ArrowLeft size={18} /> Back to My Tickets
                </button>
                <div className="error-alert">
                    <AlertTriangle size={20} />
                    <span>{error || 'Ticket not found'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="support-container">
            <button className="btn-back" onClick={() => navigate('/support/tickets')}>
                <ArrowLeft size={18} /> Back to My Tickets
            </button>

            <div className="ticket-detail-grid">
                {/* Main conversation area */}
                <div className="conversation-section glass-card">
                    <div className="conversation-header">
                        <h2>{ticket.subject}</h2>
                        <span className="ticket-id-label">{ticket.ticket_number}</span>
                    </div>

                    <div className="messages-list">
                        {/* Original ticket description */}
                        <div className="message-bubble original">
                            <div className="message-info">
                                <span className="sender-name">You (Original Request)</span>
                                <span className="message-time">{new Date(ticket.created_at).toLocaleString()}</span>
                            </div>
                            <div className="message-text">
                                {ticket.description}
                            </div>
                        </div>

                        {/* Responses */}
                        {responses.map((resp) => (
                            <div key={resp.id} className={`message-bubble ${resp.is_admin_response ? 'admin' : 'user'}`}>
                                <div className="message-info">
                                    <span className="sender-name">
                                        {resp.is_admin_response ? 'Support Team' : 'You'}
                                    </span>
                                    <span className="message-time">{new Date(resp.created_at).toLocaleString()}</span>
                                </div>
                                <div className="message-text">
                                    {resp.message}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {ticket.status !== 'closed' ? (
                        <form className="reply-form" onSubmit={handleSendMessage}>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your message here..."
                                disabled={submitting}
                            />
                            <button type="submit" disabled={submitting || !message.trim()} className="btn-send">
                                {submitting ? 'Sending...' : <><Send size={18} /> Send Message</>}
                            </button>
                        </form>
                    ) : (
                        <div className="closed-notification">
                            <CheckCircle size={20} />
                            <span>This ticket has been closed. You can no longer send messages.</span>
                        </div>
                    )}
                </div>

                {/* Sidebar with metadata */}
                <div className="ticket-sidebar">
                    <div className="sidebar-card glass-card">
                        <h3>Ticket Information</h3>
                        <div className="info-item">
                            <label>Status</label>
                            <span className={`badge badge-status status-${ticket.status}`}>
                                {ticket.status.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="info-item">
                            <label>Priority</label>
                            <span className={`badge badge-priority priority-${ticket.priority}`}>
                                {ticket.priority}
                            </span>
                        </div>
                        <div className="info-item">
                            <label>Type</label>
                            <span className={`badge badge-type type-${ticket.type}`}>
                                {ticket.type.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="info-item">
                            <label>Created At</label>
                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="sidebar-card glass-card help-card">
                        <Clock size={32} />
                        <h3>Need help?</h3>
                        <p>Our support team typically responds within 24 hours during business days.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDetail;
