import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Forbidden() {
  const { user } = useAuth();

  const getHomeRoute = () => {
    switch (user?.role) {
      case 'ADMIN': return '/admin';
      case 'SECURITY': return '/security';
      case 'VALET': return '/valet';
      default: return '/resident';
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="card" style={{ maxWidth: '460px', textAlign: 'center', padding: '40px 32px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <ShieldAlert size={36} />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>
          403 — Access Forbidden
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '28px', lineHeight: '1.5' }}>
          You do not possess the required RBAC permissions ({user?.role || 'GUEST'}) to access this route. Security defense-in-depth has prevented access.
        </p>

        <Link to={getHomeRoute()} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          <ArrowLeft size={16} /> Return to Your Authorized Dashboard
        </Link>
      </div>
    </div>
  );
}
