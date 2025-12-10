import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiChevronDown, FiMapPin, FiCheck } from 'react-icons/fi';
import './ShopSwitcher.css';

const ShopSwitcher = () => {
    const { currentShop, shops, isOwner, switchShop } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Don't render if not an owner or no shops
    if (!isOwner || shops.length <= 1) {
        // Show current shop name if available (for non-owners or single shop)
        if (currentShop) {
            return (
                <div className="shop-indicator">
                    <FiMapPin className="shop-icon" />
                    <span className="shop-name">{currentShop.shop_name}</span>
                </div>
            );
        }
        return null;
    }

    const handleShopSwitch = async (shop) => {
        if (shop.id === currentShop?.id) {
            setIsOpen(false);
            return;
        }

        setIsSwitching(true);
        try {
            const result = await switchShop(shop.id);
            if (result.success) {
                // Reload the page to refresh all data with new shop context
                window.location.reload();
            } else {
                console.error('Failed to switch shop:', result.error);
            }
        } catch (error) {
            console.error('Error switching shop:', error);
        } finally {
            setIsSwitching(false);
            setIsOpen(false);
        }
    };

    return (
        <div className="shop-switcher" ref={dropdownRef}>
            <button
                className={`shop-switcher-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                disabled={isSwitching}
            >
                <FiMapPin className="shop-icon" />
                <span className="current-shop-name">
                    {isSwitching ? 'Switching...' : (currentShop?.shop_name || 'Select Branch')}
                </span>
                <FiChevronDown className={`chevron ${isOpen ? 'rotated' : ''}`} />
            </button>

            {isOpen && (
                <div className="shop-dropdown">
                    <div className="shop-dropdown-header">
                        Switch Branch
                    </div>
                    <div className="shop-dropdown-list">
                        {shops.map((shop) => (
                            <button
                                key={shop.id}
                                className={`shop-option ${shop.id === currentShop?.id ? 'active' : ''}`}
                                onClick={() => handleShopSwitch(shop)}
                                disabled={isSwitching}
                            >
                                <div className="shop-option-info">
                                    <span className="shop-option-name">
                                        {shop.shop_name}
                                        {shop.is_main_branch && (
                                            <span className="main-branch-badge">Main</span>
                                        )}
                                    </span>
                                    {shop.shop_address && (
                                        <span className="shop-option-address">{shop.shop_address}</span>
                                    )}
                                </div>
                                {shop.id === currentShop?.id && (
                                    <FiCheck className="check-icon" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopSwitcher;
