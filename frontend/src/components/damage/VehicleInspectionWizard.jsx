import React, { useState } from "react";
import { Camera, CheckCircle2, ChevronRight, ChevronLeft, AlertTriangle, ShieldCheck, RefreshCw, Sparkles } from "lucide-react";
import CameraCaptureModal from "./CameraCaptureModal";
import api from "../../api/client";

const REQUIRED_VIEWS = ["FRONT", "LEFT", "RIGHT", "REAR"];

export default function VehicleInspectionWizard({
  vehicleId,
  parkingAssignmentId = null,
  stage = "BEFORE", // "BEFORE" or "AFTER"
  onInspectionComplete,
  onCancel,
}) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [inspectionId, setInspectionId] = useState(null);
  const [capturedViews, setCapturedViews] = useState({});
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentView = REQUIRED_VIEWS[activeStepIndex];
  const currentViewData = capturedViews[currentView];

  const initializeInspectionIfNeeded = async () => {
    if (inspectionId) return inspectionId;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/damage/inspections", {
        vehicle_id: parseInt(vehicleId),
        stage: stage,
        parking_assignment_id: parkingAssignmentId ? parseInt(parkingAssignmentId) : null,
      });
      setInspectionId(res.data.id);
      setLoading(false);
      return res.data.id;
    } catch (err) {
      console.error("Failed to initialize inspection:", err);
      setError(err.response?.data?.detail || "Failed to start vehicle inspection session.");
      setLoading(false);
      return null;
    }
  };

  const handleOpenCaptureModal = async () => {
    const id = await initializeInspectionIfNeeded();
    if (id) {
      setIsCameraOpen(true);
    }
  };

  const handleCaptureConfirm = async (blob, previewUrl) => {
    if (!inspectionId) return;

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("view", currentView);
      formData.append("image", blob, `inspection_${currentView.toLowerCase()}.png`);

      const res = await api.post(`/damage/inspections/${inspectionId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imgData = res.data;
      setCapturedViews((prev) => ({
        ...prev,
        [currentView]: {
          id: imgData.id,
          fileUrl: imgData.file_url || previewUrl,
          previewUrl: previewUrl,
          detections: imgData.detections || [],
        },
      }));
      setLoading(false);
    } catch (err) {
      console.error("Failed to upload view image:", err);
      setError(err.response?.data?.detail || "Failed to upload and analyze image for " + currentView);
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (activeStepIndex < REQUIRED_VIEWS.length - 1) {
      setActiveStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex((prev) => prev - 1);
    }
  };

  const handleCompleteInspection = async () => {
    if (!inspectionId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/damage/inspections/${inspectionId}/complete`);
      setLoading(false);
      if (onInspectionComplete) {
        onInspectionComplete(res.data);
      }
    } catch (err) {
      console.error("Failed to complete inspection:", err);
      setError(err.response?.data?.detail || "Please ensure all 4 vehicle views are captured.");
      setLoading(false);
    }
  };

  const isAllViewsCaptured = REQUIRED_VIEWS.every((v) => !!capturedViews[v]);

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                stage === "BEFORE"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
              }`}
            >
              {stage} PARKING INSPECTION
            </span>
            <span className="text-slate-400 text-sm">• 4-View Standard Protocol</span>
          </div>
          <h2 className="text-xl font-bold text-white">Vehicle Damage Inspection</h2>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="self-start sm:self-auto text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            Cancel Inspection
          </button>
        )}
      </div>

      {/* Progress Step Bar */}
      <div className="grid grid-cols-4 gap-2">
        {REQUIRED_VIEWS.map((view, idx) => {
          const isCaptured = !!capturedViews[view];
          const isActive = idx === activeStepIndex;

          return (
            <button
              key={view}
              onClick={() => setActiveStepIndex(idx)}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                isActive
                  ? "bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10"
                  : isCaptured
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span>STEP {idx + 1}</span>
                {isCaptured ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="text-[10px] opacity-75">{isActive ? "ACTIVE" : "PENDING"}</span>
                )}
              </div>
              <div className="text-sm font-bold uppercase">{view}</div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main View Capture & Preview Workspace */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden">
        {currentViewData ? (
          <div className="w-full space-y-4">
            <div className="relative w-full max-h-[380px] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
              <img
                src={currentViewData.fileUrl || currentViewData.previewUrl}
                alt={`${currentView} View`}
                className="max-h-[380px] w-auto object-contain"
              />

              {/* Bounding Box Bounding Overlay */}
              {currentViewData.detections?.map((det, idx) => {
                const [x1, y1, x2, y2] = det.bbox || [0, 0, 0, 0];
                return (
                  <div
                    key={idx}
                    className="absolute border-2 border-amber-400 bg-amber-400/20 rounded pointer-events-none"
                    style={{
                      left: `${x1 * 100}%`,
                      top: `${y1 * 100}%`,
                      width: `${(x2 - x1) * 100}%`,
                      height: `${(y2 - y1) * 100}%`,
                    }}
                  >
                    <span className="absolute -top-6 left-0 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow">
                      {det.damage_type} ({Math.round(det.confidence * 100)}%)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Detections Summary */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-200">AI Damage Inference:</span>
                {currentViewData.detections && currentViewData.detections.length > 0 ? (
                  <span className="text-amber-400 font-bold">
                    {currentViewData.detections.length} visible damage finding(s) detected
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">No visible damage detected on {currentView} view</span>
                )}
              </div>

              <button
                onClick={handleOpenCaptureModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake {currentView}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Capture {currentView} View</h3>
              <p className="text-slate-400 text-xs">
                Position the camera to clearly capture the full <span className="text-cyan-400 font-semibold">{currentView}</span> side of the vehicle.
              </p>
            </div>
            <button
              onClick={handleOpenCaptureModal}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-cyan-500/20"
            >
              <Camera className="w-4 h-4" />
              Open Camera & Capture {currentView}
            </button>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handlePrevStep}
          disabled={activeStepIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-medium text-sm transition border border-slate-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous View
        </button>

        {activeStepIndex < REQUIRED_VIEWS.length - 1 ? (
          <button
            onClick={handleNextStep}
            disabled={!currentViewData}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-sm transition"
          >
            Continue to {REQUIRED_VIEWS[activeStepIndex + 1]}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCompleteInspection}
            disabled={!isAllViewsCaptured || loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/25"
          >
            <ShieldCheck className="w-4 h-4" />
            Complete 4-View Baseline Inspection
          </button>
        )}
      </div>

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureConfirm}
        viewLabel={currentView}
      />
    </div>
  );
}
