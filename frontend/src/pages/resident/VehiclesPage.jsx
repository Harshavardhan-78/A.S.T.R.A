import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { Car, Plus, Trash2, Edit2, AlertCircle, CheckCircle } from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    license_plate: '',
    make: '',
    model: '',
    color: '',
    vehicle_type: 'FOUR_WHEELER'
  });

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const resetForm = () => {
    setFormData({
      license_plate: '',
      make: '',
      model: '',
      color: '',
      vehicle_type: 'FOUR_WHEELER'
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        ...formData,
        license_plate: formData.license_plate.toUpperCase().trim()
      };
      await api.post('/vehicles', payload);
      setSuccess('Vehicle registered successfully!');
      setIsAddModalOpen(false);
      resetForm();
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        make: formData.make,
        model: formData.model,
        color: formData.color,
        vehicle_type: formData.vehicle_type
      };
      await api.put(`/vehicles/${selectedVehicle.id}`, payload);
      setSuccess('Vehicle updated successfully!');
      setIsEditModalOpen(false);
      setSelectedVehicle(null);
      resetForm();
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/vehicles/${id}`);
      setSuccess('Vehicle deleted successfully.');
      setDeleteId(null);
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      license_plate: vehicle.license_plate,
      make: vehicle.make || '',
      model: vehicle.model || '',
      color: vehicle.color || '',
      vehicle_type: vehicle.vehicle_type || 'FOUR_WHEELER'
    });
    setIsEditModalOpen(true);
  };

  if (loading) return <LoadingSpinner label="Loading vehicles..." />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Vehicle Management</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Register and manage your authorized resident vehicles.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
        >
          <Plus size={16} /> Add New Vehicle
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

      {/* Vehicles Table / List */}
      {vehicles.length === 0 ? (
        <EmptyState
          title="No Vehicles Registered"
          description="Register your license plate to allow smooth automated entry at security gates."
          icon={Car}
          actionLabel="Add Vehicle"
          onAction={() => { resetForm(); setIsAddModalOpen(true); }}
        />
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>License Plate</th>
                  <th>Make & Model</th>
                  <th>Color</th>
                  <th>Vehicle Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        fontSize: '15px',
                        letterSpacing: '0.05em',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#38bdf8'
                      }}>
                        {v.license_plate}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500' }}>
                      {v.make || '—'} {v.model || ''}
                    </td>
                    <td>{v.color || '—'}</td>
                    <td>
                      <StatusBadge status={v.vehicle_type} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '13px' }}
                          onClick={() => openEditModal(v)}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 10px', fontSize: '13px' }}
                          onClick={() => setDeleteId(v.id)}
                        >
                          <Trash2 size={14} /> Delete
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

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={isAddModalOpen}
        title="Register New Vehicle"
        onClose={() => setIsAddModalOpen(false)}
      >
        <form onSubmit={handleAddSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
              License Plate *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. KA01AB1234"
              style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
              value={formData.license_plate}
              onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Make (Brand)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Tesla, Honda"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Model
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Model 3, Civic"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Color
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Black, Silver"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Vehicle Category
              </label>
              <select
                className="input-field"
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              >
                <option value="FOUR_WHEELER">Four Wheeler (Car/SUV)</option>
                <option value="TWO_WHEELER">Two Wheeler (Bike/Scooter)</option>
                <option value="COMMERCIAL">Commercial / Van</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Registering...' : 'Register Vehicle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Vehicle Modal */}
      <Modal
        isOpen={isEditModalOpen}
        title={`Edit Vehicle: ${selectedVehicle?.license_plate}`}
        onClose={() => setIsEditModalOpen(false)}
      >
        <form onSubmit={handleEditSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Make
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Model
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Color
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#cbd5e1', marginBottom: '6px' }}>
                Vehicle Category
              </label>
              <select
                className="input-field"
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              >
                <option value="FOUR_WHEELER">Four Wheeler (Car/SUV)</option>
                <option value="TWO_WHEELER">Two Wheeler (Bike/Scooter)</option>
                <option value="COMMERCIAL">Commercial / Van</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteId)}
        title="Confirm Vehicle Removal"
        onClose={() => setDeleteId(null)}
      >
        <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '24px' }}>
          Are you sure you want to remove this vehicle from your profile? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setDeleteId(null)}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            disabled={submitting}
            onClick={() => handleDelete(deleteId)}
          >
            {submitting ? 'Deleting...' : 'Delete Vehicle'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
