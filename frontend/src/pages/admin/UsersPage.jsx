import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { Users, Shield, Edit2, AlertCircle, CheckCircle, Check, X, Filter } from 'lucide-react';

export default function UsersPage() {
  const [searchParams] = useSearchParams();
  const initialStatusFilter = searchParams.get('status') || 'ALL';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter.toUpperCase());

  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('RESIDENT');
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put(`/admin/users/${selectedUser.id}/role`, { role: newRole });
      setSuccess(`Role for user ${selectedUser.email} updated to ${newRole}.`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user role.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (userId, targetStatus) => {
    setStatusUpdatingId(userId);
    setError(null);
    setSuccess(null);
    try {
      await api.put(`/admin/users/${userId}/status`, { status: targetStatus });
      const actionText = targetStatus === 'ACTIVE' ? 'APPROVED' : 'REJECTED';
      setSuccess(`User ID #${userId} registration has been ${actionText}. Notification dispatched to user.`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to update status for User #${userId}.`);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  if (loading) return <LoadingSpinner label="Loading User Directory..." />;

  const filteredUsers = users.filter((u) => {
    if (statusFilter === 'ALL') return true;
    return (u.status || 'ACTIVE').toUpperCase() === statusFilter;
  });

  const pendingCount = users.filter(u => u.status === 'PENDING').length;

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>System User Directory & Registration Approvals</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Review pending Security & Valet account registrations, approve/reject access, and delegate system roles.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={() => setStatusFilter('ALL')}
          >
            All Users ({users.length})
          </button>
          <button
            className={`btn ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '13px', position: 'relative' }}
            onClick={() => setStatusFilter('PENDING')}
          >
            Pending Approvals ({pendingCount})
          </button>
          <button
            className={`btn ${statusFilter === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            Active Accounts
          </button>
          <button
            className={`btn ${statusFilter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={() => setStatusFilter('REJECTED')}
          >
            Rejected
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

      {filteredUsers.length === 0 ? (
        <EmptyState
          title="No Matching Users Found"
          description={statusFilter === 'PENDING' ? "There are no pending Security or Valet account registrations waiting for review." : "No user accounts matched the current filter criteria."}
          icon={Users}
        />
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Assigned Role</th>
                  <th>Account Status</th>
                  <th>Approval / Role Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      background: u.status === 'PENDING' ? 'rgba(245, 158, 11, 0.05)' : undefined
                    }}
                  >
                    <td style={{ fontWeight: '600', color: '#94a3b8' }}>#{u.id}</td>
                    <td style={{ fontWeight: '600', color: '#f8fafc' }}>{u.full_name || '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{u.email}</td>
                    <td><StatusBadge status={u.role} /></td>
                    <td><StatusBadge status={u.status || 'ACTIVE'} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {u.status === 'PENDING' ? (
                          <>
                            <button
                              className="btn btn-success"
                              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '700' }}
                              disabled={statusUpdatingId === u.id}
                              onClick={() => handleStatusUpdate(u.id, 'ACTIVE')}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '700' }}
                              disabled={statusUpdatingId === u.id}
                              onClick={() => handleStatusUpdate(u.id, 'REJECTED')}
                            >
                              <X size={14} /> Reject
                            </button>
                          </>
                        ) : u.status === 'REJECTED' ? (
                          <button
                            className="btn btn-success"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            disabled={statusUpdatingId === u.id}
                            onClick={() => handleStatusUpdate(u.id, 'ACTIVE')}
                          >
                            Re-Approve
                          </button>
                        ) : null}

                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => {
                            setSelectedUser(u);
                            setNewRole(u.role);
                          }}
                        >
                          <Edit2 size={13} /> Edit Role
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Update Role Modal */}
      <Modal
        isOpen={Boolean(selectedUser)}
        title={`Modify Role for ${selectedUser?.email}`}
        onClose={() => setSelectedUser(null)}
      >
        <form onSubmit={handleRoleUpdate}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>
              Assign System Role *
            </label>
            <select
              className="input-field"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              required
            >
              <option value="RESIDENT">RESIDENT (Default public account)</option>
              <option value="SECURITY">SECURITY (Gate entry/exit authorization)</option>
              <option value="VALET">VALET (Parking assignment & slot release)</option>
              <option value="ADMIN">ADMIN (Full system administrator)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Save Role Assignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
