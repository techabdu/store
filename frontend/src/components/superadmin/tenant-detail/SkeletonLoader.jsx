import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ type = 'card', count = 1 }) => {
    const renderSkeleton = () => {
        switch (type) {
            case 'card':
                return (
                    <div className="skeleton-card glass-card animate-pulse">
                        <div className="skeleton-header">
                            <div className="skeleton-icon"></div>
                            <div className="skeleton-title"></div>
                        </div>
                        <div className="skeleton-body">
                            <div className="skeleton-line"></div>
                            <div className="skeleton-line short"></div>
                        </div>
                    </div>
                );
            case 'stats':
                return (
                    <div className="skeleton-stats animate-pulse">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="skeleton-stat-card glass-card">
                                <div className="skeleton-icon-round"></div>
                                <div className="skeleton-stat-content">
                                    <div className="skeleton-line short"></div>
                                    <div className="skeleton-line medium"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'list':
                return (
                    <div className="skeleton-list animate-pulse">
                        {[...Array(count)].map((_, i) => (
                            <div key={i} className="skeleton-list-item">
                                <div className="skeleton-marker"></div>
                                <div className="skeleton-item-content">
                                    <div className="skeleton-line"></div>
                                    <div className="skeleton-line short"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'table':
                return (
                    <div className="skeleton-table-wrapper animate-pulse">
                        <div className="skeleton-table-header">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-header-cell"></div>)}
                        </div>
                        {[...Array(count)].map((_, i) => (
                            <div key={i} className="skeleton-table-row">
                                {[1, 2, 3, 4, 5].map(j => <div key={j} className="skeleton-cell"></div>)}
                            </div>
                        ))}
                    </div>
                );
            default:
                return <div className="skeleton-line animate-pulse"></div>;
        }
    };

    return (
        <div className="skeleton-container">
            {type === 'stats' ? renderSkeleton() : [...Array(count)].map((_, i) => (
                <div key={i} style={{ width: '100%' }}>
                    {renderSkeleton()}
                </div>
            ))}
        </div>
    );
};

export default SkeletonLoader;
