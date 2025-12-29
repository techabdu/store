import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { SERVER_URL } from '../../utils/api';
import './MessageCards.css';

/**
 * ProductCardMessage - Displays product details as an embedded card in chat
 * Used for interest messages when users first contact sellers about a listing
 */
const ProductCardMessage = ({ metadata, isSent }) => {
    const navigate = useNavigate();

    const getImageUrl = (url) => {
        if (!url) return '/placeholder-phone.png';
        if (url.startsWith('http')) return url;
        return `${SERVER_URL}${url}`;
    };

    const formatPrice = (price) => {
        return Number(price).toLocaleString('en-NG');
    };

    const handleClick = () => {
        if (metadata?.listing_id) {
            navigate(`/marketplace/listing/${metadata.listing_id}`);
        }
    };

    return (
        <div className={`interest-message-wrapper ${isSent ? 'sent' : 'received'}`}>
            {/* Interest Text */}
            <p className="interest-text">
                {isSent ? "I'm interested in this item:" : "Buyer is interested in:"}
            </p>

            {/* Product Card */}
            <div className="message-card product-card" onClick={handleClick}>
                <div className="message-card-image">
                    <img
                        src={getImageUrl(metadata?.image_url)}
                        alt={metadata?.title || 'Product'}
                    />
                </div>
                <div className="message-card-content">
                    <h4 className="message-card-title">{metadata?.title || 'Product'}</h4>
                    <p className="message-card-price">₦{formatPrice(metadata?.price || 0)}</p>
                    <div className="message-card-details">
                        {metadata?.condition && (
                            <span className="message-card-badge">{metadata.condition}</span>
                        )}
                        {metadata?.brand && metadata?.model && (
                            <span className="message-card-subtitle">{metadata.brand} {metadata.model}</span>
                        )}
                    </div>
                </div>
                <div className="message-card-action-icon">
                    <Eye size={16} />
                </div>
            </div>
        </div>
    );
};

export default ProductCardMessage;
