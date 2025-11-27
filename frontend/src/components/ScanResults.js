import React, { useState, useEffect } from 'react';
import './ScanResults.css';

function ScanResults({ api }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('open'); // 'open' or 'all'

  useEffect(() => {
    loadResults();
    const interval = setInterval(loadResults, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [viewMode]);

  const loadResults = async () => {
    try {
      const data = viewMode === 'open'
        ? await api.getOpenPorts()
        : await api.getLatestResults();
      setResults(data || []);
      setError('');
    } catch (err) {
      setError('Failed to load results');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const groupByIP = (results) => {
    const grouped = {};
    results.forEach(result => {
      if (!grouped[result.ip_address]) {
        grouped[result.ip_address] = [];
      }
      grouped[result.ip_address].push(result);
    });
    return grouped;
  };

  if (loading) {
    return <div className="loading">Loading scan results...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const groupedResults = groupByIP(results);
  const ipAddresses = Object.keys(groupedResults).sort();

  if (ipAddresses.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <p>No scan results available yet</p>
        <small>Results will appear here after the first scan completes (runs every 15 minutes)</small>
      </div>
    );
  }

  return (
    <div className="scan-results">
      <div className="results-header">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'open' ? 'active' : ''}`}
            onClick={() => setViewMode('open')}
          >
            Open Ports Only
          </button>
          <button
            className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            All Results
          </button>
        </div>
        <button className="refresh-btn" onClick={loadResults}>
          🔄 Refresh
        </button>
      </div>

      <div className="results-grid">
        {ipAddresses.map(ip => (
          <div key={ip} className="ip-card">
            <div className="ip-header">
              <h3>{ip}</h3>
              <span className="port-count">
                {groupedResults[ip].length} port{groupedResults[ip].length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="ports-list">
              {groupedResults[ip].map((result, idx) => (
                <div key={idx} className={`port-item ${result.status}`}>
                  <div className="port-info">
                    <span className="port-number">Port {result.port}</span>
                    <span className={`port-status ${result.status}`}>
                      {result.status === 'open' ? '✓ Open' : '✗ Closed'}
                    </span>
                  </div>
                  <div className="port-meta">
                    {result.response_time_ms > 0 && (
                      <span className="response-time">{result.response_time_ms}ms</span>
                    )}
                    <span className="port-scan-time">{formatTimeAgo(result.scanned_at)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="scan-metadata">
              {groupedResults[ip][0].first_discovered_at && (
                <div className="metadata-item">
                  <div className="metadata-label">First discovered:</div>
                  <div className="metadata-value">
                    <span className="time-ago">{formatTimeAgo(groupedResults[ip][0].first_discovered_at)}</span>
                    <span className="full-date">{formatDateTime(groupedResults[ip][0].first_discovered_at)}</span>
                  </div>
                </div>
              )}
              <div className="metadata-item">
                <div className="metadata-label">Last scanned:</div>
                <div className="metadata-value">
                  <span className="time-ago">{formatTimeAgo(groupedResults[ip][0].scanned_at)}</span>
                  <span className="full-date">{formatDateTime(groupedResults[ip][0].scanned_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScanResults;
