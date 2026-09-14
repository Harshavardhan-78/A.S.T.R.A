import React from 'react';

const statusStyles = {
  // Pass & Request statuses
  APPROVED: 'badge-success',
  AUTHORIZED: 'badge-success',
  ACTIVE: 'badge-success',
  AVAILABLE: 'badge-success',
  RESOLVED: 'badge-success',

  PENDING: 'badge-warning',
  OCCUPIED: 'badge-info',
  INVESTIGATING: 'badge-purple',
  RESERVED: 'badge-warning',

  REJECTED: 'badge-danger',
  DENIED: 'badge-danger',
  EXPIRED: 'badge-danger',
  REVOKED: 'badge-danger',
  UNAUTHORIZED: 'badge-danger',
  MAINTENANCE: 'badge-danger',
  CRITICAL: 'badge-danger',
  HIGH: 'badge-danger',
  OPEN: 'badge-warning',
};

const StatusBadge = ({ status }) => {
  const normStatus = (status || 'UNKNOWN').toUpperCase();
  const styleClass = statusStyles[normStatus] || 'badge-info';

  return <span className={`badge ${styleClass}`}>{normStatus}</span>;
};

export default StatusBadge;
