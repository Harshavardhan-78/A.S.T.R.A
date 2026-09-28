import React from 'react';

const statusStyles = {
  // Pass & Request statuses
  APPROVED: 'badge-success',
  AUTHORIZED: 'badge-success',
  ACTIVE: 'badge-success',
  AVAILABLE: 'badge-success',
  RESOLVED: 'badge-success',
  DELIVERED: 'badge-success',

  PENDING: 'badge-warning',
  OCCUPIED: 'badge-info',
  INVESTIGATING: 'badge-purple',
  RESERVED: 'badge-warning',
  NOT_VERIFIED: 'badge-warning',
  'NOT VERIFIED': 'badge-warning',
  NOT_CONFIGURED: 'badge-warning',

  REJECTED: 'badge-danger',
  DENIED: 'badge-danger',
  EXPIRED: 'badge-danger',
  REVOKED: 'badge-danger',
  UNAUTHORIZED: 'badge-danger',
  FAILED: 'badge-danger',
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
