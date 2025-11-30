import React, { useState, useEffect } from 'react';

function ChangeHistory({ api, onError }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'opened', 'closed'
  const [groupBy, setGroupBy] = useState('ip'); // 'ip', 'port', 'time'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set())

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

  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleAllGroups = (expand) => {
    if (expand) {
      const allKeys = Object.keys(groupedChanges);
      setExpandedGroups(new Set(allKeys));
    } else {
      setExpandedGroups(new Set());
    }
  };

  // Filter changes
  const filteredChanges = changes.filter(change => {
    // Filter by type
    if (filter !== 'all' && change.change_type !== filter) return false;

    // Filter by search query
    if (searchQuery && !change.ip_address.includes(searchQuery)) return false;

    return true;
  });

  // Group changes
  const groupedChanges = {};
  filteredChanges.forEach(change => {
    let groupKey;
    if (groupBy === 'ip') {
      groupKey = change.ip_address;
    } else if (groupBy === 'port') {
      groupKey = `Port ${change.port}`;
    } else {
      // Group by date
      const date = new Date(change.detected_at);
      groupKey = date.toLocaleDateString();
    }

    if (!groupedChanges[groupKey]) {
      groupedChanges[groupKey] = [];
    }
    groupedChanges[groupKey].push(change);
  });

  // Sort groups
  const sortedGroupKeys = Object.keys(groupedChanges).sort((a, b) => {
    if (groupBy === 'port') {
      const portA = parseInt(a.replace('Port ', ''));
      const portB = parseInt(b.replace('Port ', ''));
      return portA - portB;
    }
    return a.localeCompare(b);
  });

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading change history...</div>;
  }

  return (
    <div>
      {/* Filter and Group Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {/* Top Row: Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

        {/* Second Row: Group By and Search */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>Group by:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                background: 'white',
              }}
            >
              <option value="ip">IP Address</option>
              <option value="port">Port</option>
              <option value="time">Date</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Search IP address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => toggleAllGroups(true)}
              style={{
                padding: '6px 12px',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Expand All
            </button>
            <button
              onClick={() => toggleAllGroups(false)}
              style={{
                padding: '6px 12px',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Collapse All
            </button>
          </div>
        </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedGroupKeys.map(groupKey => {
            const groupChanges = groupedChanges[groupKey];
            const isExpanded = expandedGroups.has(groupKey);

            return (
              <div key={groupKey} style={{
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
              }}>
                {/* Group Header */}
                <div
                  onClick={() => toggleGroup(groupKey)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: isExpanded ? '#f9fafb' : 'white',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? '#f9fafb' : 'white'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '16px' }}>{isExpanded ? '▼' : '▶'}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', fontFamily: groupBy === 'ip' ? 'monospace' : 'inherit' }}>
                        {groupKey}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {groupChanges.length} change{groupChanges.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Summary badges */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {groupChanges.some(c => c.change_type === 'opened') && (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: '#fef3c7',
                        color: '#92400e'
                      }}>
                        {groupChanges.filter(c => c.change_type === 'opened').length} opened
                      </span>
                    )}
                    {groupChanges.some(c => c.change_type === 'closed') && (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: '#eff6ff',
                        color: '#1e40af'
                      }}>
                        {groupChanges.filter(c => c.change_type === 'closed').length} closed
                      </span>
                    )}
                  </div>
                </div>

                {/* Group Content */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Change</th>
                          {groupBy !== 'ip' && (
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>IP Address</th>
                          )}
                          {groupBy !== 'port' && (
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Port</th>
                          )}
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Status Change</th>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Target</th>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Detected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupChanges.map((change, index) => (
                          <tr
                            key={index}
                            style={{
                              borderBottom: index < groupChanges.length - 1 ? '1px solid #f3f4f6' : 'none',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <td style={{ padding: '10px 16px' }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                                ...getChangeStyle(change.change_type)
                              }}>
                                <span>{getChangeIcon(change.change_type)}</span>
                                <span style={{ textTransform: 'capitalize' }}>{change.change_type}</span>
                              </div>
                            </td>
                            {groupBy !== 'ip' && (
                              <td style={{ padding: '10px 16px', fontSize: '13px', fontFamily: 'monospace', fontWeight: '500' }}>
                                {change.ip_address}
                              </td>
                            )}
                            {groupBy !== 'port' && (
                              <td style={{ padding: '10px 16px', fontSize: '13px', fontFamily: 'monospace', fontWeight: '500' }}>
                                {change.port}
                              </td>
                            )}
                            <td style={{ padding: '10px 16px', fontSize: '12px' }}>
                              <span style={{ color: '#dc2626' }}>{change.previous_status}</span>
                              {' → '}
                              <span style={{ color: change.new_status === 'open' ? '#16a34a' : '#6b7280' }}>
                                {change.new_status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px', fontSize: '12px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {change.target_description || 'N/A'}
                            </td>
                            <td style={{ padding: '10px 16px', fontSize: '12px', color: '#6b7280' }}>
                              <div>{formatRelativeDate(change.detected_at)}</div>
                              <div style={{ fontSize: '10px', opacity: 0.7 }}>{formatDate(change.detected_at)}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filteredChanges.length > 0 && (
        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
          Showing {filteredChanges.length} changes in {sortedGroupKeys.length} group{sortedGroupKeys.length !== 1 ? 's' : ''} (last 200)
        </div>
      )}
    </div>
  );
}

export default ChangeHistory;
