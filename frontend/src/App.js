import React, { useState, useEffect } from 'react';
import './App.css';
import { api, setTokenProvider } from './api';
import AddTarget from './components/AddTarget';
import TargetList from './components/TargetList';
import ScanResults from './components/ScanResults';
import AWSCredentialsForm from './components/AWSCredentialsForm';
import Support from './components/Support';
import { useAuth } from 'react-oidc-context';

function App() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState('targets');
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = () => {
    auth.signinRedirect().catch(e => {
      console.error('Login error:', e);
      setError('Failed to sign in. Please try again.');
    });
  };

  const handleLogout = () => {
    auth.signoutRedirect().catch(e => {
      console.error('Logout error:', e);
    });
  };

  useEffect(() => {
    // Set up the token provider for API calls
    setTokenProvider(async () => {
      if (auth.user && auth.user.access_token) {
        return auth.user.access_token;
      }
      return null;
    });
  }, [auth.user]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      loadTargets();
    }
  }, [auth.isAuthenticated]);

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

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const getPageTitle = () => {
    switch(activeTab) {
      case 'targets': return { title: 'Manage Targets', subtitle: 'Add and configure IP addresses and subnets to scan' };
      case 'results': return { title: 'Scan Results', subtitle: 'View port scan results and open ports' };
      case 'settings': return { title: 'Settings', subtitle: 'Configure AWS credentials and application settings' };
      case 'support': return { title: 'Support', subtitle: 'Documentation, guides, and troubleshooting help' };
      default: return { title: '', subtitle: '' };
    }
  };

  const pageInfo = getPageTitle();

  // Handle authentication loading and errors
  if (auth.isLoading) {
    return <div className="loading">Loading authentication...</div>;
  }

  if (auth.error) {
    return (
      <div className="App">
        <div className="login-container">
          <div className="login-card">
            <h2 style={{ color: '#dc2626' }}>Authentication Error</h2>
            <p>{auth.error.message}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="App">
        <div className="login-container">
          <div className="login-card">
            <div className="logo" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
              <div className="logo-icon">IP</div>
              <div className="logo-text">
                <h1>IP Scanner</h1>
                <p>Network Monitor</p>
              </div>
            </div>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Welcome</h2>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2rem' }}>
              Sign in with your Azure account to access the IP Scanner
            </p>
            <button className="btn btn-primary" onClick={handleLogin} style={{ width: '100%' }}>
              Sign in with Microsoft
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">IP</div>
            <div className="logo-text">
              <h1>IP Scanner</h1>
              <p>Network Monitor</p>
            </div>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${activeTab === 'targets' ? 'active' : ''}`}
            onClick={() => setActiveTab('targets')}
          >
            <span className="nav-item-icon">🎯</span>
            <span>Targets</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            <span className="nav-item-icon">📊</span>
            <span>Scan Results</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-item-icon">⚙️</span>
            <span>Settings</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            <span className="nav-item-icon">❓</span>
            <span>Support</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-info">
              <div className="user-avatar">{auth.user?.profile?.name?.charAt(0) || auth.user?.profile?.preferred_username?.charAt(0) || 'U'}</div>
              <div className="user-details">
                <div className="user-name">{auth.user?.profile?.name || auth.user?.profile?.preferred_username || 'User'}</div>
                <div className="user-email">{auth.user?.profile?.email || ''}</div>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout} title="Sign out">
              <span>⎋</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <h2>{pageInfo.title}</h2>
          <p>{pageInfo.subtitle}</p>
        </div>

        <div className="content-area">
          {error && <div className="alert error">⚠️ {error}</div>}
          {success && <div className="alert success">✓ {success}</div>}

          {activeTab === 'targets' && (
            <>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Add New Target</h3>
                  <p className="card-subtitle">Add individual IP addresses or CIDR subnets</p>
                </div>
                <AddTarget onTargetAdded={handleAddTarget} />
              </div>

              <div className="info-banner">
                <h3>☁️ AWS EC2 Auto-Sync</h3>
                <p>
                  EC2 instances are automatically synced every hour. IP addresses are added and removed based on your running instances.
                  <button onClick={() => setActiveTab('settings')}>Configure AWS credentials</button> to enable automatic synchronization.
                </p>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Configured Targets</h3>
                  <p className="card-subtitle">Manage your scan targets and their status</p>
                </div>
                <TargetList
                  targets={targets}
                  onDelete={handleDeleteTarget}
                  onToggle={handleToggleTarget}
                  loading={loading}
                />
              </div>
            </>
          )}

          {activeTab === 'results' && (
            <div className="card">
              <ScanResults api={api} />
            </div>
          )}

          {activeTab === 'settings' && (
            <>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">AWS Integration</h3>
                  <p className="card-subtitle">Configure AWS credentials for automatic EC2 instance synchronization</p>
                </div>
                <AWSCredentialsForm
                  api={api}
                  onSuccess={showSuccess}
                  onError={setError}
                />
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">About IP Scanner</h3>
                  <p className="card-subtitle">Application information</p>
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.8' }}>
                  <strong style={{ color: '#111827' }}>Version:</strong> 1.0.0<br />
                  <strong style={{ color: '#111827' }}>Description:</strong> Network monitoring and port scanning tool<br />
                  <strong style={{ color: '#111827' }}>Scan Interval:</strong> Every 15 minutes<br />
                  <strong style={{ color: '#111827' }}>AWS Sync:</strong> Every 1 hour
                </div>
              </div>
            </>
          )}

          {activeTab === 'support' && (
            <div className="card">
              <Support />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
