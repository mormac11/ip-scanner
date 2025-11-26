import React, { useState, useEffect } from 'react';

function AWSCredentialsForm({ api, onSuccess, onError }) {
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const creds = await api.getAWSCredentials();
      if (creds.is_configured) {
        setIsConfigured(true);
        setRegion(creds.region || 'us-east-1');
        setAccessKeyId(creds.access_key_id);
      } else {
        setIsConfigured(false);
        setShowForm(true);
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!accessKeyId || !secretAccessKey) {
      onError('Please enter both Access Key ID and Secret Access Key');
      return;
    }

    try {
      setLoading(true);
      await api.saveAWSCredentials(accessKeyId, secretAccessKey, region);
      onSuccess('AWS credentials saved successfully!');
      setIsConfigured(true);
      setShowForm(false);
      setSecretAccessKey(''); // Clear secret for security
    } catch (err) {
      onError('Failed to save credentials: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete AWS credentials?')) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteAWSCredentials();
      onSuccess('AWS credentials deleted successfully!');
      setIsConfigured(false);
      setShowForm(true);
      setAccessKeyId('');
      setSecretAccessKey('');
      setRegion('us-east-1');
    } catch (err) {
      onError('Failed to delete credentials: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>AWS Credentials</h3>
        {isConfigured && !showForm && (
          <div>
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: '6px 12px',
                background: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '8px',
                fontSize: '12px'
              }}
            >
              Update
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isConfigured && !showForm ? (
        <div style={{ padding: '12px', background: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
          <p style={{ margin: '0 0 8px 0', color: '#155724', fontWeight: 'bold' }}>
            ✓ AWS credentials configured
          </p>
          <p style={{ margin: 0, fontSize: '14px', color: '#155724' }}>
            Access Key: {accessKeyId}<br />
            Region: {region}
          </p>
        </div>
      ) : (
        <>
          <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107', marginBottom: '12px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Required IAM Policy:
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
              Create an IAM user with the following read-only policy to fetch EC2 public IPs:
            </p>
            <pre style={{
              background: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              margin: 0
            }}>
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances"
      ],
      "Resource": "*"
    }
  ]
}`}
            </pre>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                AWS Access Key ID *
              </label>
              <input
                type="text"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                AWS Secret Access Key *
              </label>
              <input
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                AWS Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-east-2">US East (Ohio)</option>
                <option value="us-west-1">US West (N. California)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">EU (Ireland)</option>
                <option value="eu-central-1">EU (Frankfurt)</option>
                <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Saving...' : 'Save Credentials'}
              </button>
              {isConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSecretAccessKey('');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default AWSCredentialsForm;
