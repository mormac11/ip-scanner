import React from 'react';
import './TargetList.css';

function TargetList({ targets, onDelete, onToggle, loading }) {
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading targets...</div>;
  }

  if (!targets || targets.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎯</div>
        <p>No targets configured yet</p>
        <small>Add an IP address or subnet above to start scanning</small>
      </div>
    );
  }

  return (
    <div className="target-list">
      <table>
        <thead>
          <tr>
            <th>Target</th>
            <th>Description</th>
            <th>Status</th>
            <th>First Discovered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => (
            <tr key={target.id} className={!target.enabled ? 'disabled' : ''}>
              <td className="target-address">{target.target}</td>
              <td>{target.description || '-'}</td>
              <td>
                <span className={`status-badge ${target.enabled ? 'enabled' : 'disabled'}`}>
                  {target.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </td>
              <td>
                <div className="timestamp-cell">
                  <span className="time-ago">{formatTimeAgo(target.created_at)}</span>
                  <span className="full-date">{formatDateTime(target.created_at)}</span>
                </div>
              </td>
              <td>
                <div className="actions">
                  <button
                    className="btn-small btn-toggle"
                    onClick={() => onToggle(target.id)}
                    title={target.enabled ? 'Disable' : 'Enable'}
                  >
                    {target.enabled ? '⏸' : '▶'}
                  </button>
                  <button
                    className="btn-small btn-delete"
                    onClick={() => onDelete(target.id)}
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TargetList;
