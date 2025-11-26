const API_URL = process.env.REACT_APP_API_URL || '/api/v1';

export const api = {
  // Target management
  async getTargets() {
    const response = await fetch(`${API_URL}/targets`);
    if (!response.ok) throw new Error('Failed to fetch targets');
    return response.json();
  },

  async createTarget(target, description) {
    const response = await fetch(`${API_URL}/targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, description }),
    });
    if (!response.ok) throw new Error('Failed to create target');
    return response.json();
  },

  async deleteTarget(id) {
    const response = await fetch(`${API_URL}/targets/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete target');
  },

  async toggleTarget(id) {
    const response = await fetch(`${API_URL}/targets/${id}/toggle`, {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to toggle target');
    return response.json();
  },

  // Scan results
  async getLatestResults() {
    const response = await fetch(`${API_URL}/results/latest`);
    if (!response.ok) throw new Error('Failed to fetch results');
    return response.json();
  },

  async getOpenPorts() {
    const response = await fetch(`${API_URL}/results/open`);
    if (!response.ok) throw new Error('Failed to fetch open ports');
    return response.json();
  },

  async getResultsByIP(ip) {
    const response = await fetch(`${API_URL}/results/ip?ip=${encodeURIComponent(ip)}`);
    if (!response.ok) throw new Error('Failed to fetch results for IP');
    return response.json();
  },

  async getScanSessions() {
    const response = await fetch(`${API_URL}/results/sessions`);
    if (!response.ok) throw new Error('Failed to fetch scan sessions');
    return response.json();
  },

  // AWS integration
  async getAWSCredentials() {
    const response = await fetch(`${API_URL}/aws/credentials`);
    if (!response.ok) throw new Error('Failed to fetch AWS credentials');
    return response.json();
  },

  async saveAWSCredentials(accessKeyId, secretAccessKey, region) {
    const response = await fetch(`${API_URL}/aws/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey,
        region: region,
      }),
    });
    if (!response.ok) throw new Error('Failed to save AWS credentials');
    return response.json();
  },

  async deleteAWSCredentials() {
    const response = await fetch(`${API_URL}/aws/credentials`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete AWS credentials');
  },

  async syncAWS() {
    const response = await fetch(`${API_URL}/aws/sync`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to sync AWS EC2 instances');
    return response.json();
  },
};
