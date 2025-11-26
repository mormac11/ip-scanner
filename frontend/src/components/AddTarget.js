import React, { useState } from 'react';
import './AddTarget.css';

function AddTarget({ onTargetAdded }) {
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!target.trim()) {
      setError('Please enter an IP address or subnet');
      return;
    }

    setLoading(true);
    try {
      await onTargetAdded(target.trim(), description.trim());
      setTarget('');
      setDescription('');
    } catch (err) {
      setError(err.message || 'Failed to add target');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-target">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="target">IP Address or Subnet (CIDR)</label>
          <input
            id="target"
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g., 192.168.1.1 or 192.168.1.0/24"
            disabled={loading}
          />
          <small>Enter a single IP address or a subnet in CIDR notation</small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (optional)</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Office Router"
            disabled={loading}
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Adding...' : 'Add Target'}
        </button>
      </form>
    </div>
  );
}

export default AddTarget;
