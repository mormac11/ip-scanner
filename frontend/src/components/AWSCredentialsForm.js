import React, { useState, useEffect } from 'react';

function AWSCredentialsForm({ api, onSuccess, onError }) {
  const [accountName, setAccountName] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const accountsList = await api.getAWSCredentials();
      setAccounts(accountsList || []);
      if (accountsList.length === 0) {
        setShowForm(true);
      }
    } catch (err) {
      console.error('Failed to load AWS accounts:', err);
      onError('Failed to load AWS accounts: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!accountName || !accessKeyId || !secretAccessKey) {
      onError('Please enter account name, access key ID, and secret access key');
      return;
    }

    try {
      setLoading(true);
      if (editingAccount) {
        await api.updateAWSCredentials(editingAccount.id, accountName, accessKeyId, secretAccessKey, region);
        onSuccess('AWS account updated successfully!');
      } else {
        await api.saveAWSCredentials(accountName, accessKeyId, secretAccessKey, region);
        onSuccess('AWS account added successfully!');
      }
      resetForm();
      await loadAccounts();
    } catch (err) {
      onError(editingAccount ? 'Failed to update credentials: ' + err.message : 'Failed to save credentials: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setAccountName(account.account_name);
    setAccessKeyId(account.access_key_id);
    setSecretAccessKey(''); // Don't populate secret for security
    setRegion(account.region);
    setShowForm(true);
  };

  const handleDelete = async (id, accountName) => {
    if (!window.confirm(`Are you sure you want to delete AWS account "${accountName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteAWSCredentials(id);
      onSuccess('AWS account deleted successfully!');
      await loadAccounts();
    } catch (err) {
      onError('Failed to delete account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingAccount(null);
    setAccountName('');
    setAccessKeyId('');
    setSecretAccessKey('');
    setRegion('us-east-1');
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* List of configured accounts */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Configured AWS Accounts</h3>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {accounts.map((account) => (
              <div
                key={account.id}
                style={{
                  padding: '12px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                    {account.account_name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Access Key: {account.access_key_id} • Region: {account.region}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(account)}
                    disabled={loading}
                    style={{
                      padding: '6px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.background = '#2563eb')}
                    onMouseOut={(e) => !loading && (e.target.style.background = '#3b82f6')}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account.id, account.account_name)}
                    disabled={loading}
                    style={{
                      padding: '6px 12px',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.background = '#b91c1c')}
                    onMouseOut={(e) => !loading && (e.target.style.background = '#dc2626')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit account button or form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          + Add AWS Account
        </button>
      ) : (
        <>
          <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#92400e' }}>
              Required IAM Policy:
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#92400e' }}>
              Create an IAM user with the following read-only policy to fetch EC2 public IPs:
            </p>
            <pre style={{
              background: '#f8f9fa',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto',
              margin: 0,
              color: '#374151'
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
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                Account Name *
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Production, Development, etc."
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
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
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                AWS Secret Access Key *
              </label>
              <input
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder={editingAccount ? "Enter new secret key to update" : "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              {editingAccount && (
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
                  Leave blank to keep existing secret key
                </p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                AWS Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer'
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
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {loading ? (editingAccount ? 'Updating...' : 'Saving...') : (editingAccount ? 'Update Account' : 'Add Account')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '10px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default AWSCredentialsForm;
