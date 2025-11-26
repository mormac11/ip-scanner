import React, { useState, useEffect } from 'react';
import './App.css';
import { api } from './api';
import AddTarget from './components/AddTarget';
import TargetList from './components/TargetList';
import ScanResults from './components/ScanResults';
import AWSCredentialsForm from './components/AWSCredentialsForm';
import Support from './components/Support';

function App() {
  const [activeTab, setActiveTab] = useState('targets');
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    try {
      const data = await api.getTargets();
      setTargets(data || []);
      setError('');
    } catch (err) {
      setError('Failed to load targets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTarget = async (target, description) => {
    try {
      await api.createTarget(target, description);
      showSuccess('Target added successfully!');
      await loadTargets();
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteTarget = async (id) => {
    if (!window.confirm('Are you sure you want to delete this target?')) {
      return;
    }

    try {
      await api.deleteTarget(id);
      showSuccess('Target deleted successfully!');
      await loadTargets();
    } catch (err) {
      setError('Failed to delete target');
    }
  };

  const handleToggleTarget = async (id) => {
    try {
      await api.toggleTarget(id);
      showSuccess('Target status updated!');
      await loadTargets();
    } catch (err) {
      setError('Failed to toggle target');
    }
  };

  const handleSyncAWS = async () => {
    if (!window.confirm('Sync all public IP addresses from AWS EC2 instances?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await api.syncAWS();
      showSuccess(`AWS sync complete! Added ${result.added} new targets, skipped ${result.skipped} existing.`);
      await loadTargets();
    } catch (err) {
      setError('Failed to sync AWS: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>IP Scanner</h1>
        <p>Network monitoring and port scanning tool</p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'targets' ? 'active' : ''}`}
          onClick={() => setActiveTab('targets')}
        >
          🎯 Manage Targets
        </button>
        <button
          className={`tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          📊 Scan Results
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
        <button
          className={`tab ${activeTab === 'support' ? 'active' : ''}`}
          onClick={() => setActiveTab('support')}
        >
          ❓ Support
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {activeTab === 'targets' && (
        <div className="section">
          <h2>Add New Target</h2>
          <AddTarget onTargetAdded={handleAddTarget} />

          <div style={{ margin: '20px 0', padding: '15px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #4a90e2' }}>
            <h3 style={{ marginTop: 0 }}>AWS EC2 Integration</h3>
            <p style={{ marginBottom: '10px', color: '#555', fontSize: '14px' }}>
              Automatically import all public IP addresses from your AWS EC2 instances.
            </p>
            <p style={{ marginBottom: '10px', color: '#666', fontSize: '13px' }}>
              Configure AWS credentials in <button
                onClick={() => setActiveTab('settings')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4a90e2',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  font: 'inherit'
                }}
              >Settings</button> before syncing.
            </p>
            <button
              onClick={handleSyncAWS}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#ff9900',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {loading ? '⏳ Syncing...' : '☁️ Sync from AWS EC2'}
            </button>
          </div>

          <h2>Configured Targets</h2>
          <TargetList
            targets={targets}
            onDelete={handleDeleteTarget}
            onToggle={handleToggleTarget}
            loading={loading}
          />
        </div>
      )}

      {activeTab === 'results' && (
        <div className="section">
          <h2>Scan Results</h2>
          <ScanResults api={api} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="section">
          <h2>Settings</h2>

          <div style={{ marginBottom: '30px' }}>
            <h3>AWS Integration</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
              Configure your AWS credentials to automatically sync EC2 instance public IP addresses as scan targets.
            </p>
            <AWSCredentialsForm
              api={api}
              onSuccess={showSuccess}
              onError={setError}
            />
          </div>

          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e0e0e0' }}>
            <h3>About IP Scanner</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Version 1.0.0<br />
              Network monitoring and port scanning tool<br />
              Scans common ports every 15 minutes
            </p>
          </div>
        </div>
      )}

      {activeTab === 'support' && (
        <div className="section">
          <Support />
        </div>
      )}
    </div>
  );
}

export default App;
