import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { Bell, CheckCircle2, Clock } from 'lucide-react';

export default function NotificationsView() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  if (loading) return <LoadingSpinner label="Loading Notifications..." />;

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Notifications & System Alerts</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Real-time updates regarding visitor approvals, gate entry/exit logs, and parking assignment alerts.
          </p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button className="btn btn-secondary" onClick={markAllAsRead}>
            <CheckCircle2 size={16} /> Mark All as Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="Your inbox is clear! No active system alerts."
          icon={Bell}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: '16px 20px',
                background: n.is_read ? 'rgba(15, 23, 42, 0.4)' : 'rgba(59, 130, 246, 0.08)',
                border: `1px solid ${n.is_read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ padding: '8px', borderRadius: '50%', background: n.is_read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.2)', color: n.is_read ? '#64748b' : '#3b82f6', marginTop: '2px' }}>
                  <Bell size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: '600', color: n.is_read ? '#cbd5e1' : '#f8fafc' }}>
                    {n.title || 'System Notification'}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                    {n.message}
                  </p>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {!n.is_read && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => markAsRead(n.id)}
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
