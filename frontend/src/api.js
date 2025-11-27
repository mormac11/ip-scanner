const API_URL = process.env.REACT_APP_API_URL || '/api/v1';

let getAccessToken = null;

export const setTokenProvider = (provider) => {
  getAccessToken = provider;
};

const getAuthHeaders = async () => {
  const headers = { 'Content-Type': 'application/json' };
  if (getAccessToken) {
    try {
      const token = await getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get access token:', error);
    }
  }
  return headers;
};

export const api = {
  // Target management
  async getTargets() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/targets`, { headers });
    if (!response.ok) throw new Error('Failed to fetch targets');
    return response.json();
  },

  async createTarget(target, description) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/targets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ target, description }),
    });
    if (!response.ok) throw new Error('Failed to create target');
    return response.json();
  },

  async deleteTarget(id) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/targets/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete target');
  },

  async toggleTarget(id) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/targets/${id}/toggle`, {
      method: 'PUT',
      headers,
    });
    if (!response.ok) throw new Error('Failed to toggle target');
    return response.json();
  },

  // Scan results
  async getLatestResults() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/results/latest`, { headers });
    if (!response.ok) throw new Error('Failed to fetch results');
    return response.json();
  },

  async getOpenPorts() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/results/open`, { headers });
    if (!response.ok) throw new Error('Failed to fetch open ports');
    return response.json();
  },

  async getResultsByIP(ip) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/results/ip?ip=${encodeURIComponent(ip)}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch results for IP');
    return response.json();
  },

  async getScanSessions() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/results/sessions`, { headers });
    if (!response.ok) throw new Error('Failed to fetch scan sessions');
    return response.json();
  },

  async getChangeHistory() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/results/changes`, { headers });
    if (!response.ok) throw new Error('Failed to fetch change history');
    return response.json();
  },

  // AWS integration
  async getAWSCredentials() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/aws/credentials`, { headers });
    if (!response.ok) throw new Error('Failed to fetch AWS credentials');
    return response.json();
  },

  async saveAWSCredentials(accountName, accessKeyId, secretAccessKey, region) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/aws/credentials`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        account_name: accountName,
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey,
        region: region,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to save AWS credentials');
    }
    return response.json();
  },

  async updateAWSCredentials(id, accountName, accessKeyId, secretAccessKey, region) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/aws/credentials/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        account_name: accountName,
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey,
        region: region,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to update AWS credentials');
    }
    return response.json();
  },

  async deleteAWSCredentials(id) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/aws/credentials/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete AWS credentials');
  },

  async syncAWS() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/aws/sync`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to sync AWS EC2 instances');
    return response.json();
  },

  // Notifications
  async getNotifications(unreadOnly = false) {
    const headers = await getAuthHeaders();
    const url = unreadOnly ? `${API_URL}/notifications?unread_only=true` : `${API_URL}/notifications`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  async getUnreadCount() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/unread/count`, { headers });
    if (!response.ok) throw new Error('Failed to fetch unread count');
    return response.json();
  },

  async markNotificationAsRead(id) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers,
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
  },

  async markAllNotificationsAsRead() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers,
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
  },

  async deleteNotification(id) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete notification');
  },

  async deleteAllReadNotifications() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/read`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete read notifications');
  },

  // Scan operations
  async getScanStatus() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/scan/status`, { headers });
    if (!response.ok) throw new Error('Failed to fetch scan status');
    return response.json();
  },

  async triggerScan() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/scan/trigger`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to trigger scan');
    return response.json();
  },
};
