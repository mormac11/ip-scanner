import React, { useState, useEffect } from 'react';

function ChangeHistory({ api, onError }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'opened', 'closed'

  useEffect(() => {
    loadChanges();
  }, []);

  const loadChanges = async () => {
    try {
      const data = await api.getChangeHistory();
      setChanges(data || []);
    } catch (err) {
      console.error('Failed to load change history:', err);
      onError('Failed to load change history: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const getChangeIcon = (changeType) => {
    switch (changeType) {
      case 'opened':
        return '🔓';
      case 'closed':
        return '🔒';
      default:
        return '🔄';
    }
  };

  const getChangeStyle = (changeType) => {
    switch (changeType) {
      case 'opened':
        return { background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' };
      case 'closed':
        return { background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e40af' };
      default:
        return { background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151' };
    }
  };

  const filteredChanges = changes.filter(change => {
    if (filter === 'all') return true;
    return change.change_type === filter;
  });

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading change history...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 16px',
              background: filter === 'all' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
              color: filter === 'all' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            All ({changes.length})
          </button>
          <button
            onClick={() => setFilter('opened')}
            style={{
              padding: '8px 16px',
              background: filter === 'opened' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
              color: filter === 'opened' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Opened ({changes.filter(c => c.change_type === 'opened').length})
          </button>
          <button
            onClick={() => setFilter('closed')}
            style={{
              padding: '8px 16px',
              background: filter === 'closed' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
              color: filter === 'closed' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Closed ({changes.filter(c => c.change_type === 'closed').length})
          </button>
        </div>

        <button
          onClick={loadChanges}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {filteredChanges.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#f9fafb',
          borderRadius: '8px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {changes.length === 0 ? 'No port changes detected yet' : `No ${filter} ports found`}
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', opacity: 0.7 }}>
            Port changes will appear here as the scanner detects them
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Change</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>IP Address</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Port</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Status Change</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Target</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Detected</th>
              </tr>
            </thead>
            <tbody>
              {filteredChanges.map((change, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      ...getChangeStyle(change.change_type)
                    }}>
                      <span>{getChangeIcon(change.change_type)}</span>
                      <span style={{ textTransform: 'capitalize' }}>{change.change_type}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'monospace', fontWeight: '500' }}>
                    {change.ip_address}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'monospace', fontWeight: '500' }}>
                    {change.port}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>
                    <span style={{ color: '#dc2626' }}>{change.previous_status}</span>
                    {' → '}
                    <span style={{ color: change.new_status === 'open' ? '#16a34a' : '#6b7280' }}>
                      {change.new_status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {change.target_description || 'N/A'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                    <div>{formatRelativeDate(change.detected_at)}</div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>{formatDate(change.detected_at)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredChanges.length > 0 && (
        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
          Showing {filteredChanges.length} of {changes.length} total changes (last 200)
        </div>
      )}
    </div>
  );
}

export default ChangeHistory;
