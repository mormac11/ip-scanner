import React, { useState, useEffect } from 'react';

function Notifications({ api, onError }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications(filter === 'unread');
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      onError('Failed to load notifications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.markNotificationAsRead(id);
      await loadNotifications();
    } catch (err) {
      onError('Failed to mark notification as read: ' + err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      await loadNotifications();
    } catch (err) {
      onError('Failed to mark all as read: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      await loadNotifications();
    } catch (err) {
      onError('Failed to delete notification: ' + err.message);
    }
  };

  const handleDeleteAllRead = async () => {
    if (!window.confirm('Are you sure you want to delete all read notifications?')) {
      return;
    }
    try {
      await api.deleteAllReadNotifications();
      await loadNotifications();
    } catch (err) {
      onError('Failed to delete read notifications: ' + err.message);
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'critical':
        return { background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b' };
      case 'warning':
        return { background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' };
      case 'info':
      default:
        return { background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e40af' };
    }
  };

  const formatDate = (dateString) => {
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

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading notifications...</div>;
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
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            style={{
              padding: '8px 16px',
              background: filter === 'unread' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
              color: filter === 'unread' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Unread
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllAsRead}
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
              Mark All Read
            </button>
          )}
          {notifications.some(n => n.is_read) && (
            <button
              onClick={handleDeleteAllRead}
              style={{
                padding: '8px 16px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Delete Read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#f9fafb',
          borderRadius: '8px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                padding: '16px',
                borderRadius: '8px',
                ...getSeverityStyle(notification.severity),
                opacity: notification.is_read ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>
                      {notification.title}
                    </h4>
                    {!notification.is_read && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#3b82f6'
                      }} />
                    )}
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    {notification.message}
                  </p>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>
                    {formatDate(notification.created_at)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.5)',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.5)',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
