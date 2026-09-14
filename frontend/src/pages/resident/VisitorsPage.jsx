import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { UserCheck, Plus, AlertCircle, CheckCircle, Clock, Calendar, QrCode, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Active Tab: 'requests' | 'visitors'
  const [activeTab, setActiveTab] = useState('requests');

  // Modals
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Visitor Form
  const [visitorForm, setVisitorForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_document_type: 'Aadhaar / National ID',
    id_document_number: ''
  });

  // Request Form
  const [requestForm, setRequestForm] = useState({
    visitor_id: '',
    vehicle_number: '',
    vehicle_id: '',
    purpose: 'Guest Visit',
    visit_date: new Date().toISOString().split('T')[0],
    expected_entry: '',
    expected_exit: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [visRes, reqRes, vehRes] = await Promise.all([
        api.get('/visitors'),
        api.get('/visitor-requests'),
        api.get('/vehicles')
      ]);
      setVisitors(visRes.data || []);
      setRequests(reqRes.data || []);
      setVehicles(vehRes.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch visitor records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/visitors', visitorForm);
      setSuccess('Visitor registered successfully!');
      setIsVisitorModalOpen(false);
      setVisitorForm({ full_name: '', phone: '', email: '', id_document_type: 'Aadhaar / National ID', id_document_number: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register visitor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestForm.visitor_id) {
      setError('Please select a registered visitor.');
      return;
    }
    if (!requestForm.vehicle_number || !requestForm.vehicle_number.trim()) {
      setError('Vehicle Number is mandatory for generating a visitor access pass.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        visitor_id: parseInt(requestForm.visitor_id),
        vehicle_number: requestForm.vehicle_number.trim().toUpperCase(),
        vehicle_id: requestForm.vehicle_id ? parseInt(requestForm.vehicle_id) : null,
        purpose: requestForm.purpose,
        visit_date: new Date(requestForm.visit_date).toISOString(),
        expected_entry: requestForm.expected_entry ? new Date(requestForm.expected_entry).toISOString() : null,
        expected_exit: requestForm.expected_exit ? new Date(requestForm.expected_exit).toISOString() : null
      };

      await api.post('/visitor-requests', payload);
      setSuccess('Visitor pass request submitted successfully!');
      setIsRequestModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit visitor request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/visitor-requests/${id}/approve`);
      setSuccess(`Request #${id} approved! QR pass generated.`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve request.');
    }
  };

  const handleReject = async (id) => {
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/visitor-requests/${id}/reject`);
      setSuccess(`Request #${id} rejected.`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reject request.');
    }
  };

  if (loading) return <LoadingSpinner label="Loading Visitor Records..." />;

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Visitor Management</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Register guests, create entry requests, and issue instant QR access passes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsVisitorModalOpen(true)}
          >
            <Plus size={16} /> Register Visitor Profile
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsRequestModalOpen(true)}
          >
            <Plus size={16} /> New Pass Request
          </button>
        </div>
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

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
        <button
          className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('requests')}
        >
          Visitor Pass Requests ({requests.length})
        </button>
        <button
          className={`btn ${activeTab === 'visitors' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('visitors')}
        >
          Registered Visitor Profiles ({visitors.length})
        </button>
      </div>

      {/* Tab 1: Visitor Requests */}
      {activeTab === 'requests' && (
        requests.length === 0 ? (
          <EmptyState
            title="No Visitor Requests"
            description="Create a request to invite visitors and generate security QR passes."
            icon={UserCheck}
            actionLabel="New Pass Request"
            onAction={() => setIsRequestModalOpen(true)}
          />
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Req ID</th>
                    <th>Visitor</th>
                    <th>Purpose</th>
                    <th>Visit Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const vis = visitors.find(v => v.id === r.visitor_id);
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: '600', color: '#94a3b8' }}>#{r.id}</td>
                        <td style={{ fontWeight: '600', color: '#f8fafc' }}>
                          {vis ? vis.full_name : `Visitor #${r.visitor_id}`}
                        </td>
                        <td>{r.purpose || '—'}</td>
                        <td>{new Date(r.visit_date).toLocaleDateString()}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {r.status === 'PENDING' && (
                              <>
                                <button
                                  className="btn btn-success"
                                  style={{ padding: '4px 10px', fontSize: '12px' }}
                                  onClick={() => handleApprove(r.id)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: '4px 10px', fontSize: '12px' }}
                                  onClick={() => handleReject(r.id)}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {r.status === 'APPROVED' && (
                              <Link
                                to="/resident/passes"
                                className="btn btn-primary"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                              >
                                <QrCode size={14} /> View Pass
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Tab 2: Registered Visitor Profiles */}
      {activeTab === 'visitors' && (
        visitors.length === 0 ? (
          <EmptyState
            title="No Visitors Registered"
            description="Add visitor contact details to easily create entry requests."
            icon={UserCheck}
            actionLabel="Register Visitor"
            onAction={() => setIsVisitorModalOpen(true)}
          />
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>ID Document</th>
                    <th>ID Number</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v) => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: '600', color: '#f8fafc' }}>{v.full_name}</td>
                      <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{v.phone}</td>
                      <td>{v.email || '—'}</td>
                      <td>{v.id_document_type || '—'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{v.id_document_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Register Visitor Modal */}
      <Modal
        isOpen={isVisitorModalOpen}
        title="Register Visitor Profile"
        onClose={() => setIsVisitorModalOpen(false)}
      >
        <form onSubmit={handleVisitorSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
              Full Name *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Jane Smith"
              value={visitorForm.full_name}
              onChange={(e) => setVisitorForm({ ...visitorForm, full_name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Phone Number *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="+91 9876543210"
                value={visitorForm.phone}
                onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="visitor@example.com"
                value={visitorForm.email}
                onChange={(e) => setVisitorForm({ ...visitorForm, email: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                ID Document Type
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Aadhaar / Driving License / Passport"
                value={visitorForm.id_document_type}
                onChange={(e) => setVisitorForm({ ...visitorForm, id_document_type: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                ID Document Number
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Doc ID number"
                value={visitorForm.id_document_number}
                onChange={(e) => setVisitorForm({ ...visitorForm, id_document_number: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsVisitorModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Register Visitor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* New Pass Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        title="Create Visitor Access Pass Request"
        onClose={() => setIsRequestModalOpen(false)}
      >
        <form onSubmit={handleRequestSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
              Vehicle Number * (Mandatory for Access Pass)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. TS09AB1234, KA01AB9999"
              value={requestForm.vehicle_number}
              onChange={(e) => setRequestForm({ ...requestForm, vehicle_number: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
              Select Visitor *
            </label>
            <select
              className="input-field"
              value={requestForm.visitor_id}
              onChange={(e) => setRequestForm({ ...requestForm, visitor_id: e.target.value })}
              required
            >
              <option value="">-- Choose Registered Visitor --</option>
              {visitors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.full_name} ({v.phone})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Associated Vehicle (Optional)
              </label>
              <select
                className="input-field"
                value={requestForm.vehicle_id}
                onChange={(e) => setRequestForm({ ...requestForm, vehicle_id: e.target.value })}
              >
                <option value="">-- None / Pedestrian --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate} ({v.make} {v.model})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Visit Date *
              </label>
              <input
                type="date"
                className="input-field"
                value={requestForm.visit_date}
                onChange={(e) => setRequestForm({ ...requestForm, visit_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
              Purpose of Visit
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Delivery, Guest, Contractor"
              value={requestForm.purpose}
              onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Expected Entry Time
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={requestForm.expected_entry}
                onChange={(e) => setRequestForm({ ...requestForm, expected_entry: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Expected Exit Time
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={requestForm.expected_exit}
                onChange={(e) => setRequestForm({ ...requestForm, expected_exit: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Create Pass Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
