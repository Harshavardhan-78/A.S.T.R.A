import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { QrCode, AlertCircle, CheckCircle, Clock, ShieldCheck, XCircle, Download, Share2 } from 'lucide-react';

export default function PassesPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Selected pass detail view
  const [activePass, setActivePass] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const fetchPasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/visitor-requests');
      setRequests(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load access passes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const openPassModal = async (requestId) => {
    setLoadingQr(true);
    setQrImageUrl(null);
    setActivePass(null);
    setIsPassModalOpen(true);
    try {
      // First, get the pass by visitor request ID
      const passRes = await api.get(`/access-passes/by-request/${requestId}`);
      const pass = passRes.data;
      setActivePass(pass);

      // Now fetch the QR image using the actual pass ID
      const qrRes = await api.get(`/access-passes/${pass.id}/qr-image`);
      const dataUri = qrRes.data?.qr_image_data_uri;
      if (dataUri) {
        setQrImageUrl(dataUri);
      } else {
        setQrImageUrl(null);
      }
    } catch (err) {
      console.error('Error fetching pass QR:', err);
      setError(err.response?.data?.detail || 'Failed to load QR code image. The pass may not have been generated yet.');
    } finally {
      setLoadingQr(false);
    }
  };

  const handleSharePass = async () => {
    if (!activePass) return;
    const shareData = {
      title: `A.S.T.R.A Access Pass #${activePass.id}`,
      text: `A.S.T.R.A QR Gate Access Pass #${activePass.id} (Token: ${activePass.qr_token}). Valid until ${new Date(activePass.valid_until).toLocaleString()}.`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Web share dismissed:', err);
      }
    } else {
      const text = encodeURIComponent(shareData.text);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  };

  const handleDownloadQr = () => {
    if (!qrImageUrl) return;
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `ASTRA-Pass-${activePass?.id || 'QR'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRevokePass = async (passId) => {
    setRevoking(true);
    setError(null);
    try {
      await api.post(`/access-passes/${passId}/revoke`);
      setSuccess('Access pass revoked successfully.');
      setIsPassModalOpen(false);
      fetchPasses();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to revoke pass.');
    } finally {
      setRevoking(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading Access Passes..." />;

  // Approved visitor requests with passes
  const approvedRequests = requests.filter(r => r.status === 'APPROVED');

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Active QR Access Passes</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Secure, cryptographic QR gate passes generated directly by the backend for your approved visitors.
        </p>
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

      {approvedRequests.length === 0 ? (
        <EmptyState
          title="No Active Access Passes"
          description="Once your visitor request is approved, your secure QR pass will appear here for gate entry."
          icon={QrCode}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {approvedRequests.map((req) => (
            <div key={req.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <QrCode size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: '#f8fafc' }}>
                        Pass #{req.id}
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        {req.purpose || 'Guest Visit'}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>
                    <strong style={{ color: '#94a3b8' }}>Visit Date:</strong> {new Date(req.visit_date).toLocaleDateString()}
                  </div>
                  <div>
                    <strong style={{ color: '#94a3b8' }}>Vehicle Number:</strong> <span style={{ color: '#38bdf8', fontWeight: '600' }}>{req.vehicle_number || '—'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#94a3b8' }}>Visitor ID:</strong> #{req.visitor_id}
                  </div>
                  {req.vehicle_id && (
                    <div>
                      <strong style={{ color: '#94a3b8' }}>Vehicle ID:</strong> #{req.vehicle_id}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openPassModal(req.id)}
                >
                  <QrCode size={16} /> View Digital QR Code
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Pass Detail Modal */}
      <Modal
        isOpen={isPassModalOpen}
        title={`Access Pass #${activePass?.id || ''}`}
        onClose={() => setIsPassModalOpen(false)}
      >
        {loadingQr ? (
          <LoadingSpinner label="Retrieving cryptographic QR from backend..." />
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            {qrImageUrl ? (
              <div style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '16px',
                display: 'inline-block',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                marginBottom: '20px'
              }}>
                <img
                  src={qrImageUrl}
                  alt="Backend Cryptographic QR Code"
                  style={{ width: '220px', height: '220px', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{ color: '#ef4444', margin: '20px 0' }}>
                Unable to render QR code image.
              </div>
            )}

            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '10px', textAlign: 'left', marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Pass Status</span>
                  <StatusBadge status={activePass?.status || 'APPROVED'} />
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Pass Token</span>
                  <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '12px' }}>
                    {activePass?.qr_token ? activePass.qr_token.substring(0, 16) + '...' : '—'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Valid From</span>
                  <span style={{ color: '#f8fafc' }}>
                    {activePass?.valid_from ? new Date(activePass.valid_from).toLocaleString() : '—'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Valid Until</span>
                  <span style={{ color: '#f8fafc' }}>
                    {activePass?.valid_until ? new Date(activePass.valid_until).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleSharePass}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Share2 size={16} /> Share QR Pass
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleDownloadQr}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={16} /> Download QR
              </button>
              <button
                className="btn btn-danger"
                disabled={revoking || activePass?.status === 'REVOKED'}
                onClick={() => handleRevokePass(activePass.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <XCircle size={16} /> {revoking ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
