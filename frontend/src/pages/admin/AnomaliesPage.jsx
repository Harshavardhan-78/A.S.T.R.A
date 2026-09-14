import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { AlertTriangle, Edit2, AlertCircle, CheckCircle } from 'lucide-react';

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [newStatus, setNewStatus] = useState('INVESTIGATING');
  const [submitting, setSubmitting] = useState(false);

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/anomalies');
      setAnomalies(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch security anomalies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedAnomaly) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put(`/anomalies/${selectedAnomaly.id}/status`, { status: newStatus });
      setSuccess(`Anomaly #${selectedAnomaly.id} status updated to ${newStatus}.`);
      setSelectedAnomaly(null);
      fetchAnomalies();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update anomaly status.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading Security Anomalies..." />;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Automated Anomaly Audit & Threat Log</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          AI-detected security flags, tailgating incidents, unauthorized plate matches, and overstay alerts.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {anomalies.length === 0 ? (
        <EmptyState
          title="Zero Security Anomalies"
          description="No automated anomaly records detected."
          icon={AlertTriangle}
        />
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Anomaly Type</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600', color: '#94a3b8' }}>#{item.id}</td>
                    <td style={{ fontWeight: '600', color: '#f8fafc' }}>{item.anomaly_type}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: item.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: item.severity === 'CRITICAL' ? '#f87171' : '#fbbf24'
                      }}>
                        {item.severity}
                      </span>
                    </td>
                    <td>{item.description || '—'}</td>
                    <td>{new Date(item.detected_at).toLocaleString()}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => {
                          setSelectedAnomaly(item);
                          setNewStatus(item.status);
                        }}
                      >
                        <Edit2 size={14} /> Update Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Modal */}
      <Modal
        isOpen={Boolean(selectedAnomaly)}
        title={`Update Status for Anomaly #${selectedAnomaly?.id}`}
        onClose={() => setSelectedAnomaly(null)}
      >
        <form onSubmit={handleStatusUpdate}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>
              Investigation Lifecycle State *
            </label>
            <select
              className="input-field"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              required
            >
              <option value="OPEN">OPEN (New unverified flag)</option>
              <option value="INVESTIGATING">INVESTIGATING (Under security review)</option>
              <option value="RESOLVED">RESOLVED (Action taken and verified)</option>
              <option value="DISMISSED">DISMISSED (False positive)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setSelectedAnomaly(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Save Anomaly Status'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
