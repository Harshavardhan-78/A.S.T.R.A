import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import { ShieldCheck, QrCode, LogIn, LogOut, Users, AlertCircle, CheckCircle, Search, ShieldAlert, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SecurityDashboard() {
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Verification & Gate Control Form States
  const [verifyToken, setVerifyToken] = useState('');
  const [verifyPlate, setVerifyPlate] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Entry Form State
  const [entryToken, setEntryToken] = useState('');
  const [entryPlate, setEntryPlate] = useState('');
  const [entryGate, setEntryGate] = useState('MAIN_GATE');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Exit Form State
  const [exitPlate, setExitPlate] = useState('');
  const [exitGate, setExitGate] = useState('MAIN_GATE');
  const [submittingExit, setSubmittingExit] = useState(false);

  // Vehicle Verification Form State (Feature 4 & 7)
  const [vehicleNumberInput, setVehicleNumberInput] = useState('');
  const [verifyingVehicle, setVerifyingVehicle] = useState(false);
  const [vehicleVerifyResult, setVehicleVerifyResult] = useState(null);
  const [vehicleVerifyError, setVehicleVerifyError] = useState(null);

  // Quick Action States
  const [actionProcessing, setActionProcessing] = useState(false);

  const fetchActiveVisitors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/security/active-visitors');
      setActiveVisitors(res.data || []);
    } catch (err) {
      console.error('Failed to fetch active visitors:', err);
      setError('Unable to fetch active visitor logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveVisitors();
  }, []);

  // Vehicle Verification Handler
  const handleVerifyVehicle = async (e) => {
    if (e) e.preventDefault();
    if (!vehicleNumberInput) return;
    setVerifyingVehicle(true);
    setVehicleVerifyResult(null);
    setVehicleVerifyError(null);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/security/verify-vehicle', {
        vehicle_number: vehicleNumberInput.trim()
      });
      setVehicleVerifyResult(res.data);
    } catch (err) {
      setVehicleVerifyError(err.response?.data?.detail || 'Vehicle verification failed.');
    } finally {
      setVerifyingVehicle(false);
    }
  };

  // Direct Check-In from Verified Vehicle Result
  const handleDirectVehicleCheckIn = async () => {
    if (!vehicleVerifyResult?.qr_token) {
      setError('Cannot check in: missing pass QR token.');
      return;
    }
    setActionProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/security/entry', {
        qr_token: vehicleVerifyResult.qr_token,
        license_plate: vehicleVerifyResult.vehicle_number,
        gate: 'MAIN_GATE'
      });
      setSuccess(`Checked IN Visitor ${vehicleVerifyResult.visitor_name} (${vehicleVerifyResult.vehicle_number}) successfully!`);
      setVehicleVerifyResult(null);
      setVehicleNumberInput('');
      fetchActiveVisitors();
    } catch (err) {
      setError(err.response?.data?.detail || 'Gate Check-In failed.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Direct Check-Out from Verified Vehicle Result
  const handleDirectVehicleCheckOut = async () => {
    if (!vehicleVerifyResult?.vehicle_number) return;
    setActionProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/security/exit', {
        license_plate: vehicleVerifyResult.vehicle_number,
        gate: 'MAIN_GATE'
      });
      setSuccess(`Checked OUT Visitor ${vehicleVerifyResult.visitor_name} (${vehicleVerifyResult.vehicle_number}) successfully!`);
      setVehicleVerifyResult(null);
      setVehicleNumberInput('');
      fetchActiveVisitors();
    } catch (err) {
      setError(err.response?.data?.detail || 'Gate Check-Out failed.');
    } finally {
      setActionProcessing(false);
    }
  };

  // 1. Verify Pass QR
  const handleVerifyPass = async (e) => {
    e.preventDefault();
    if (!verifyToken) return;
    setVerifying(true);
    setVerificationResult(null);
    setError(null);
    try {
      const res = await api.post('/security/verify-qr', {
        qr_token: verifyToken.trim(),
        expected_vehicle_plate: verifyPlate ? verifyPlate.toUpperCase().trim() : null
      });
      setVerificationResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Pass verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  // 2. Record Gate Entry
  const handleRecordEntry = async (e) => {
    e.preventDefault();
    if (!entryToken) return;
    setSubmittingEntry(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/security/entry', {
        qr_token: entryToken.trim(),
        license_plate: entryPlate ? entryPlate.toUpperCase().trim() : null,
        gate: entryGate
      });
      setSuccess(`Gate Entry Recorded successfully! Record ID #${res.data.id}`);
      setEntryToken('');
      setEntryPlate('');
      setVerificationResult(null);
      fetchActiveVisitors();
    } catch (err) {
      setError(err.response?.data?.detail || 'Gate Entry recording failed.');
    } finally {
      setSubmittingEntry(false);
    }
  };

  // 3. Record Gate Exit
  const handleRecordExit = async (e) => {
    e.preventDefault();
    if (!exitPlate) return;
    setSubmittingExit(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/security/exit', {
        license_plate: exitPlate.toUpperCase().trim(),
        gate: exitGate
      });
      setSuccess(`Gate Exit Recorded successfully for plate ${exitPlate.toUpperCase()}`);
      setExitPlate('');
      fetchActiveVisitors();
    } catch (err) {
      setError(err.response?.data?.detail || 'Gate Exit recording failed.');
    } finally {
      setSubmittingExit(false);
    }
  };

  if (loading) return <LoadingSpinner label="Initializing Security Console..." />;

  return (
    <div>
      {/* Console Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            <ShieldCheck size={14} /> Security Guard Console
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Gate Control & Verification</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/security/history" className="btn btn-secondary">
            Gate Log History
          </Link>
          <Link to="/shared/ai-utilities" className="btn btn-primary">
            <Cpu size={16} /> AI License Plate / Document Recognition
          </Link>
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

      {/* KPI Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <StatCard
          title="Active On-Site Visitors"
          value={activeVisitors.length}
          icon={Users}
          color="#10b981"
          subtitle="Currently inside premises"
        />
        <StatCard
          title="Gate Operational State"
          value="ONLINE"
          icon={ShieldCheck}
          color="#3b82f6"
          subtitle="Main Gate Access Point"
        />
      </div>

      {/* Feature 4 & 7: Mobile-Optimized Vehicle Verification Card */}
      <div className="card" style={{ marginBottom: '28px', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>Vehicle-Based Visitor Verification</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Enter vehicle number for instant visitor pass and responsible resident verification</p>
          </div>
        </div>

        <form onSubmit={handleVerifyVehicle} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
              Vehicle Number *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. TS09AB1234"
              style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}
              value={vehicleNumberInput}
              onChange={(e) => setVehicleNumberInput(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={verifyingVehicle}
            style={{ padding: '12px 24px', fontSize: '16px', fontWeight: '600', minHeight: '46px', flex: '0 0 auto' }}
          >
            <Search size={18} /> {verifyingVehicle ? 'Verifying...' : 'VERIFY VEHICLE'}
          </button>
        </form>

        {vehicleVerifyError && (
          <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            {vehicleVerifyError}
          </div>
        )}

        {vehicleVerifyResult && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            borderRadius: '12px',
            background: vehicleVerifyResult.status === 'VALID'
              ? 'rgba(16, 185, 129, 0.12)'
              : vehicleVerifyResult.status === 'ALREADY_CHECKED_IN'
              ? 'rgba(59, 130, 246, 0.12)'
              : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${
              vehicleVerifyResult.status === 'VALID'
                ? 'rgba(16, 185, 129, 0.4)'
                : vehicleVerifyResult.status === 'ALREADY_CHECKED_IN'
                ? 'rgba(59, 130, 246, 0.4)'
                : 'rgba(239, 68, 68, 0.4)'
            }`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', fontFamily: 'monospace' }}>
                {vehicleVerifyResult.vehicle_number}
              </div>
              <StatusBadge status={vehicleVerifyResult.status} />
            </div>

            {vehicleVerifyResult.message && (
              <div style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '14px' }}>
                {vehicleVerifyResult.message}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px', marginBottom: '16px' }}>
              {vehicleVerifyResult.visitor_name && (
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Visitor Name</span>
                  <strong style={{ color: '#f8fafc' }}>{vehicleVerifyResult.visitor_name}</strong>
                </div>
              )}
              {vehicleVerifyResult.responsible_resident && (
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Responsible Resident</span>
                  <strong style={{ color: '#38bdf8' }}>{vehicleVerifyResult.responsible_resident} (Apt #{vehicleVerifyResult.apartment_number})</strong>
                </div>
              )}
              {vehicleVerifyResult.pass_id && (
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Pass Reference</span>
                  <span style={{ color: '#f8fafc' }}>Pass #{vehicleVerifyResult.pass_id}</span>
                </div>
              )}
              {vehicleVerifyResult.valid_until && (
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Valid Until</span>
                  <span style={{ color: '#f8fafc' }}>{new Date(vehicleVerifyResult.valid_until).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Instant Action Buttons */}
            {vehicleVerifyResult.status === 'VALID' && (
              <button
                className="btn btn-success"
                disabled={actionProcessing}
                onClick={handleDirectVehicleCheckIn}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px', fontWeight: '700' }}
              >
                <LogIn size={18} /> {actionProcessing ? 'Processing Check-In...' : 'CONFIRM VISITOR GATE CHECK-IN'}
              </button>
            )}

            {vehicleVerifyResult.status === 'ALREADY_CHECKED_IN' && (
              <button
                className="btn btn-danger"
                disabled={actionProcessing}
                onClick={handleDirectVehicleCheckOut}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px', fontWeight: '700' }}
              >
                <LogOut size={18} /> {actionProcessing ? 'Processing Check-Out...' : 'CONFIRM VISITOR GATE CHECK-OUT'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Gate Control Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Panel 1: QR Pass Verification */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <QrCode size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>1. Verify Pass QR Token</h2>
          </div>

          <form onSubmit={handleVerifyPass}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                QR Token String
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Scan or paste QR pass token"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Vehicle License Plate (Optional Match)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. KA01AB1234"
                style={{ textTransform: 'uppercase' }}
                value={verifyPlate}
                onChange={(e) => setVerifyPlate(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={verifying} style={{ width: '100%', justifyContent: 'center' }}>
              <Search size={16} /> {verifying ? 'Verifying...' : 'Verify Cryptographic Pass'}
            </button>
          </form>

          {/* Verification Result Banner */}
          {verificationResult && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              borderRadius: '10px',
              background: verificationResult.status === 'AUTHORIZED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${verificationResult.status === 'AUTHORIZED' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>VERIFICATION STATUS</span>
                <StatusBadge status={verificationResult.status} />
              </div>
              <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '600' }}>
                {verificationResult.visitor_name ? `Visitor: ${verificationResult.visitor_name}` : verificationResult.reason || 'Verified'}
              </div>
              {verificationResult.license_plate && (
                <div style={{ fontSize: '13px', color: '#38bdf8', fontFamily: 'monospace', marginTop: '4px' }}>
                  Matched Plate: {verificationResult.license_plate}
                </div>
              )}

              {/* Quick Fill into Entry Form */}
              {verificationResult.status === 'AUTHORIZED' && (
                <button
                  type="button"
                  className="btn btn-success"
                  style={{ marginTop: '12px', width: '100%', justifyContent: 'center', fontSize: '13px' }}
                  onClick={() => {
                    setEntryToken(verifyToken);
                    if (verificationResult.license_plate) setEntryPlate(verificationResult.license_plate);
                  }}
                >
                  Auto-fill into Gate Entry Form
                </button>
              )}
            </div>
          )}
        </div>

        {/* Panel 2: Gate Entry Recorder */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <LogIn size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>2. Record Gate Entry</h2>
          </div>

          <form onSubmit={handleRecordEntry}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Verified QR Pass Token *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Pass QR Token"
                value={entryToken}
                onChange={(e) => setEntryToken(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Vehicle License Plate
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. KA01AB1234"
                style={{ textTransform: 'uppercase' }}
                value={entryPlate}
                onChange={(e) => setEntryPlate(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Gate Terminal
              </label>
              <select
                className="input-field"
                value={entryGate}
                onChange={(e) => setEntryGate(e.target.value)}
              >
                <option value="MAIN_GATE">Main Gate (North)</option>
                <option value="SOUTH_GATE">South Gate</option>
                <option value="VISITOR_GATE">Visitor Gate</option>
              </select>
            </div>

            <button type="submit" className="btn btn-success" disabled={submittingEntry} style={{ width: '100%', justifyContent: 'center' }}>
              <LogIn size={16} /> {submittingEntry ? 'Recording...' : 'Confirm Visitor Gate Entry'}
            </button>
          </form>
        </div>

        {/* Panel 3: Gate Exit Recorder */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <LogOut size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>3. Record Gate Exit</h2>
          </div>

          <form onSubmit={handleRecordExit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Exiting Vehicle License Plate *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. KA01AB1234"
                style={{ textTransform: 'uppercase' }}
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Gate Terminal
              </label>
              <select
                className="input-field"
                value={exitGate}
                onChange={(e) => setExitGate(e.target.value)}
              >
                <option value="MAIN_GATE">Main Gate (North)</option>
                <option value="SOUTH_GATE">South Gate</option>
              </select>
            </div>

            <button type="submit" className="btn btn-danger" disabled={submittingExit} style={{ width: '100%', justifyContent: 'center', marginTop: '48px' }}>
              <LogOut size={16} /> {submittingExit ? 'Recording...' : 'Confirm Gate Exit'}
            </button>
          </form>
        </div>

      </div>

      {/* Active On-Site Visitors Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Active On-Site Visitors</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Real-time gate log</span>
        </div>

        {activeVisitors.length === 0 ? (
          <EmptyState
            title="No Active On-Site Visitors"
            description="All entered vehicles and visitors have exited the compound."
            icon={Users}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Vehicle ID / Plate</th>
                  <th>Pass ID</th>
                  <th>Entry Timestamp</th>
                  <th>Gate</th>
                  <th>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {activeVisitors.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: '600', color: '#94a3b8' }}>#{rec.id}</td>
                    <td style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: '600' }}>
                      Vehicle #{rec.vehicle_id}
                    </td>
                    <td>Pass #{rec.access_pass_id || 'N/A'}</td>
                    <td>{new Date(rec.timestamp).toLocaleString()}</td>
                    <td>{rec.gate || 'MAIN_GATE'}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => {
                          setExitPlate(`VEH-${rec.vehicle_id}`);
                        }}
                      >
                        Quick Exit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
