import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { Send, Paperclip, MoreVertical, Search } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../admin/AdminDashboard.css';
import './MarketplaceInbox.css';

const MarketplaceMessages = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [showMessagesOnMobile, setShowMessagesOnMobile] = useState(false);

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen size
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Mock data for demonstration (replace with API calls)
    useEffect(() => {
        // TODO: Fetch conversations from API
        const mockConversations = [];
        setConversations(mockConversations);
        setLoading(false);
    }, []);

    const filterTabs = [
        { id: 'all', label: 'All' },
        { id: 'selling', label: 'Selling' },
        { id: 'buying', label: 'Buying' },
    ];

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // TODO: Send message via API
        console.log('Sending message:', newMessage);
        setNewMessage('');
    };

    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation);
        setShowMessagesOnMobile(true);
    };

    const handleBackToConversations = () => {
        setShowMessagesOnMobile(false);
    };

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content marketplace-messages-main">
                <div className="content-wrapper">
                    {/* Page Header */}
                    <div className="page-header">
                        <h1 className="heading-1">Inbox</h1>
                        <p className="text-secondary">Manage your conversations with buyers and sellers</p>
                    </div>

                    {/* Inbox Container */}
                    <div className="inbox-container">
                        {/* Conversations List */}
                        <div className={`conversations-panel ${showMessagesOnMobile ? 'hide-on-mobile' : ''}`}>
                            {/* Filter Tabs */}
                            <div className="filter-tabs">
                                {filterTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveFilter(tab.id)}
                                        className={`filter-tab ${activeFilter === tab.id ? 'active' : ''}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Search Bar */}
                            <div className="conversation-search">
                                <input
                                    type="text"
                                    placeholder="Search conversations..."
                                    className="search-input"
                                />
                            </div>

                            {/* Conversations List */}
                            <div className="conversations-list">
                                {loading ? (
                                    <div className="empty-state-small">
                                        <p>Loading conversations...</p>
                                    </div>
                                ) : conversations.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">
                                            <Send size={48} style={{ opacity: 0.3 }} />
                                        </div>
                                        <h3 className="empty-state-title">No conversations</h3>
                                        <p className="empty-state-description">
                                            Start chatting with buyers and sellers
                                        </p>
                                    </div>
                                ) : (
                                    conversations.map((conversation) => (
                                        <div
                                            key={conversation.id}
                                            onClick={() => handleSelectConversation(conversation)}
                                            className={`conversation-card ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                                        >
                                            <div className="conversation-avatar">
                                                {conversation.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="conversation-info">
                                                <div className="conversation-header">
                                                    <h4 className="conversation-name">{conversation.name}</h4>
                                                    <span className="conversation-time">{conversation.time}</span>
                                                </div>
                                                <p className="conversation-preview">{conversation.lastMessage}</p>
                                            </div>
                                            {conversation.unread > 0 && (
                                                <div className="unread-badge">{conversation.unread}</div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Messages Panel */}
                        <div className={`messages-panel ${!showMessagesOnMobile ? 'hide-on-mobile' : ''}`}>
                            {!selectedConversation ? (
                                <div className="empty-messages-state">
                                    <Send size={64} style={{ color: 'var(--text-secondary)', opacity: 0.2 }} />
                                    <h3 className="heading-3" style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
                                        Select a conversation
                                    </h3>
                                    <p className="text-secondary" style={{ fontSize: '14px' }}>
                                        Choose a conversation from the list to view messages
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Chat Header */}
                                    <div className="chat-header">
                                        <button
                                            onClick={handleBackToConversations}
                                            className="back-to-conversations-btn"
                                            aria-label="Back to conversations"
                                        >
                                            ←
                                        </button>
                                        <div className="chat-user-info">
                                            <div className="conversation-avatar">
                                                {selectedConversation.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="chat-user-name">{selectedConversation.name}</h3>
                                                <p className="chat-user-status">Online</p>
                                            </div>
                                        </div>
                                        <button className="chat-options-btn">
                                            <MoreVertical size={20} />
                                        </button>
                                    </div>

                                    {/* Messages Area */}
                                    <div className="messages-area">
                                        {messages.length === 0 ? (
                                            <div className="no-messages">
                                                <p className="text-secondary">No messages yet. Start the conversation!</p>
                                            </div>
                                        ) : (
                                            messages.map((message, index) => (
                                                <div
                                                    key={index}
                                                    className={`message ${message.sentByMe ? 'sent' : 'received'}`}
                                                >
                                                    <div className="message-bubble">
                                                        <p className="message-text">{message.text}</p>
                                                        <span className="message-time">{message.time}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Message Input */}
                                    <div className="message-input-container">
                                        <form onSubmit={handleSendMessage} className="message-input-form">
                                            <button type="button" className="attach-btn">
                                                <Paperclip size={20} />
                                            </button>
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Type a message..."
                                                className="message-input"
                                            />
                                            <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
                                                <Send size={20} />
                                            </button>
                                        </form>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MarketplaceMessages;
