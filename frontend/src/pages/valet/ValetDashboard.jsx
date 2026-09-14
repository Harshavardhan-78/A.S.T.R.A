import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { ParkingSquare, Plus, AlertCircle, CheckCircle, Car, ArrowUpRight, Unlock, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ValetDashboard() {
  const [availability, setAvailability] = useState(null);
  const [slots, setSlots] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Assign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [availRes, slotRes, vehRes, assignRes] = await Promise.all([
        api.get('/parking/availability'),
        api.get('/parking/slots'),
        api.get('/vehicles'),
        api.get('/parking/assignments')
      ]);
      setAvailability(availRes.data || {});
      setSlots(slotRes.data || []);
      setVehicles(vehRes.data || []);
      setAssignments(assignRes.data || []);
    } catch (err) {
      console.error('Failed to load valet data:', err);
      setError('Unable to load parking slot records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !assignVehicleId) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/parking/assign', {
        slot_id: parseInt(selectedSlot.id),
        vehicle_id: parseInt(assignVehicleId)
      });
      setSuccess(`Vehicle assigned to Slot #${selectedSlot.slot_number} successfully!`);
      setIsAssignModalOpen(false);
      setSelectedSlot(null);
      setAssignVehicleId('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Parking assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async (slotId) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/parking/release', { slot_id: parseInt(slotId) });
      setSuccess(`Parking Slot #${slotId} released and set to AVAILABLE.`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to release parking slot.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading Valet Parking Console..." />;

  const totalSlots = availability?.total_slots || slots.length || 0;
  const occupiedSlots = availability?.occupied_slots || slots.filter(s => s.status === 'OCCUPIED').length || 0;
  const availableSlots = availability?.available_slots || slots.filter(s => s.status === 'AVAILABLE').length || 0;
  const occupancyPct = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  return (
    <div>
      {/* Console Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            <ParkingSquare size={14} /> Valet & Parking Control
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Parking Lot Operations</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/valet/assignments" className="btn btn-secondary">
            Assignment Log
          </Link>
          <Link to="/shared/digital-twin" className="btn btn-primary">
            <LayoutGrid size={16} /> Open 2D Digital Twin
          </Link>
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

      {/* KPI Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <StatCard
          title="Total Parking Slots"
          value={totalSlots}
          icon={ParkingSquare}
          color="#3b82f6"
          subtitle="Configured capacity"
        />
        <StatCard
          title="Available Slots"
          value={availableSlots}
          icon={ParkingSquare}
          color="#10b981"
          subtitle="Ready for assignment"
        />
        <StatCard
          title="Occupied Slots"
          value={occupiedSlots}
          icon={Car}
          color="#f59e0b"
          subtitle="Vehicles parked"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${occupancyPct}%`}
          icon={ArrowUpRight}
          color="#8b5cf6"
          subtitle="Capacity utilization"
        />
      </div>

      {/* Parking Slots Grid */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '16px' }}>
          Real-time Parking Slot Grid
        </h2>

        {slots.length === 0 ? (
          <EmptyState
            title="No Parking Slots Configured"
            description="Contact system admin to configure parking zones and slots."
            icon={ParkingSquare}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="card"
                style={{
                  padding: '16px',
                  background: slot.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                  border: `1px solid ${slot.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', color: '#f8fafc' }}>
                    Slot {slot.slot_number}
                  </div>
                  <StatusBadge status={slot.status} />
                </div>

                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                  Type: {slot.slot_type || 'STANDARD'} | Zone #{slot.zone_id}
                </div>

                <div>
                  {slot.status === 'AVAILABLE' ? (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setIsAssignModalOpen(true);
                      }}
                    >
                      <Plus size={14} /> Assign Vehicle
                    </button>
                  ) : (
                    <button
                      className="btn btn-danger"
                      style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}
                      onClick={() => handleRelease(slot.id)}
                      disabled={submitting}
                    >
                      <Unlock size={14} /> Release Slot
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        title={`Assign Vehicle to Slot #${selectedSlot?.slot_number}`}
        onClose={() => setIsAssignModalOpen(false)}
      >
        <form onSubmit={handleAssignSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
              Select Vehicle to Park *
            </label>
            <select
              className="input-field"
              value={assignVehicleId}
              onChange={(e) => setAssignVehicleId(e.target.value)}
              required
            >
              <option value="">-- Choose Registered Vehicle --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.license_plate} ({v.make} {v.model || ''})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
