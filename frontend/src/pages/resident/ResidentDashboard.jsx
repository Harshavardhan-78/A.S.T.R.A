import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { Car, UserCheck, QrCode, AlertCircle, Plus, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [visitorRequests, setVisitorRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, reqRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/visitor-requests')
      ]);
      setVehicles(vRes.data || []);
      setVisitorRequests(reqRes.data || []);
    } catch (err) {
      console.error('Failed to load resident dashboard data:', err);
      setError('Unable to fetch resident data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner label="Loading Resident Dashboard..." />;

  const approvedRequests = visitorRequests.filter(r => r.status === 'APPROVED');
  const pendingRequests = visitorRequests.filter(r => r.status === 'PENDING');

  return (
    <div>
      {/* Welcome Banner */}
      <div className="card" style={{
        marginBottom: '24px',
        padding: '24px 32px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              <ShieldCheck size={14} /> Resident Portal
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
              Welcome back, {user?.full_name || 'Resident'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              Manage your registered vehicles, visitor access passes, and security disputes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/resident/visitors" className="btn btn-primary">
              <Plus size={16} /> New Visitor Pass
            </Link>
            <Link to="/resident/chatbot" className="btn btn-secondary">
              <MessageSquare size={16} /> AI Concierge
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', marginBottom: '24px' }}>
          <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          {error}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <StatCard
          title="Registered Vehicles"
          value={vehicles.length}
          icon={Car}
          color="#3b82f6"
          subtitle="Active vehicles on file"
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests.length}
          icon={UserCheck}
          color="#f59e0b"
          subtitle="Awaiting authorization"
        />
        <StatCard
          title="Approved Visitor Passes"
          value={approvedRequests.length}
          icon={QrCode}
          color="#10b981"
          subtitle="Ready for entry"
        />
        <StatCard
          title="Total Visitor History"
          value={visitorRequests.length}
          icon={UserCheck}
          color="#8b5cf6"
          subtitle="Requests created"
        />
      </div>

      {/* Main Content Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Vehicles Summary */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>My Vehicles</h2>
            <Link to="/resident/vehicles" style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '500', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {vehicles.length === 0 ? (
            <EmptyState
              title="No Vehicles Registered"
              description="Register your vehicle to enable automated gate entry and parking tracking."
              icon={Car}
              actionLabel="Add Vehicle"
              onAction={() => window.location.href = '/resident/vehicles'}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {vehicles.slice(0, 3).map((v) => (
                <div key={v.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                      <Car size={20} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '15px', color: '#f8fafc' }}>
                        {v.license_plate}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {v.make} {v.model} ({v.color})
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={v.vehicle_type} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visitor Requests Summary */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>Recent Visitor Passes</h2>
            <Link to="/resident/visitors" style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '500', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Manage Visitors <ArrowRight size={14} />
            </Link>
          </div>

          {visitorRequests.length === 0 ? (
            <EmptyState
              title="No Visitor Requests"
              description="Create a visitor request to generate digital QR gate passes for your guests."
              icon={UserCheck}
              actionLabel="Create Pass"
              onAction={() => window.location.href = '/resident/visitors'}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {visitorRequests.slice(0, 3).map((req) => (
                <div key={req.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>
                      {req.purpose || 'Guest Visit'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      Visit Date: {new Date(req.visit_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <StatusBadge status={req.status} />
                    {req.status === 'APPROVED' && (
                      <Link to={`/resident/passes`} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }}>
                        <QrCode size={14} /> QR
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
