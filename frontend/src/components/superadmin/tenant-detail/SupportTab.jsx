import { useState, useEffect } from 'react';
import {
    MessageSquare, AlertCircle, CheckCircle,
    Clock, Plus, Search, Filter, ExternalLink,
    FileText, User, Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SkeletonLoader from './SkeletonLoader';
import api from '../../../utils/api';
import './SupportTab.css';

const SupportTab = ({ tenantId }) => {
    const [tickets, setTickets] = useState([]);
    const [communications, setCommunications] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [newNote, setNewNote] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    useEffect(() => {
        if (tenantId) {
            fetchSupportData();
        }
    }, [tenantId]);

    const fetchSupportData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [ticketsRes, commsRes, notesRes] = await Promise.all([
                api.get(`/superadmin/tenant_support.php?action=tickets&tenant_id=${tenantId}`),
                api.get(`/superadmin/tenant_support.php?action=communications&tenant_id=${tenantId}`),
                api.get(`/superadmin/tenant_settings.php?action=get_notes&tenant_id=${tenantId}`)
            ]);

            if (ticketsRes.data.success) setTickets(ticketsRes.data.tickets || []);
            if (commsRes.data.success) setCommunications(commsRes.data.communications || []);
            if (notesRes.data.success) setNotes(notesRes.data.notes || []);

        } catch (err) {
            console.error('Error fetching support data:', err);
            setError(err.response?.data?.error || 'Failed to load support records');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        try {
            setAddingNote(true);
            const response = await api.post('/superadmin/tenant_settings.php?action=add_note', {
                tenant_id: tenantId,
                note: newNote
            });

            if (response.data.success) {
                setNewNote('');
                // Refresh notes
                const notesRes = await api.get(`/superadmin/tenant_settings.php?action=get_notes&tenant_id=${tenantId}`);
                if (notesRes.data.success) setNotes(notesRes.data.notes || []);
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to add note');
        } finally {
            setAddingNote(false);
        }
    };

    const deleteNote = async (noteId) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;

        try {
            const response = await api.post('/superadmin/tenant_settings.php?action=delete_note', {
                note_id: noteId
            });

            if (response.data.success) {
                setNotes(notes.filter(n => n.id !== noteId));
            }
        } catch (err) {
            alert('Failed to delete note');
        }
    };

    const getStatusBadge = (status) => {
        const statuses = {
            'open': 'badge-red',
            'in_progress': 'badge-blue',
            'resolved': 'badge-green',
            'closed': 'badge-gray'
        };
        return <span className={`status-badge ${statuses[status] || ''}`}>{status.replace('_', ' ')}</span>;
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.id.toString().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="support-tab skeleton-mode">
                <div className="support-grid">
                    <div className="support-main">
                        <SkeletonLoader type="table" count={4} />
                        <div style={{ marginTop: '2rem' }}>
                            <SkeletonLoader type="list" count={4} />
                        </div>
                    </div>
                    <div className="support-sidebar">
                        <SkeletonLoader type="card" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="support-tab">
            <div className="support-grid">
                {/* Tickets Section */}
                <div className="support-main">
                    <div className="section-card">
                        <div className="card-header">
                            <h3><MessageSquare size={20} /> Support Tickets</h3>
                            <button className="btn-secondary btn-sm" onClick={fetchSupportData}>
                                Refresh
                            </button>
                        </div>

                        <div className="filters-bar">
                            <div className="search-input">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search tickets..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="filter-select">
                                <Filter size={18} />
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="all">All Status</option>
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                        </div>

                        <div className="tickets-list">
                            {filteredTickets.length > 0 ? (
                                filteredTickets.map(ticket => (
                                    <div key={ticket.id} className="ticket-item">
                                        <div className="ticket-header">
                                            <div className="ticket-id">#{ticket.id}</div>
                                            {getStatusBadge(ticket.status)}
                                        </div>
                                        <div className="ticket-subject">{ticket.subject}</div>
                                        <div className="ticket-footer">
                                            <span className="ticket-date">
                                                <Clock size={14} /> {new Date(ticket.created_at).toLocaleDateString()}
                                            </span>
                                            <Link to={`/superadmin/support?ticket=${ticket.id}`} className="view-link">
                                                View Full Ticket <ExternalLink size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    icon={MessageSquare}
                                    title="No Tickets"
                                    description="No support tickets found matching your filters."
                                />
                            )}
                        </div>
                    </div>

                    {/* Communication Log */}
                    <div className="section-card">
                        <div className="card-header">
                            <h3><Mail size={20} /> Communication Log</h3>
                        </div>
                        <div className="comms-timeline">
                            {communications.length > 0 ? (
                                communications.map((comm, index) => (
                                    <div key={index} className="comm-item">
                                        <div className="comm-icon">
                                            {comm.type === 'email' ? <Mail size={16} /> : <FileText size={16} />}
                                        </div>
                                        <div className="comm-content">
                                            <div className="comm-header">
                                                <span className="comm-type">{comm.type}</span>
                                                <span className="comm-time">{new Date(comm.created_at).toLocaleString()}</span>
                                            </div>
                                            <div className="comm-subject">{comm.subject}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    icon={Mail}
                                    title="No Logs"
                                    description="No communication logs found for this tenant."
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Notes */}
                <div className="support-sidebar">
                    <div className="section-card narrow">
                        <div className="card-header">
                            <h3><FileText size={20} /> Internal Notes</h3>
                        </div>
                        <form className="note-form" onSubmit={handleAddNote}>
                            <textarea
                                placeholder="Add a private note about this tenant..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                disabled={addingNote}
                            ></textarea>
                            <button type="submit" className="btn-primary btn-sm" disabled={addingNote}>
                                <Plus size={16} /> {addingNote ? 'Adding...' : 'Add Note'}
                            </button>
                        </form>

                        <div className="notes-list">
                            {notes.length > 0 ? (
                                notes.map(note => (
                                    <div key={note.id} className="note-item">
                                        <div className="note-meta">
                                            <span className="note-author">
                                                <User size={14} /> {note.created_by_name || 'Admin'}
                                            </span>
                                            <button className="delete-btn" onClick={() => deleteNote(note.id)}>×</button>
                                        </div>
                                        <div className="note-text">{note.note}</div>
                                        <div className="note-date">
                                            {new Date(note.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    icon={FileText}
                                    title="No Notes"
                                    description="No internal notes recorded."
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportTab;
