import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { Users, Shield, Edit2, AlertCircle, CheckCircle } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('RESIDENT');
  const [submitting, setSubmitting] = useState(false);

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

  if (loading) return <LoadingSpinner label="Loading User Directory..." />;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>System User Directory & Role Delegation</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Grant elevated permissions (ADMIN, SECURITY, VALET) to registered user accounts.
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

      {users.length === 0 ? (
        <EmptyState
          title="No Users Registered"
          description="No user accounts found in database."
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
                  <th>Current Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '600', color: '#94a3b8' }}>#{u.id}</td>
                    <td style={{ fontWeight: '600', color: '#f8fafc' }}>{u.full_name || '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{u.email}</td>
                    <td><StatusBadge status={u.role} /></td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => {
                          setSelectedUser(u);
                          setNewRole(u.role);
                        }}
                      >
                        <Edit2 size={14} /> Update Role
                      </button>
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
