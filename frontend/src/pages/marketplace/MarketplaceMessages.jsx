import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MarketplaceSidebar from '../../components/MarketplaceSidebar';
import TopBar from '../../components/TopBar';
import { Send, Paperclip, MoreVertical, Search } from 'lucide-react';
import api, { SERVER_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import DeliveryActionBar from '../../components/marketplace/DeliveryActionBar';
import ConfirmDeliveryModal from '../../components/marketplace/ConfirmDeliveryModal';
import ReportIssueView from '../../components/marketplace/ReportIssueModal';
import ProductCardMessage from '../../components/marketplace/ProductCardMessage';
import OrderCardMessage from '../../components/marketplace/OrderCardMessage';
import '../admin/AdminDashboard.css';
import './MarketplacePage.css';
import './MarketplaceInbox.css';

const MarketplaceMessages = () => {
    const { user, currentShop } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [showMessagesOnMobile, setShowMessagesOnMobile] = useState(false);
    const [sending, setSending] = useState(false);
    const [visibleConversations, setVisibleConversations] = useState(15);
    const autoMessageSentRef = useRef(false);

    // Sidebar state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Delivery tracking state
    const [currentOrder, setCurrentOrder] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return `${SERVER_URL}${path}`;
    };

    const filteredConversations = conversations.filter(conv => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'buying') return conv.buyer_id == user?.id;
        if (activeFilter === 'selling') return conv.seller_id == user?.id;
        return true;
    });

    // Get listing_id from URL if present
    const queryParams = new URLSearchParams(location.search);
    const listingIdParam = queryParams.get('listing_id');
    const buyerIdParam = queryParams.get('buyer_id');
    const brandParam = queryParams.get('brand');
    const modelParam = queryParams.get('model');

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

    // Fetch conversations
    const fetchConversations = async (selectId = null) => {
        try {
            setLoading(true);
            const shopId = currentShop?.id;
            const response = await api.get(`/marketplace/messaging/get_conversations.php${shopId ? `?shop_id=${shopId}` : ''}`);
            if (response.data.success) {
                setConversations(response.data.conversations);

                // If we have a conversation to auto-select
                if (selectId) {
                    const conv = response.data.conversations.find(c => c.conversation_id == selectId);
                    if (conv) {
                        setSelectedConversation(conv);
                        fetchMessages(conv.conversation_id);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching conversations:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreConversations = () => {
        setVisibleConversations(prev => prev + 15);
    };

    // Fetch messages for a conversation
    const fetchMessages = async (conversationId) => {
        try {
            const response = await api.get(`/marketplace/messaging/get_messages.php?conversation_id=${conversationId}`);
            if (response.data.success) {
                setMessages(response.data.messages);
            }
        } catch (err) {
            console.error("Error fetching messages:", err);
        }
    };

    // Fetch order details for the selected conversation
    const fetchOrderDetails = async (conversationId) => {
        try {
            const response = await api.get(`/marketplace/orders/get_by_conversation.php?conversation_id=${conversationId}`);
            if (response.data.success && response.data.order) {
                setCurrentOrder(response.data.order);
            } else {
                setCurrentOrder(null);
            }
        } catch (err) {
            console.error("Error fetching order details:", err);
            setCurrentOrder(null);
        }
    };

    // Initialize conversation from listing_id
    useEffect(() => {
        const initChat = async () => {
            if (listingIdParam) {
                try {
                    const response = await api.post('/marketplace/messaging/initialize_conversation.php', {
                        listing_id: listingIdParam,
                        buyer_id: buyerIdParam
                    });
                    if (response.data.success) {
                        const conversationId = response.data.conversation_id;

                        // Check existing messages first to prevent duplicates
                        let existingMessages = [];
                        try {
                            const msgsResponse = await api.get(`/marketplace/messaging/get_messages.php?conversation_id=${conversationId}`);
                            if (msgsResponse.data.success) {
                                existingMessages = msgsResponse.data.messages;
                            }
                        } catch (msgFetchErr) {
                            console.error("Error fetching messages during init:", msgFetchErr);
                        }

                        // If brand and model params exist AND conversation is empty, send automatic interest message with product card
                        if (brandParam && modelParam && existingMessages.length === 0 && !autoMessageSentRef.current) {
                            autoMessageSentRef.current = true; // Mark as sent
                            const interestMessage = `I am interested in this ${brandParam} ${modelParam}`;

                            // Build product card metadata from listing info if available
                            const listingInfo = response.data.listing;
                            const productMetadata = listingInfo ? {
                                listing_id: listingInfo.id,
                                title: listingInfo.title,
                                price: listingInfo.price,
                                image_url: listingInfo.image_url,
                                condition: listingInfo.condition,
                                brand: listingInfo.brand,
                                model: listingInfo.model
                            } : null;

                            try {
                                await api.post('/marketplace/messaging/send.php', {
                                    conversation_id: conversationId,
                                    message: interestMessage,
                                    message_type: productMetadata ? 'product_card' : 'text',
                                    metadata: productMetadata
                                });
                                // Add this new message to our local list so we don't think it's empty anymore if we re-check
                                existingMessages.push({
                                    message: interestMessage,
                                    message_type: productMetadata ? 'product_card' : 'text',
                                    metadata: productMetadata,
                                    is_me: true,
                                    created_at: new Date().toISOString()
                                });
                            } catch (msgErr) {
                                console.error("Error sending interest message:", msgErr);
                                autoMessageSentRef.current = false; // Reset on error so user can retry
                            }
                        }

                        // Update messages state immediately to avoid loading flicker
                        setMessages(existingMessages);

                        // Fetch conversations and select the new one (without refetching messages redundantly if possible, 
                        // but fetchConversations logic handles selection which triggers message fetch.
                        // We can optimize fetchConversations later or just let it happen.)
                        fetchConversations(conversationId);

                        // Clean URL to prevent re-triggering on reload/back
                        navigate('/marketplace/messages', { replace: true });
                    } else {
                        fetchConversations();
                    }
                } catch (err) {
                    console.error("Error initializing conversation:", err);
                    if (err.response?.data?.error) {
                        alert(err.response.data.error);
                    }
                    fetchConversations();
                }
            } else {
                fetchConversations();
            }
        };

        // Only run if listingIdParam changes or we haven't initialized yet
        initChat();
    }, [listingIdParam, buyerIdParam, currentShop?.id]);

    // Polling for new messages in selected conversation
    useEffect(() => {
        let interval;
        if (selectedConversation) {
            interval = setInterval(() => {
                fetchMessages(selectedConversation.conversation_id);
            }, 5000); // Poll every 5 seconds
        }
        return () => clearInterval(interval);
    }, [selectedConversation]);

    const filterTabs = [
        { id: 'all', label: 'All' },
        { id: 'selling', label: 'Selling' },
        { id: 'buying', label: 'Buying' },
    ];

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation || sending) return;

        try {
            setSending(true);
            const response = await api.post('/marketplace/messaging/send.php', {
                conversation_id: selectedConversation.conversation_id,
                listing_id: selectedConversation.listing_id,
                message: newMessage.trim()
            });

            if (response.data.success) {
                setNewMessage('');
                fetchMessages(selectedConversation.conversation_id);
                // Also update conversation list to show latest message
                fetchConversations();
            }
        } catch (err) {
            console.error("Error sending message:", err);
            alert("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation);
        setMessages([]); // Clear old messages while loading
        setCurrentOrder(null); // Clear old order
        fetchMessages(conversation.conversation_id);
        fetchOrderDetails(conversation.conversation_id);
        setShowMessagesOnMobile(true);
    };

    const handleBackToConversations = () => {
        setShowMessagesOnMobile(false);
    };

    // Handle seller marking order as shipped
    const handleMarkShipped = async () => {
        if (!currentOrder) return;

        try {
            const response = await api.post('/marketplace/orders/mark_shipped.php', {
                order_id: currentOrder.id
            });

            if (response.data.success) {
                // Refresh order and messages
                await fetchOrderDetails(selectedConversation.conversation_id);
                await fetchMessages(selectedConversation.conversation_id);
                alert('Order marked as shipped successfully!');
            }
        } catch (err) {
            console.error('Error marking order as shipped:', err);
            alert(err.response?.data?.error || 'Failed to mark order as shipped');
        }
    };

    // Handle buyer confirming delivery (show modal first)
    const handleConfirmDelivery = async () => {
        setShowConfirmModal(true);
    };

    // Actually confirm delivery after modal confirmation
    const handleProceedConfirmDelivery = async () => {
        if (!currentOrder) return;

        try {
            setModalLoading(true);
            const response = await api.post('/marketplace/orders/confirm_delivery.php', {
                order_id: currentOrder.id
            });

            if (response.data.success) {
                setShowConfirmModal(false);
                // Refresh order and messages
                await fetchOrderDetails(selectedConversation.conversation_id);
                await fetchMessages(selectedConversation.conversation_id);
                alert('Delivery confirmed! Funds have been released to the seller.');
            }
        } catch (err) {
            console.error('Error confirming delivery:', err);
            alert(err.response?.data?.error || 'Failed to confirm delivery');
        } finally {
            setModalLoading(false);
        }
    };

    // Handle dispute reporting
    const handleReportIssue = () => {
        setShowReportModal(true);
    };

    const handleSubmitDispute = async (disputeData) => {
        if (!currentOrder) return;

        try {
            setModalLoading(true);
            const response = await api.post('/marketplace/disputes/create.php', {
                order_id: currentOrder.id,
                issue_type: disputeData.issue_type,
                description: disputeData.description
            });

            if (response.data.success) {
                setShowReportModal(false);
                // Refresh messages to show the dispute notification
                await fetchMessages(selectedConversation.conversation_id);
                alert('Dispute reported successfully. Our support team will review your case.');
            }
        } catch (err) {
            console.error('Error reporting dispute:', err);
            alert(err.response?.data?.error || 'Failed to report dispute');
        } finally {
            setModalLoading(false);
        }
    };

    // Navigate to other party's profile
    const handleHeaderClick = () => {
        if (!selectedConversation || !user) return;

        const otherPartyId = String(selectedConversation.buyer_id) === String(user.id)
            ? selectedConversation.seller_id
            : selectedConversation.buyer_id;

        navigate(`/marketplace/seller/${otherPartyId}`);
    };

    return (
        <div className="dashboard-container">
            <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} />
            <MarketplaceSidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                closeSidebar={() => setSidebarOpen(false)}
            />

            <main className="main-content marketplace-main marketplace-messages-main">
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
                            ) : filteredConversations.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon">
                                        <Send size={48} style={{ opacity: 0.3 }} />
                                    </div>
                                    <h3 className="empty-state-title">No {activeFilter === 'all' ? '' : activeFilter} conversations</h3>
                                    <p className="empty-state-description">
                                        {activeFilter === 'buying'
                                            ? "You haven't messaged any sellers yet"
                                            : activeFilter === 'selling'
                                                ? "No buyers have messaged your shop yet"
                                                : "Start chatting with buyers and sellers"}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {filteredConversations.slice(0, visibleConversations).map((conversation) => (
                                        <div
                                            key={conversation.conversation_id}
                                            onClick={() => handleSelectConversation(conversation)}
                                            className={`conversation-card ${selectedConversation?.conversation_id === conversation.conversation_id ? 'active' : ''}`}
                                        >
                                            <div className="conversation-avatar">
                                                {conversation.other_party_image ? (
                                                    <img src={getImageUrl(conversation.other_party_image)} alt={conversation.other_party_name} className="avatar-img" />
                                                ) : (
                                                    conversation.other_party_name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="conversation-info">
                                                <div className="conversation-header">
                                                    <h4 className="conversation-name">{conversation.other_party_name}</h4>
                                                    <span className="conversation-time">
                                                        {new Date(conversation.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="conversation-preview">{conversation.last_message || "No messages yet"}</p>
                                                <p className="listing-tag">{conversation.listing_title}</p>
                                            </div>
                                            {conversation.has_unread && (
                                                <div className="unread-badge">!</div>
                                            )}
                                        </div>
                                    ))}
                                    {visibleConversations < filteredConversations.length && (
                                        <div style={{ padding: '16px', textAlign: 'center' }}>
                                            <button
                                                onClick={loadMoreConversations}
                                                className="btn-load-more"
                                                style={{ width: '100%', padding: '10px' }}
                                            >
                                                Load More
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Messages Panel - or Report Issue Focused View */}
                    <div className={`messages-panel ${!showMessagesOnMobile ? 'hide-on-mobile' : ''}`}>
                        {/* Show Report Issue Focused View */}
                        {showReportModal && currentOrder ? (
                            <ReportIssueView
                                onClose={() => setShowReportModal(false)}
                                onSubmit={handleSubmitDispute}
                                order={currentOrder}
                                isBuyer={currentOrder?.buyer_id === user?.id}
                                isLoading={modalLoading}
                            />
                        ) : !selectedConversation ? (
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
                                    <div className="chat-user-info" onClick={handleHeaderClick}>
                                        <div className="conversation-avatar">
                                            {selectedConversation.other_party_image ? (
                                                <img src={getImageUrl(selectedConversation.other_party_image)} alt={selectedConversation.other_party_name} className="avatar-img" />
                                            ) : (
                                                selectedConversation.other_party_name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="chat-user-name">{selectedConversation.other_party_name}</h3>
                                            <p className="chat-user-status">{selectedConversation.listing_title}</p>
                                        </div>
                                    </div>
                                    <button className="chat-options-btn">
                                        <MoreVertical size={20} />
                                    </button>
                                </div>

                                {/* Delivery Action Bar */}
                                {currentOrder && (
                                    <DeliveryActionBar
                                        order={currentOrder}
                                        currentUserId={user?.id}
                                        onShipped={handleMarkShipped}
                                        onReceived={handleConfirmDelivery}
                                        onReportIssue={handleReportIssue}
                                    />
                                )}

                                {/* Messages Area */}
                                <div className="messages-area">
                                    {messages.length === 0 ? (
                                        <div className="no-messages">
                                            <p className="text-secondary">No messages yet. Start the conversation!</p>
                                        </div>
                                    ) : (
                                        messages.map((message, index) => (
                                            <div
                                                key={message.id || index}
                                                className={`message ${message.is_me ? 'sent' : 'received'}`}
                                            >
                                                {/* Render different message types */}
                                                {message.message_type === 'product_card' && message.metadata ? (
                                                    <ProductCardMessage
                                                        metadata={message.metadata}
                                                        isSent={message.is_me}
                                                    />
                                                ) : message.message_type === 'order_card' && message.metadata ? (
                                                    <OrderCardMessage
                                                        metadata={message.metadata}
                                                        isSent={message.is_me}
                                                    />
                                                ) : (
                                                    <div className="message-bubble">
                                                        <p className="message-text">{message.message}</p>
                                                        <span className="message-time">
                                                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                )}
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
                                        <button type="submit" className="send-btn" disabled={!newMessage.trim() || sending}>
                                            {sending ? '...' : <Send size={20} />}
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <ConfirmDeliveryModal
                    isOpen={showConfirmModal}
                    onClose={() => setShowConfirmModal(false)}
                    onConfirm={handleProceedConfirmDelivery}
                    order={currentOrder}
                    isLoading={modalLoading}
                />
            </main>
        </div>
    );
};

export default MarketplaceMessages;
