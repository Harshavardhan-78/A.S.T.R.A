import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { AlertTriangle, Plus, AlertCircle, CheckCircle, FileText } from 'lucide-react';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    vehicle_id: '',
    anomaly_id: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dRes, vRes] = await Promise.all([
        api.get('/disputes'),
        api.get('/vehicles')
      ]);
      setDisputes(dRes.data || []);
      setVehicles(vRes.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch disputes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        vehicle_id: formData.vehicle_id ? parseInt(formData.vehicle_id) : null,
        anomaly_id: formData.anomaly_id ? parseInt(formData.anomaly_id) : null
      };

      await api.post('/disputes', payload);
      setSuccess('Security dispute submitted to management.');
      setIsCreateModalOpen(false);
      setFormData({ title: '', description: '', vehicle_id: '', anomaly_id: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading Security Disputes..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Security & Gate Disputes</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Raise inquiries or contest unauthorized gate flaggings, parking fines, or entry rejections.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={16} /> Raise New Dispute
        </button>
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

      {disputes.length === 0 ? (
        <EmptyState
          title="No Active Disputes"
          description="You have not submitted any security or parking disputes."
          icon={AlertTriangle}
          actionLabel="Raise Dispute"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Submitted On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: '600', color: '#94a3b8' }}>#{d.id}</td>
                    <td style={{ fontWeight: '600', color: '#f8fafc' }}>{d.title}</td>
                    <td>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => setSelectedDispute(d)}
                      >
                        <FileText size={14} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Dispute Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        title="Raise Security Dispute"
        onClose={() => setIsCreateModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
              Dispute Title *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Contesting Parking Overstay Penalty"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
              Associated Vehicle (Optional)
            </label>
            <select
              className="input-field"
              value={formData.vehicle_id}
              onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
            >
              <option value="">-- None --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.license_plate} ({v.make} {v.model})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
              Description & Evidence Details *
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Provide context on what occurred..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dispute Details Modal */}
      <Modal
        isOpen={Boolean(selectedDispute)}
        title={`Dispute #${selectedDispute?.id}: ${selectedDispute?.title}`}
        onClose={() => setSelectedDispute(null)}
      >
        <div style={{ fontSize: '14px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Status</span>
            <StatusBadge status={selectedDispute?.status || 'OPEN'} />
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Description</span>
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {selectedDispute?.description}
            </div>
          </div>

          {selectedDispute?.resolution && (
            <div>
              <span style={{ color: '#34d399', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Resolution Notes</span>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
                {selectedDispute.resolution}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setSelectedDispute(null)}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
