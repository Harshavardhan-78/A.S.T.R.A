import React, { useState, useRef, useEffect } from 'react';
import api from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import VehicleInspectionWizard from '../../components/damage/VehicleInspectionWizard';
import InspectionComparisonView from '../../components/damage/InspectionComparisonView';
import { Cpu, FileText, Camera, ShieldAlert, AlertCircle, CheckCircle, Upload, Video, VideoOff, RefreshCw, Layers } from 'lucide-react';

export default function AIUtilitiesView() {
  const [activeTab, setActiveTab] = useState('lpr'); // 'lpr' | 'ocr' | 'damage' | 'inspection'

  // LPR State
  const [lprInputMode, setLprInputMode] = useState('camera');
  const [lprFile, setLprFile] = useState(null);
  const [lprResult, setLprResult] = useState(null);
  const [lprLoading, setLprLoading] = useState(false);
  const [lprError, setLprError] = useState(null);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraState, setCameraState] = useState('inactive');
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // OCR State
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState(null);

  // Single Image AI Damage Analysis State
  const [singleImgFile, setSingleImgFile] = useState(null);
  const [singleImgResult, setSingleImgResult] = useState(null);
  const [singleImgLoading, setSingleImgLoading] = useState(false);
  const [singleImgError, setSingleImgError] = useState(null);

  // 4-View Vehicle Inspection State
  const [inspectionVehicleId, setInspectionVehicleId] = useState("1");
  const [inspectionStage, setInspectionStage] = useState("BEFORE");
  const [activeInspectionSession, setActiveInspectionSession] = useState(null);
  const [beforeInspectionId, setBeforeInspectionId] = useState("");
  const [afterInspectionId, setAfterInspectionId] = useState("");
  const [comparisonData, setComparisonData] = useState(null);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [cmpError, setCmpError] = useState(null);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraState('inactive');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'lpr' || lprInputMode !== 'camera') {
      stopCamera();
    }
  }, [activeTab, lprInputMode]);

  const startCamera = async () => {
    setCameraError(null);
    setLprError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Device camera API is not supported in this browser.');
      setCameraState('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraState('active');
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please grant permission in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.';
      }
      setCameraError(msg);
      setCameraState('error');
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !cameraActive) return;
    setCameraError(null);
    setLprError(null);
    setCameraState('capturing');

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    setCameraState('analyzing');
    setLprLoading(true);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCameraError('Frame capture failed.');
        setCameraState('error');
        setLprLoading(false);
        return;
      }

      const file = new File([blob], 'lpr_frame.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.post('/lpr/recognize', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setLprResult(res.data);
        if (res.data.detected_plate || res.data.license_plate) {
          setCameraState('plate_detected');
        } else {
          setCameraState('plate_not_detected');
        }
      } catch (err) {
        setLprError(err.response?.data?.detail || 'LPR analysis request failed.');
        setCameraState('error');
      } finally {
        setLprLoading(false);
      }
    }, 'image/jpeg', 0.92);
  };

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
      if (res.data.detected_plate || res.data.license_plate) {
        setCameraState('plate_detected');
      } else {
        setCameraState('plate_not_detected');
      }
    } catch (err) {
      setLprError(err.response?.data?.detail || 'License Plate Recognition request failed.');
      setCameraState('error');
    } finally {
      setLprLoading(false);
    }
  };

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

  const handleSingleImageDamageSubmit = async (e) => {
    e.preventDefault();
    if (!singleImgFile) return;
    setSingleImgLoading(true);
    setSingleImgResult(null);
    setSingleImgError(null);

    const formData = new FormData();
    formData.append('image', singleImgFile);

    try {
      const res = await api.post('/damage/analyze-single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSingleImgResult(res.data);
    } catch (err) {
      setSingleImgError(err.response?.data?.detail || 'Single image AI damage detection failed.');
    } finally {
      setSingleImgLoading(false);
    }
  };

  const handleRunComparison = async () => {
    if (!beforeInspectionId || !afterInspectionId) return;
    setCmpLoading(true);
    setCmpError(null);
    setComparisonData(null);
    try {
      const res = await api.post(`/damage/compare/${beforeInspectionId}/${afterInspectionId}`);
      setComparisonData(res.data);
    } catch (err) {
      setCmpError(err.response?.data?.detail || "Failed to compare BEFORE and AFTER inspections.");
    } finally {
      setCmpLoading(false);
    }
  };

  const renderLprAuthStatus = () => {
    if (!lprResult) return null;
    const detected = lprResult.detected_plate || lprResult.license_plate;
    const authStatus = lprResult.authorization_status;

    if (!detected || authStatus === 'NOT_VERIFIED') {
      return <StatusBadge status="NOT_VERIFIED" />;
    }

    if (authStatus === 'AUTHORIZED' || authStatus === 'SUCCESS') {
      return <StatusBadge status="AUTHORIZED" />;
    }

    return <StatusBadge status={authStatus || 'UNAUTHORIZED'} />;
  };

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
          <Cpu size={14} /> AI Computer Vision Suite
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Automatic Recognition & AI Utilities</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Real backend computer vision endpoints for LPR license plate detection, ID document OCR, deep learning vehicle damage detection, and 4-view BEFORE/AFTER inspection comparisons.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', flexWrap: 'wrap' }}>
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
          className={`btn ${activeTab === 'inspection' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('inspection')}
        >
          <Layers size={16} /> 4-View Vehicle Damage Inspection System
        </button>
        <button
          className={`btn ${activeTab === 'damage' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('damage')}
        >
          <ShieldAlert size={16} /> Single Image AI Damage Analysis
        </button>
      </div>

      {/* TAB 1: LPR */}
      {activeTab === 'lpr' && (
        <div className="card" style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>
                Automatic License Plate Recognition (LPR)
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                Use direct device camera preview or upload an image file for automatic plate recognition.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                type="button"
                className={`btn ${lprInputMode === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => setLprInputMode('camera')}
              >
                <Video size={14} /> Live Camera Access
              </button>
              <button
                type="button"
                className={`btn ${lprInputMode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => {
                  stopCamera();
                  setLprInputMode('upload');
                }}
              >
                <Upload size={14} /> Upload Image Instead
              </button>
            </div>
          </div>

          {(cameraError || lprError) && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', marginBottom: '16px', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{cameraError || lprError}</span>
            </div>
          )}

          {lprInputMode === 'camera' && (
            <div>
              <div style={{
                position: 'relative',
                width: '100%',
                height: '320px',
                background: '#090d16',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: cameraActive ? 'block' : 'none'
                  }}
                />

                {!cameraActive && (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                    <Camera size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>Camera is Inactive</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Click "Start Camera" to activate live feed preview</p>
                  </div>
                )}

                {cameraActive && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(4px)',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    CAMERA ACTIVE
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {!cameraActive ? (
                  <button type="button" className="btn btn-primary" onClick={startCamera}>
                    <Video size={16} /> Start Camera
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={captureAndAnalyze}
                      disabled={lprLoading}
                    >
                      <Camera size={16} /> {lprLoading ? 'Analyzing...' : 'Capture & Analyze'}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={stopCamera}>
                      <VideoOff size={16} /> Stop Camera
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {lprInputMode === 'upload' && (
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
          )}

          {lprResult && (
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#38bdf8', marginBottom: '12px' }}>LPR Analysis Output</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Recognized Plate</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: '700', color: lprResult.detected_plate || lprResult.license_plate ? '#f8fafc' : '#fbbf24' }}>
                    {lprResult.detected_plate || lprResult.license_plate || 'NOT DETECTED'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Authorization Status</span>
                  {renderLprAuthStatus()}
                </div>
                {lprResult.owner && (
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Registered Owner</span>
                    <strong style={{ color: '#38bdf8' }}>{lprResult.owner}</strong>
                  </div>
                )}
                {lprResult.vehicle && (
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Vehicle Info</span>
                    <span style={{ color: '#cbd5e1' }}>{lprResult.vehicle.make} {lprResult.vehicle.model} ({lprResult.vehicle.color})</span>
                  </div>
                )}
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
              <pre style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0', whiteSpace: 'pre-wrap', background: '#090d16', padding: '12px', borderRadius: '6px' }}>
                {JSON.stringify(ocrResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 4-VIEW VEHICLE DAMAGE INSPECTION SYSTEM */}
      {activeTab === 'inspection' && (
        <div className="space-y-6">
          {/* Launch Controls */}
          {!activeInspectionSession ? (
            <div className="card space-y-4" style={{ maxWidth: '720px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>
                  Standardized 4-View Vehicle Inspection & Comparison
                </h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                  Conduct standardized FRONT, LEFT, RIGHT, and REAR vehicle inspections for BEFORE parking baseline and AFTER retrieval stages.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5 font-medium">Vehicle ID *</label>
                  <input
                    type="number"
                    value={inspectionVehicleId}
                    onChange={(e) => setInspectionVehicleId(e.target.value)}
                    className="input-field"
                    placeholder="Enter Vehicle ID (e.g. 1)"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1.5 font-medium">Inspection Stage *</label>
                  <select
                    value={inspectionStage}
                    onChange={(e) => setInspectionStage(e.target.value)}
                    className="input-field"
                  >
                    <option value="BEFORE">BEFORE Parking (Baseline)</option>
                    <option value="AFTER">AFTER Retrieval (Exit)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setActiveInspectionSession(true)}
                className="btn btn-primary"
              >
                <Camera size={16} /> Start 4-View Inspection Session
              </button>

              {/* Compare Existing Inspections Panel */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-cyan-400" />
                  Compare BEFORE vs AFTER Inspection Records
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      placeholder="BEFORE Inspection ID"
                      value={beforeInspectionId}
                      onChange={(e) => setBeforeInspectionId(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="AFTER Inspection ID"
                      value={afterInspectionId}
                      onChange={(e) => setAfterInspectionId(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                {cmpError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {cmpError}
                  </div>
                )}

                <button
                  onClick={handleRunComparison}
                  disabled={cmpLoading || !beforeInspectionId || !afterInspectionId}
                  className="btn btn-secondary"
                >
                  {cmpLoading ? "Running Comparison..." : "Run BEFORE/AFTER Comparison Engine"}
                </button>
              </div>
            </div>
          ) : (
            <VehicleInspectionWizard
              vehicleId={inspectionVehicleId}
              stage={inspectionStage}
              onInspectionComplete={(result) => {
                setActiveInspectionSession(false);
                if (inspectionStage === "BEFORE") {
                  setBeforeInspectionId(result.id.toString());
                } else {
                  setAfterInspectionId(result.id.toString());
                }
              }}
              onCancel={() => setActiveInspectionSession(false)}
            />
          )}

          {/* Comparison Output View */}
          {comparisonData && (
            <InspectionComparisonView
              comparisonResult={comparisonData}
              onClose={() => setComparisonData(null)}
            />
          )}
        </div>
      )}

      {/* TAB 4: SINGLE IMAGE AI DAMAGE ANALYSIS */}
      {activeTab === 'damage' && (
        <div className="card" style={{ maxWidth: '640px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '14px' }}>
            Single Image Deep Learning Damage Detection
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
            Upload a single vehicle image to run local YOLO inference and detect visible damage classes (scratch, dent, crack, glass shatter, lamp broken, flat tire).
          </p>

          {singleImgError && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', marginBottom: '16px', fontSize: '13px' }}>
              {singleImgError}
            </div>
          )}

          <form onSubmit={handleSingleImageDamageSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Vehicle Image File *</label>
              <input
                type="file"
                className="input-field"
                accept="image/*"
                onChange={(e) => setSingleImgFile(e.target.files[0] || null)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={singleImgLoading}>
              <Upload size={16} /> {singleImgLoading ? 'Analyzing Image...' : 'Run DL Damage Inference'}
            </button>
          </form>

          {singleImgResult && (
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#fbbf24', marginBottom: '10px' }}>DL Inference Result</h3>
              <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                Detected: {singleImgResult.detected ? "Visible Damage Detected" : "No Visible Damage Detected"} (Device: {singleImgResult.device})
              </div>
              <pre style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0', whiteSpace: 'pre-wrap', background: '#090d16', padding: '12px', borderRadius: '6px' }}>
                {JSON.stringify(singleImgResult.detections, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
