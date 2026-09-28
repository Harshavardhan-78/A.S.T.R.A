import React, { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, Upload, X, Check } from "lucide-react";

export default function CameraCaptureModal({ isOpen, onClose, onCapture, viewLabel = "FRONT" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    if (isOpen && !capturedPreview) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn("Camera access failed or unavailable:", err);
      setCameraError("Camera access unavailable. You can upload an image file instead.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const handleCaptureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedPreview(url);
        stopCamera();
      }
    }, "image/png");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedBlob(file);
      const url = URL.createObjectURL(file);
      setCapturedPreview(url);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
      setCapturedPreview(null);
    }
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedBlob) {
      onCapture(capturedBlob, capturedPreview);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedBlob(null);
    setCapturedPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">
              Vehicle Inspection View: <span className="text-cyan-400 font-bold uppercase">{viewLabel}</span>
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera / Preview Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] max-h-[500px]">
          {capturedPreview ? (
            <img src={capturedPreview} alt={`Captured ${viewLabel}`} className="w-full h-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${!isCameraActive ? "hidden" : ""}`}
              />
              {!isCameraActive && (
                <div className="text-center p-6 max-w-md">
                  <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 text-sm mb-4">
                    {cameraError || "Initializing camera stream..."}
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm cursor-pointer transition shadow-lg shadow-cyan-900/30">
                    <Upload className="w-4 h-4" />
                    Upload Image File Instead
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          {!capturedPreview ? (
            <>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium cursor-pointer transition border border-slate-700">
                <Upload className="w-4 h-4 text-cyan-400" />
                Upload File
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              {isCameraActive && (
                <button
                  onClick={handleCaptureFrame}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-cyan-500/25"
                >
                  <Camera className="w-4 h-4" />
                  Capture {viewLabel} View
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleRetake}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition border border-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
                Retake
              </button>

              <button
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-emerald-500/25"
              >
                <Check className="w-4 h-4" />
                Confirm & Process View
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
