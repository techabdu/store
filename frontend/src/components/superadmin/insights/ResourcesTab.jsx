import React from 'react';
import { FaServer, FaHdd, FaLock, FaClock, FaMicrochip } from 'react-icons/fa';
import './InsightsTabs.css';

const ResourcesTab = ({ data }) => {
    if (!data) return <div>No resources data available</div>;

    const { php_info, disk_space, file_permissions, server_uptime, system_load } = data;

    return (
        <div className="insights-tab resources-tab">
            <div className="tab-grid">
                {/* PHP Information */}
                <div className="insight-card">
                    <h3>
                        <FaServer className="card-icon info" />
                        PHP Configuration
                    </h3>
                    {php_info ? (
                        <div className="config-list">
                            <div className="config-item">
                                <span className="config-label">Version:</span>
                                <span className="config-value">{php_info.version}</span>
                            </div>
                            <div className="config-item">
                                <span className="config-label">Memory Limit:</span>
                                <span className="config-value">{php_info.memory_limit}</span>
                            </div>
                            <div className="config-item">
                                <span className="config-label">Max Execution Time:</span>
                                <span className="config-value">{php_info.max_execution_time}s</span>
                            </div>
                            <div className="config-item">
                                <span className="config-label">Upload Max Size:</span>
                                <span className="config-value">{php_info.upload_max_filesize}</span>
                            </div>
                            <div className="config-item">
                                <span className="config-label">Post Max Size:</span>
                                <span className="config-value">{php_info.post_max_size}</span>
                            </div>
                            <div className="config-item">
                                <span className="config-label">Display Errors:</span>
                                <span className={`config-value ${php_info.display_errors === '1' ? 'warning' : 'success'}`}>
                                    {php_info.display_errors === '1' ? 'On (Insecure)' : 'Off'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No PHP info</div>
                    )}
                </div>

                {/* Disk Space */}
                <div className="insight-card">
                    <h3>
                        <FaHdd className="card-icon info" />
                        Disk Space
                    </h3>
                    {disk_space ? (
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">Total Space</div>
                                <div className="metric-value">{disk_space.total_gb} GB</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Used Space</div>
                                <div className="metric-value">{disk_space.used_gb} GB</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Free Space</div>
                                <div className="metric-value success">{disk_space.free_gb} GB</div>
                            </div>
                            <div className="progress-bar-container full-width">
                                <div className="progress-label">Disk Usage: {disk_space.usage_percentage}%</div>
                                <div className="progress-bar">
                                    <div
                                        className={`progress-fill ${disk_space.usage_percentage > 80 ? 'critical' : disk_space.usage_percentage > 60 ? 'warning' : 'success'}`}
                                        style={{ width: `${disk_space.usage_percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No disk space data</div>
                    )}
                </div>

                {/* File Permissions */}
                <div className="insight-card">
                    <h3>
                        <FaLock className="card-icon info" />
                        File Permissions
                    </h3>
                    {file_permissions ? (
                        <div>
                            <div className="status-badge-large">
                                <span className={`status ${file_permissions.status}`}>
                                    {file_permissions.status === 'secure' ? 'Secure' : 'Issues Found'}
                                </span>
                            </div>
                            {file_permissions.issues && file_permissions.issues.length > 0 ? (
                                <div className="issues-list">
                                    {file_permissions.issues.map((issue, index) => (
                                        <div key={index} className={`issue-item ${issue.severity}`}>
                                            <div className="issue-path">{issue.path}</div>
                                            <div className="issue-desc">{issue.issue}</div>
                                            <div className="issue-perms">Permissions: {issue.permissions}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-issues">
                                    <p>All file permissions are secure</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No permission data</div>
                    )}
                </div>

                {/* Server Uptime */}
                <div className="insight-card">
                    <h3>
                        <FaClock className="card-icon info" />
                        Server Uptime
                    </h3>
                    {server_uptime ? (
                        <div className="uptime-display">
                            <div className="uptime-value">{server_uptime.uptime_formatted}</div>
                            {server_uptime.first_activity && (
                                <div className="uptime-since">
                                    Since: {new Date(server_uptime.first_activity).toLocaleString()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">No uptime data</div>
                    )}
                </div>

                {/* System Load */}
                {system_load && system_load.available && (
                    <div className="insight-card">
                        <h3>
                            <FaMicrochip className="card-icon info" />
                            System Load
                        </h3>
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <div className="metric-label">1 Minute</div>
                                <div className="metric-value">{system_load.load_1min}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">5 Minutes</div>
                                <div className="metric-value">{system_load.load_5min}</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">15 Minutes</div>
                                <div className="metric-value">{system_load.load_15min}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PHP Extensions */}
                {php_info && php_info.extensions && (
                    <div className="insight-card">
                        <h3>
                            <FaServer className="card-icon info" />
                            PHP Extensions
                        </h3>
                        <div className="extensions-grid">
                            {Object.entries(php_info.extensions).map(([ext, loaded]) => (
                                <div key={ext} className="extension-item">
                                    <span className="extension-name">{ext}</span>
                                    <span className={`extension-status ${loaded ? 'success' : 'error'}`}>
                                        {loaded ? '✓ Loaded' : '✗ Not Loaded'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourcesTab;
