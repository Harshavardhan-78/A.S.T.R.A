import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { ParkingSquare, Plus, AlertCircle, CheckCircle, Layers } from 'lucide-react';

export default function ParkingMgmtPage() {
  const [zones, setZones] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modals
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Zone Form
  const [zoneForm, setZoneForm] = useState({
    name: '',
    floor: 'GROUND',
    description: '',
    x_coord: 0,
    y_coord: 0,
    width: 200,
    height: 150
  });

  // Slot Form
  const [slotForm, setSlotForm] = useState({
    zone_id: '',
    slot_number: '',
    status: 'AVAILABLE',
    slot_type: 'STANDARD',
    x_coord: 10,
    y_coord: 10,
    width: 40,
    height: 60
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [zRes, sRes] = await Promise.all([
        api.get('/parking/zones'),
        api.get('/parking/slots')
      ]);
      setZones(zRes.data || []);
      setSlots(sRes.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch parking layout configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleZoneSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/parking/zones', {
        name: zoneForm.name,
        floor: zoneForm.floor,
        description: zoneForm.description,
        x_coord: parseFloat(zoneForm.x_coord),
        y_coord: parseFloat(zoneForm.y_coord),
        width: parseFloat(zoneForm.width),
        height: parseFloat(zoneForm.height)
      });
      setSuccess(`Parking Zone '${zoneForm.name}' created!`);
      setIsZoneModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create zone.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSlotSubmit = async (e) => {
    e.preventDefault();
    if (!slotForm.zone_id) {
      setError('Please select a parent zone.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/parking/slots', {
        zone_id: parseInt(slotForm.zone_id),
        slot_number: slotForm.slot_number.toUpperCase().trim(),
        status: slotForm.status,
        slot_type: slotForm.slot_type,
        x_coord: parseFloat(slotForm.x_coord),
        y_coord: parseFloat(slotForm.y_coord),
        width: parseFloat(slotForm.width),
        height: parseFloat(slotForm.height)
      });
      setSuccess(`Parking Slot '${slotForm.slot_number}' created!`);
      setIsSlotModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create slot.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading Parking Configuration..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Parking Setup & Digital Twin Configuration</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Configure parking zones, floors, coordinates, and individual parking slots.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setIsZoneModalOpen(true)}>
            <Plus size={16} /> Add Parking Zone
          </button>
          <button className="btn btn-primary" onClick={() => setIsSlotModalOpen(true)}>
            <Plus size={16} /> Add Parking Slot
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

      {/* Zones Grid */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '16px' }}>Configured Parking Zones ({zones.length})</h2>
        {zones.length === 0 ? (
          <EmptyState
            title="No Zones Configured"
            description="Create your first parking zone (e.g. Zone A - Ground Floor) to organize slots."
            icon={ParkingSquare}
            actionLabel="Add Zone"
            onAction={() => setIsZoneModalOpen(true)}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {zones.map((z) => (
              <div key={z.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#f8fafc' }}>{z.name}</span>
                  <span style={{ fontSize: '12px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    Floor: {z.floor}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>{z.description || 'No description'}</p>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>
                  Coords: ({z.x_coord}, {z.y_coord}) | Dim: {z.width}x{z.height}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slots Table */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '16px' }}>Configured Parking Slots ({slots.length})</h2>
        {slots.length === 0 ? (
          <EmptyState
            title="No Slots Configured"
            description="Add parking slots to zones."
            icon={ParkingSquare}
            actionLabel="Add Slot"
            onAction={() => setIsSlotModalOpen(true)}
          />
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Slot ID</th>
                    <th>Slot Number</th>
                    <th>Zone ID</th>
                    <th>Category</th>
                    <th>Coordinates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '600', color: '#94a3b8' }}>#{s.id}</td>
                      <td style={{ fontWeight: '700', color: '#f8fafc' }}>{s.slot_number}</td>
                      <td>Zone #{s.zone_id}</td>
                      <td>{s.slot_type || 'STANDARD'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>({s.x_coord}, {s.y_coord})</td>
                      <td><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Zone Modal */}
      <Modal isOpen={isZoneModalOpen} title="Create Parking Zone" onClose={() => setIsZoneModalOpen(false)}>
        <form onSubmit={handleZoneSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Zone Name *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Zone A - Visitor Bay"
              value={zoneForm.name}
              onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Floor Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. GROUND, B1, B2"
                value={zoneForm.floor}
                onChange={(e) => setZoneForm({ ...zoneForm, floor: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Description</label>
              <input
                type="text"
                className="input-field"
                placeholder="Zone purpose"
                value={zoneForm.description}
                onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsZoneModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Zone'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Slot Modal */}
      <Modal isOpen={isSlotModalOpen} title="Create Parking Slot" onClose={() => setIsSlotModalOpen(false)}>
        <form onSubmit={handleSlotSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Select Zone *</label>
            <select
              className="input-field"
              value={slotForm.zone_id}
              onChange={(e) => setSlotForm({ ...slotForm, zone_id: e.target.value })}
              required
            >
              <option value="">-- Select Parent Zone --</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name} ({z.floor})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Slot Number *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. A-101"
                value={slotForm.slot_number}
                onChange={(e) => setSlotForm({ ...slotForm, slot_number: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Slot Category</label>
              <select
                className="input-field"
                value={slotForm.slot_type}
                onChange={(e) => setSlotForm({ ...slotForm, slot_type: e.target.value })}
              >
                <option value="STANDARD">Standard</option>
                <option value="EV_CHARGING">EV Charging</option>
                <option value="HANDICAPPED">Handicapped</option>
                <option value="VIP">VIP / Reserved</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsSlotModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Slot'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
