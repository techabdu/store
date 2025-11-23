import React from 'react';
import './ActivityTable.css';

const ActivityTable = ({ title, subtitle, data, footer }) => {
  return (
    <div className="dashboard-card activity-table-card">
      <div className="table-header">
        <h3 className="table-title">{title}</h3>
        {subtitle && <p className="table-subtitle">{subtitle}</p>}
      </div>

      <div className="table-container">
        <table className="activity-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td className="user-cell">
                  <div className="user-avatar-small">{row.username.charAt(0).toUpperCase()}</div>
                  <span>{row.username}</span>
                </td>
                <td>{row.action}</td>
                <td className="time-cell">{row.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="table-footer">
          <a href={footer.link} className="footer-link">{footer.text}</a>
        </div>
      )}
    </div>
  );
};

export default ActivityTable;
