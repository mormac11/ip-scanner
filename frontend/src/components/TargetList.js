import React from 'react';
import './TargetList.css';

function TargetList({ targets, onDelete, onToggle, loading }) {
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
            <th>Added</th>
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
              <td>{new Date(target.created_at).toLocaleDateString()}</td>
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
