import React, { useState } from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, FileText, ArrowRight, ShieldAlert, Layers } from "lucide-react";
import api from "../../api/client";

const VIEWS = ["FRONT", "LEFT", "RIGHT", "REAR"];

export default function InspectionComparisonView({
  comparisonResult,
  onCreateDisputeClick,
  onClose,
}) {
  const [selectedView, setSelectedView] = useState("FRONT");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeCreatedMsg, setDisputeCreatedMsg] = useState(null);

  if (!comparisonResult) return null;

  const { vehicle_id, summary, views = {}, findings = [] } = comparisonResult;
  const currentViewData = views[selectedView] || {};
  const currentViewFindings = currentViewData.findings || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case "NEW_DAMAGE":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            POTENTIAL NEW DAMAGE
          </span>
        );
      case "POSSIBLE_WORSENING":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            POSSIBLE WORSENING
          </span>
        );
      case "PRE_EXISTING":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            PRE-EXISTING BASELINE
          </span>
        );
      case "UNCERTAIN":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
            UNCERTAIN MATCH
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            NO CHANGE
          </span>
        );
    }
  };

  const handleQuickCreateDispute = async () => {
    if (onCreateDisputeClick) {
      onCreateDisputeClick(comparisonResult);
      return;
    }

    setDisputeLoading(true);
    try {
      const res = await api.post("/disputes", {
        vehicle_id: parseInt(vehicle_id),
        title: `Vehicle Damage Evidence Review: Vehicle #${vehicle_id}`,
        description: `Automated inspection summary: ${summary.message}. Findings: ${findings
          .map((f) => `[${f.view}] ${f.damage_type}: ${f.status}`)
          .join("; ")}`,
      });
      setDisputeCreatedMsg(`Dispute #${res.data.id} created successfully.`);
    } catch (err) {
      console.error("Failed to create dispute:", err);
    } finally {
      setDisputeLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider">
              BEFORE vs AFTER Comparison Engine
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Vehicle Inspection Evidence Analysis</h2>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Close Analysis
          </button>
        )}
      </div>

      {/* Summary Alert Banner (Neutral evidence wording) */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          summary?.new_damage_detected
            ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
        }`}
      >
        <div className="flex items-start gap-3">
          {summary?.new_damage_detected ? (
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-bold text-base text-white">{summary?.message}</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Comparison stats: {summary?.new_damage_count || 0} potential new damage,{" "}
              {summary?.pre_existing_damage_count || 0} pre-existing baseline,{" "}
              {summary?.possible_worsening_count || 0} possible worsening, {summary?.uncertain_count || 0} uncertain.
            </p>
          </div>
        </div>

        {summary?.new_damage_detected && (
          <button
            onClick={handleQuickCreateDispute}
            disabled={disputeLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition shadow-md shadow-amber-500/20"
          >
            <FileText className="w-4 h-4" />
            {disputeLoading ? "Creating..." : "Create Dispute with Evidence"}
          </button>
        )}
      </div>

      {disputeCreatedMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          {disputeCreatedMsg}
        </div>
      )}

      {/* View Selector Tabs */}
      <div className="grid grid-cols-4 gap-2">
        {VIEWS.map((view) => {
          const vData = views[view] || {};
          const hasNew = vData.has_new_damage;

          return (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                selectedView === view
                  ? "bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <span className="font-bold text-sm uppercase">{view}</span>
              {hasNew ? (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Side-by-Side Image Comparison Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BEFORE View */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>BEFORE Parking Baseline</span>
            <span className="text-cyan-400">{selectedView} View</span>
          </div>
          <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {currentViewData.before_image_url ? (
              <img
                src={currentViewData.before_image_url}
                alt={`BEFORE ${selectedView}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-slate-600 text-xs font-medium">No BEFORE image recorded</span>
            )}
          </div>
        </div>

        {/* AFTER View */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>AFTER Vehicle Retrieval</span>
            <span className="text-cyan-400">{selectedView} View</span>
          </div>
          <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {currentViewData.after_image_url ? (
              <img
                src={currentViewData.after_image_url}
                alt={`AFTER ${selectedView}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-slate-600 text-xs font-medium">No AFTER image recorded</span>
            )}
          </div>
        </div>
      </div>

      {/* Findings Breakdown for Selected View */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <h4 className="font-bold text-sm text-white flex items-center gap-2">
          <span>Inspection Findings for {selectedView} View</span>
          <span className="text-xs font-normal text-slate-400">({currentViewFindings.length} item(s))</span>
        </h4>

        {currentViewFindings.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
            No damage findings detected on {selectedView} view.
          </div>
        ) : (
          <div className="space-y-2.5">
            {currentViewFindings.map((finding, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase text-sm">{finding.damage_type}</span>
                    {getStatusBadge(finding.status)}
                  </div>
                  {finding.reason && <p className="text-slate-400">{finding.reason}</p>}
                </div>

                <div className="flex items-center gap-4 text-slate-300 font-medium shrink-0">
                  {finding.before_confidence !== null && (
                    <div>
                      <span className="text-slate-500 block text-[10px]">BEFORE CONF.</span>
                      <span>{Math.round(finding.before_confidence * 100)}%</span>
                    </div>
                  )}
                  {finding.after_confidence !== null && (
                    <div>
                      <span className="text-slate-500 block text-[10px]">AFTER CONF.</span>
                      <span>{Math.round(finding.after_confidence * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
