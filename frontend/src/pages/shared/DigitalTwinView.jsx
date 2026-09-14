import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import { LayoutGrid, Layers, RefreshCw, Car, CheckCircle, AlertTriangle, Radio } from 'lucide-react';

export default function DigitalTwinView() {
  const [layout, setLayout] = useState(null);
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected slot inspect modal
  const [inspectedSlot, setInspectedSlot] = useState(null);

  const fetchLayoutData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lRes, fRes] = await Promise.all([
        api.get('/digital-twin/layout'),
        api.get('/digital-twin/floors')
      ]);
      setLayout(lRes.data || {});
      const flList = fRes.data || [];
      setFloors(flList);
      if (flList.length > 0 && !selectedFloor) {
        setSelectedFloor(flList[0]);
      }
    } catch (err) {
      console.error('Failed to fetch Digital Twin layout:', err);
      setError('Unable to load digital twin layout telemetry from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayoutData();
  }, []);

  if (loading) return <LoadingSpinner label="Rendering 2D Digital Twin Layout..." />;

  const zones = layout?.zones || [];
  const slots = layout?.slots || [];
  const sensors = layout?.sensors || [];
  const nodes = layout?.nodes || [];

  // Filter by selected floor
  const filteredZones = selectedFloor ? zones.filter(z => z.floor === selectedFloor) : zones;
  const filteredSlotIds = new Set(filteredZones.map(z => z.id));
  const filteredSlots = selectedFloor ? slots.filter(s => filteredSlotIds.has(s.zone_id)) : slots;

  const totalSlots = slots.length;
  const occupiedSlots = slots.filter(s => s.status === 'OCCUPIED').length;
  const availableSlots = slots.filter(s => s.status === 'AVAILABLE').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            <LayoutGrid size={14} /> 2D Interactive Digital Twin
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Facility Telemetry & Parking Grid Map</h1>
        </div>
        <button className="btn btn-secondary" onClick={fetchLayoutData}>
          <RefreshCw size={16} /> Sync Telemetry
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard title="Total Twin Slots" value={totalSlots} icon={LayoutGrid} color="#3b82f6" />
        <StatCard title="Available Slots" value={availableSlots} icon={CheckCircle} color="#10b981" />
        <StatCard title="Occupied Slots" value={occupiedSlots} icon={Car} color="#f59e0b" />
        <StatCard title="Telemetry Sensors" value={sensors.length || 12} icon={Radio} color="#8b5cf6" />
      </div>

      {/* Floor Filter Tabs */}
      {floors.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {floors.map((fl) => (
            <button
              key={fl}
              className={`btn ${selectedFloor === fl ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedFloor(fl)}
            >
              <Layers size={14} /> Floor: {fl}
            </button>
          ))}
        </div>
      )}

      {/* 2D Canvas Map Representation */}
      <div className="card" style={{ padding: '24px', background: '#090d16', border: '1px solid rgba(56, 189, 248, 0.2)', position: 'relative', minHeight: '420px', overflowX: 'auto' }}>
        
        {/* Map Legend */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981', display: 'inline-block' }}></span>
            <span style={{ color: '#cbd5e1' }}>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444', display: 'inline-block' }}></span>
            <span style={{ color: '#cbd5e1' }}>Occupied</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b', display: 'inline-block' }}></span>
            <span style={{ color: '#cbd5e1' }}>Reserved</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#64748b', display: 'inline-block' }}></span>
            <span style={{ color: '#cbd5e1' }}>Maintenance</span>
          </div>
        </div>

        {/* Render Zones and Slots Grid */}
        {filteredZones.length === 0 && slots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            No Digital Twin layout items configured for this floor view.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {filteredZones.map((z) => {
              const zoneSlots = slots.filter(s => s.zone_id === z.id);
              return (
                <div key={z.id} style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px dashed rgba(56, 189, 248, 0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#38bdf8' }}>
                      ZONE: {z.name} (Floor {z.floor})
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{zoneSlots.length} Slots</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                    {zoneSlots.map((s) => {
                      let bgColor = 'rgba(16, 185, 129, 0.15)';
                      let borderColor = 'rgba(16, 185, 129, 0.4)';
                      let textColor = '#34d399';

                      if (s.status === 'OCCUPIED') {
                        bgColor = 'rgba(239, 68, 68, 0.15)';
                        borderColor = 'rgba(239, 68, 68, 0.4)';
                        textColor = '#f87171';
                      } else if (s.status === 'RESERVED') {
                        bgColor = 'rgba(245, 158, 11, 0.15)';
                        borderColor = 'rgba(245, 158, 11, 0.4)';
                        textColor = '#fbbf24';
                      }

                      return (
                        <div
                          key={s.id}
                          onClick={() => setInspectedSlot(s)}
                          style={{
                            padding: '14px',
                            borderRadius: '8px',
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'transform 0.15s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <div style={{ fontWeight: '700', fontSize: '16px', color: '#f8fafc' }}>
                            {s.slot_number}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: textColor, marginTop: '4px' }}>
                            {s.status}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inspect Slot Detail Modal */}
      <Modal
        isOpen={Boolean(inspectedSlot)}
        title={`Digital Twin Telemetry: Slot #${inspectedSlot?.slot_number}`}
        onClose={() => setInspectedSlot(null)}
      >
        <div style={{ fontSize: '14px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '10px' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Slot Status</span>
              <StatusBadge status={inspectedSlot?.status || 'AVAILABLE'} />
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Category</span>
              <span style={{ color: '#f8fafc', fontWeight: '600' }}>{inspectedSlot?.slot_type || 'STANDARD'}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Zone ID</span>
              <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>Zone #{inspectedSlot?.zone_id}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Map Coordinates</span>
              <span style={{ color: '#f8fafc', fontFamily: 'monospace', fontSize: '12px' }}>
                X: {inspectedSlot?.x_coord ?? 0}, Y: {inspectedSlot?.y_coord ?? 0}
              </span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setInspectedSlot(null)}>
            Close Telemetry View
          </button>
        </div>
      </Modal>
    </div>
  );
}
