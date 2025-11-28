import React from 'react';
import { FaBug, FaShieldAlt, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import './InsightsTabs.css';

const VulnerabilitiesTab = ({ data }) => {
    if (!data) return <div>No vulnerability data available</div>;

    const { overall_score, status, total_issues, breakdown } = data;

    // Determine score color
    const getScoreColor = (score) => {
        if (score >= 85) return 'success';
        if (score >= 70) return 'info';
        if (score >= 50) return 'warning';
        return 'critical';
    };

    return (
        <div className="insights-tab vulnerabilities-tab">
            <div className="tab-grid">
                {/* Overall Security Score */}
                <div className="insight-card featured">
                    <h3>
                        <FaShieldAlt className="card-icon info" />
                        Overall Security Score
                    </h3>
                    <div className="security-score-display">
                        <div className={`score-circle ${getScoreColor(overall_score)}`}>
                            <div className="score-value">{overall_score}</div>
                            <div className="score-max">/100</div>
                        </div>
                        <div className="score-status">
                            <span className={`status-badge ${status}`}>{status}</span>
                        </div>
                        <div className="score-issues">
                            <strong>{total_issues}</strong> issue(s) found
                        </div>
                    </div>
                </div>

                {/* PHP Security */}
                {breakdown && breakdown.php_security && (
                    <div className="insight-card">
                        <h3>
                            <FaBug className="card-icon warning" />
                            PHP Security
                        </h3>
                        <div className="score-mini">
                            <div className={`mini-score ${getScoreColor(breakdown.php_security.security_score)}`}>
                                {breakdown.php_security.security_score}/100
                            </div>
                            <div className="mini-status">{breakdown.php_security.status}</div>
                        </div>
                        {breakdown.php_security.issues && breakdown.php_security.issues.length > 0 ? (
                            <div className="issues-list">
                                {breakdown.php_security.issues.map((issue, index) => (
                                    <div key={index} className={`issue-item ${issue.severity}`}>
                                        <div className="issue-setting">{issue.setting}</div>
                                        <div className="issue-values">
                                            <span className="current">Current: {issue.current_value}</span>
                                            <span className="recommended">Recommended: {issue.recommended_value}</span>
                                        </div>
                                        <div className="issue-desc">{issue.description}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-issues">
                                <FaCheckCircle className="success-icon" />
                                <p>No PHP security issues</p>
                            </div>
                        )}
                    </div>
                )}

                {/* File Permissions */}
                {breakdown && breakdown.file_permissions && (
                    <div className="insight-card">
                        <h3>
                            <FaExclamationTriangle className="card-icon warning" />
                            File Permissions
                        </h3>
                        <div className="score-mini">
                            <div className={`mini-score ${getScoreColor(breakdown.file_permissions.security_score)}`}>
                                {breakdown.file_permissions.security_score}/100
                            </div>
                            <div className="mini-status">{breakdown.file_permissions.status}</div>
                        </div>
                        {breakdown.file_permissions.issues && breakdown.file_permissions.issues.length > 0 ? (
                            <div className="issues-list">
                                {breakdown.file_permissions.issues.map((issue, index) => (
                                    <div key={index} className={`issue-item ${issue.severity}`}>
                                        <div className="issue-path">{issue.path}</div>
                                        <div className="issue-perms">Permissions: {issue.permissions}</div>
                                        <div className="issue-desc">{issue.description}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-issues">
                                <FaCheckCircle className="success-icon" />
                                <p>All file permissions secure</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Exposed Files */}
                {breakdown && breakdown.exposed_files && (
                    <div className="insight-card">
                        <h3>
                            <FaExclamationTriangle className="card-icon critical" />
                            Exposed Sensitive Files
                        </h3>
                        <div className="score-mini">
                            <div className={`mini-score ${getScoreColor(breakdown.exposed_files.security_score)}`}>
                                {breakdown.exposed_files.security_score}/100
                            </div>
                            <div className="mini-status">{breakdown.exposed_files.status}</div>
                        </div>
                        {breakdown.exposed_files.issues && breakdown.exposed_files.issues.length > 0 ? (
                            <div className="issues-list">
                                {breakdown.exposed_files.issues.map((issue, index) => (
                                    <div key={index} className={`issue-item ${issue.severity}`}>
                                        <div className="issue-file">{issue.file}</div>
                                        <div className="issue-desc">{issue.description}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-issues">
                                <FaCheckCircle className="success-icon" />
                                <p>No exposed sensitive files</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Session Security */}
                {breakdown && breakdown.session_security && (
                    <div className="insight-card">
                        <h3>
                            <FaShieldAlt className="card-icon info" />
                            Session Security
                        </h3>
                        <div className="score-mini">
                            <div className={`mini-score ${getScoreColor(breakdown.session_security.security_score)}`}>
                                {breakdown.session_security.security_score}/100
                            </div>
                            <div className="mini-status">{breakdown.session_security.status}</div>
                        </div>
                        {breakdown.session_security.issues && breakdown.session_security.issues.length > 0 ? (
                            <div className="issues-list">
                                {breakdown.session_security.issues.map((issue, index) => (
                                    <div key={index} className={`issue-item ${issue.severity}`}>
                                        <div className="issue-setting">{issue.setting}</div>
                                        <div className="issue-values">
                                            <span className="current">Current: {issue.current_value}</span>
                                            <span className="expected">Expected: {issue.expected_value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-issues">
                                <FaCheckCircle className="success-icon" />
                                <p>Session security configured correctly</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Recommendations */}
                {total_issues > 0 && (
                    <div className="insight-card full-width recommendations">
                        <h3>
                            <FaExclamationTriangle className="card-icon warning" />
                            Security Recommendations
                        </h3>
                        <div className="recommendations-list">
                            <div className="recommendation-item">
                                <strong>Critical Issues:</strong> Address all critical severity issues immediately
                            </div>
                            <div className="recommendation-item">
                                <strong>PHP Configuration:</strong> Update php.ini settings for production environment
                            </div>
                            <div className="recommendation-item">
                                <strong>File Permissions:</strong> Restrict permissions on sensitive files (chmod 600 for credentials)
                            </div>
                            <div className="recommendation-item">
                                <strong>Session Security:</strong> Enable all session security flags (httponly, secure, strict mode)
                            </div>
                            <div className="recommendation-item">
                                <strong>Regular Audits:</strong> Review this dashboard weekly to monitor security posture
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VulnerabilitiesTab;
