import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { ParkingSquare, Unlock, AlertCircle, CheckCircle } from 'lucide-react';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [releasingId, setReleasingId] = useState(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/parking/assignments');
      setAssignments(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load parking assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleRelease = async (assignmentId) => {
    setReleasingId(assignmentId);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/parking/release', { assignment_id: assignmentId });
      setSuccess(`Parking assignment #${assignmentId} released.`);
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to release assignment.');
    } finally {
      setReleasingId(null);
    }
  };

  if (loading) return <LoadingSpinner label="Loading Parking Assignments..." />;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Parking Assignment Log</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Historical and active valet parking allocations across all parking zones.
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

      {assignments.length === 0 ? (
        <EmptyState
          title="No Parking Assignments"
          description="No parking slots have been assigned yet."
          icon={ParkingSquare}
        />
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Assign ID</th>
                  <th>Slot ID</th>
                  <th>Vehicle ID</th>
                  <th>Assigned At</th>
                  <th>Released At</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600', color: '#94a3b8' }}>#{item.id}</td>
                    <td style={{ fontWeight: '700', color: '#38bdf8' }}>Slot #{item.slot_id}</td>
                    <td style={{ fontFamily: 'monospace', color: '#f8fafc' }}>Vehicle #{item.vehicle_id}</td>
                    <td>{new Date(item.assigned_at).toLocaleString()}</td>
                    <td>{item.released_at ? new Date(item.released_at).toLocaleString() : '—'}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      {item.status === 'ACTIVE' && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          disabled={releasingId === item.id}
                          onClick={() => handleRelease(item.id)}
                        >
                          <Unlock size={14} /> {releasingId === item.id ? 'Releasing...' : 'Release'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
