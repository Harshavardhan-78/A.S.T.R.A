import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import { Users, Shield, ParkingSquare, AlertTriangle, FileText, LayoutGrid, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [parkingMetrics, setParkingMetrics] = useState(null);
  const [securityMetrics, setSecurityMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [oRes, pRes, sRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/parking'),
        api.get('/analytics/security')
      ]);
      setOverview(oRes.data || {});
      setParkingMetrics(pRes.data || {});
      setSecurityMetrics(sRes.data || {});
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingSpinner label="Loading Administrator Command Center..." />;

  return (
    <div>
      {/* Header */}
      <div className="card" style={{
        marginBottom: '24px',
        padding: '24px 32px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
        border: '1px solid rgba(139, 92, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              <ShieldCheck size={14} /> System Administrator Command Center
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>A.S.T.R.A Core Administration</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              Real-time multi-system telemetries, RBAC user permissions, parking configuration, and AI document indexing.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/admin/users" className="btn btn-primary">
              <Users size={16} /> User RBAC Management
            </Link>
            <Link to="/shared/digital-twin" className="btn btn-secondary">
              <LayoutGrid size={16} /> Digital Twin Map
            </Link>
          </div>
        </div>
      </div>

      {/* Real Analytics KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <StatCard
          title="Total System Users"
          value={overview?.total_users ?? 0}
          icon={Users}
          color="#3b82f6"
          subtitle="Registered accounts"
        />
        <StatCard
          title="Registered Vehicles"
          value={overview?.total_vehicles ?? 0}
          icon={Activity}
          color="#10b981"
          subtitle="Resident & visitor vehicles"
        />
        <StatCard
          title="Parking Occupancy"
          value={`${parkingMetrics?.occupancy_rate ?? 0}%`}
          icon={ParkingSquare}
          color="#f59e0b"
          subtitle={`${parkingMetrics?.occupied_slots ?? 0} / ${parkingMetrics?.total_slots ?? 0} slots`}
        />
        <StatCard
          title="Unresolved Anomalies"
          value={securityMetrics?.open_anomalies ?? 0}
          icon={AlertTriangle}
          color="#ef4444"
          subtitle="Requiring investigation"
        />
      </div>

      {/* Quick Administration Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* User Management */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Users size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>User & Role Management</h2>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            Promote accounts to elevated roles (ADMIN, SECURITY, VALET) or inspect user directory.
          </p>
          <Link to="/admin/users" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            Manage Users <ArrowRight size={14} />
          </Link>
        </div>

        {/* Parking Setup */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <ParkingSquare size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>Parking Setup & Layout</h2>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            Define parking floors, zones, and 2D coordinate grid slots for Digital Twin rendering.
          </p>
          <Link to="/admin/parking" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            Configure Parking <ArrowRight size={14} />
          </Link>
        </div>

        {/* Anomaly & Dispute Resolution */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <AlertTriangle size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>Security Anomalies</h2>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            Audit automated security alerts, tailgating flags, and update investigation statuses.
          </p>
          <Link to="/admin/anomalies" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            Review Anomalies <ArrowRight size={14} />
          </Link>
        </div>

        {/* RAG Knowledge Base */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                <FileText size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>RAG Knowledge Index</h2>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            Upload society bylaws, guidelines, and manuals for AI vector search and chatbot retrieval.
          </p>
          <Link to="/admin/documents" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            Manage RAG Documents <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}
