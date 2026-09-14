import React, { useState } from 'react';
import api from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Cpu, FileText, Camera, ShieldAlert, AlertCircle, CheckCircle, Upload } from 'lucide-react';

export default function AIUtilitiesView() {
  const [activeTab, setActiveTab] = useState('lpr'); // 'lpr' | 'ocr' | 'damage'

  // LPR State
  const [lprFile, setLprFile] = useState(null);
  const [lprResult, setLprResult] = useState(null);
  const [lprLoading, setLprLoading] = useState(false);
  const [lprError, setLprError] = useState(null);

  // OCR State
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState(null);

  // Damage State
  const [entryImg, setEntryImg] = useState(null);
  const [exitImg, setExitImg] = useState(null);
  const [damageResult, setDamageResult] = useState(null);
  const [damageLoading, setDamageLoading] = useState(false);
  const [damageError, setDamageError] = useState(null);

  // 1. Run LPR
  const handleLprSubmit = async (e) => {
    e.preventDefault();
    if (!lprFile) return;
    setLprLoading(true);
    setLprResult(null);
    setLprError(null);

    const formData = new FormData();
    formData.append('file', lprFile);

    try {
      const res = await api.post('/lpr/recognize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLprResult(res.data);
    } catch (err) {
      setLprError(err.response?.data?.detail || 'License Plate Recognition request failed.');
    } finally {
      setLprLoading(false);
    }
  };

  // 2. Run OCR
  const handleOcrSubmit = async (e) => {
    e.preventDefault();
    if (!ocrFile) return;
    setOcrLoading(true);
    setOcrResult(null);
    setOcrError(null);

    const formData = new FormData();
    formData.append('file', ocrFile);

    try {
      const res = await api.post('/ocr/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setOcrResult(res.data);
    } catch (err) {
      setOcrError(err.response?.data?.detail || 'OCR document processing failed.');
    } finally {
      setOcrLoading(false);
    }
  };

  // 3. Run Damage Detection
  const handleDamageSubmit = async (e) => {
    e.preventDefault();
    if (!entryImg || !exitImg) return;
    setDamageLoading(true);
    setDamageResult(null);
    setDamageError(null);

    const formData = new FormData();
    formData.append('entry_image', entryImg);
    formData.append('exit_image', exitImg);

    try {
      const res = await api.post('/damage/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDamageResult(res.data);
    } catch (err) {
      setDamageError(err.response?.data?.detail || 'Damage analysis request failed.');
    } finally {
      setDamageLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
          <Cpu size={14} /> AI Computer Vision Suite
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Automatic Recognition & AI Utilities</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Real backend computer vision endpoints for LPR license plate detection, ID document OCR, and valet damage differential analysis.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
        <button
          className={`btn ${activeTab === 'lpr' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('lpr')}
        >
          <Camera size={16} /> LPR License Plate Recognition
        </button>
        <button
          className={`btn ${activeTab === 'ocr' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('ocr')}
        >
          <FileText size={16} /> ID Document OCR
        </button>
        <button
          className={`btn ${activeTab === 'damage' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('damage')}
        >
          <ShieldAlert size={16} /> Damage Differential Analysis (MVP)
        </button>
      </div>

      {/* TAB 1: LPR */}
      {activeTab === 'lpr' && (
        <div className="card" style={{ maxWidth: '640px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '14px' }}>
            Automatic License Plate Recognition (LPR)
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            Upload a vehicle image to run automatic plate character segmentation and database verification.
          </p>

          {lprError && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', marginBottom: '16px', fontSize: '13px' }}>
              {lprError}
            </div>
          )}

          <form onSubmit={handleLprSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Vehicle Image File *</label>
              <input
                type="file"
                className="input-field"
                accept="image/*"
                onChange={(e) => setLprFile(e.target.files[0] || null)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={lprLoading}>
              <Upload size={16} /> {lprLoading ? 'Processing LPR...' : 'Run LPR Recognition'}
            </button>
          </form>

          {lprResult && (
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#38bdf8', marginBottom: '10px' }}>LPR Analysis Output</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Recognized Plate</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                    {lprResult.license_plate || 'NOT DETECTED'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Authorization Status</span>
                  <StatusBadge status={lprResult.status || 'UNAUTHORIZED'} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OCR */}
      {activeTab === 'ocr' && (
        <div className="card" style={{ maxWidth: '640px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '14px' }}>
            ID Document Optical Character Recognition (OCR)
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            Extract text, document IDs, and visitor metadata from scanned identity cards.
          </p>

          {ocrError && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', marginBottom: '16px', fontSize: '13px' }}>
              {ocrError}
            </div>
          )}

          <form onSubmit={handleOcrSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Scanned Document Image *</label>
              <input
                type="file"
                className="input-field"
                accept="image/*"
                onChange={(e) => setOcrFile(e.target.files[0] || null)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={ocrLoading}>
              <Upload size={16} /> {ocrLoading ? 'Running OCR...' : 'Process Document OCR'}
            </button>
          </form>

          {ocrResult && (
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#c084fc', marginBottom: '10px' }}>OCR Extracted Output</h3>
              
              {/* Fallback Check */}
              {ocrResult.status === 'analysis_unavailable' ? (
                <div style={{ color: '#fbbf24', fontSize: '13px', padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
                  Analysis unavailable — dependency or OCR engine offline. Fallback state rendered.
                </div>
              ) : (
                <pre style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0', whiteSpace: 'pre-wrap', background: '#090d16', padding: '12px', borderRadius: '6px' }}>
                  {JSON.stringify(ocrResult, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DAMAGE DETECTION */}
      {activeTab === 'damage' && (
        <div className="card" style={{ maxWidth: '680px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '14px' }}>
            Valet Damage Differential Analysis (MVP)
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            Compare entry vs exit vehicle images to detect pre-existing vs new structural body damage.
          </p>

          {damageError && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', marginBottom: '16px', fontSize: '13px' }}>
              {damageError}
            </div>
          )}

          <form onSubmit={handleDamageSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Entry Image *</label>
                <input
                  type="file"
                  className="input-field"
                  accept="image/*"
                  onChange={(e) => setEntryImg(e.target.files[0] || null)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Exit Image *</label>
                <input
                  type="file"
                  className="input-field"
                  accept="image/*"
                  onChange={(e) => setExitImg(e.target.files[0] || null)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={damageLoading}>
              <Upload size={16} /> {damageLoading ? 'Analyzing Images...' : 'Run Differential Analysis'}
            </button>
          </form>

          {damageResult && (
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#fbbf24', marginBottom: '10px' }}>Damage Comparison Result</h3>
              <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '600' }}>
                Status: {damageResult.result || damageResult.status || 'Analysis Complete'}
              </div>
              {damageResult.notes && (
                <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px' }}>
                  {damageResult.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
