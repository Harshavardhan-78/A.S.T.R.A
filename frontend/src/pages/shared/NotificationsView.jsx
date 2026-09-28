import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { Bell, CheckCircle2, Clock, Send, Smartphone } from 'lucide-react';

export default function NotificationsView() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  if (loading) return <LoadingSpinner label="Loading Notifications..." />;

  return (
    <div style={{ maxWidth: '840px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Notification Center & System Alerts</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Real-time multi-channel notifications regarding registrations, visitor access, security alerts, and system events.
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: '18px 20px',
                background: n.is_read ? 'rgba(15, 23, 42, 0.4)' : 'rgba(59, 130, 246, 0.08)',
                border: `1px solid ${n.is_read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.3)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ padding: '10px', borderRadius: '50%', background: n.is_read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.2)', color: n.is_read ? '#64748b' : '#3b82f6', marginTop: '2px' }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: '700', color: n.is_read ? '#cbd5e1' : '#f8fafc', margin: 0 }}>
                        {n.title || 'System Notification'}
                      </h2>
                      {!n.is_read && (
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                          UNREAD
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '14px', color: '#cbd5e1', margin: '4px 0 8px 0', lineHeight: '1.5' }}>
                      {n.message}
                    </p>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}
                    onClick={() => markAsRead(n.id)}
                  >
                    Mark Read
                  </button>
                )}
              </div>

              {/* Notification Metadata Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {new Date(n.created_at).toLocaleString()}
                  </span>
                  <span style={{ color: '#94a3b8', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                    TYPE: {n.notification_type || 'IN_APP'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Smartphone size={12} /> Channel: <strong style={{ color: '#94a3b8' }}>{n.delivery_channel || 'IN_APP'}</strong>
                  </span>
                  <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Status: <StatusBadge status={n.delivery_status || 'DELIVERED'} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
