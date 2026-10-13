"use client";

import React, { useEffect, useState } from "react";
import { WebSocketConnectionState, CycleQuality } from "@/lib/types";
import { Activity, ShieldAlert, CheckCircle2, Wifi, WifiOff, RefreshCw, KeyRound } from "lucide-react";

interface HeaderTelemetryBarProps {
  wsStatus: WebSocketConnectionState;
  syncQuality?: CycleQuality;
  universeSize?: number;
  onRefresh?: () => void;
}

interface BrokerHealth {
  valid: boolean;
  seconds_remaining: number;
  expires_at_utc: string | null;
}

export function HeaderTelemetryBar({
  wsStatus,
  syncQuality = "ACCEPTED",
  universeSize = 213,
  onRefresh,
}: HeaderTelemetryBarProps) {
  const [brokerHealth, setBrokerHealth] = useState<BrokerHealth | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then((res) => res.json())
      .then((d) => {
        if (d.broker_auth) {
          setBrokerHealth(d.broker_auth);
        }
      })
      .catch((e) => console.warn("Failed to fetch broker health:", e));
  }, []);

  const formatDaysRemaining = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    return days > 0 ? `${days}d` : `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <header className="flex flex-wrap items-center justify-between border-b border-[#1E293B] pb-3 mb-4 gap-3">
      {/* Brand & Market Scope Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#111622] border border-[#1E293B] flex items-center justify-center font-bold text-sm text-[#38BDF8] shadow-inner">
          OB
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide flex items-center gap-2 text-[#F8FAFC]">
            ORDERBLOCK TERMINAL
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A2234] text-[#94A3B8] border border-[#1E293B]">
              PROD · v1.0.0
            </span>
          </h1>
          <div className="text-[11px] text-[#94A3B8] font-mono flex items-center gap-1.5">
            <span>NSE F&O Underlyings ({universeSize} Contracts)</span>
            <span>·</span>
            <span>50-Session Rolling Baseline</span>
          </div>
        </div>
      </div>

      {/* Real-Time Telemetry Badges */}
      <div className="flex items-center gap-2.5 font-mono text-xs">
        {/* WebSocket Connection Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#111622] border border-[#1E293B] shadow-sm">
          {wsStatus === "LIVE" ? (
            <Wifi className="w-3.5 h-3.5 text-[#10B981] animate-pulse" />
          ) : wsStatus === "STALE" ? (
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-[#EF4444]" />
          )}
          <span
            className={`text-[11px] font-semibold ${
              wsStatus === "LIVE"
                ? "text-[#10B981]"
                : wsStatus === "STALE"
                ? "text-amber-400"
                : "text-[#EF4444]"
            }`}
          >
            {wsStatus === "LIVE" ? "STREAM LIVE" : wsStatus}
          </span>
        </div>

        {/* Sync Quality Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111622] border border-[#1E293B] text-[#94A3B8]">
          <span className="text-[10px] text-[#64748B]">SYNC:</span>
          <span
            className={`font-bold text-[11px] flex items-center gap-1 ${
              syncQuality === "ACCEPTED"
                ? "text-[#10B981]"
                : syncQuality === "DEGRADED"
                ? "text-amber-400"
                : "text-[#EF4444]"
            }`}
          >
            {syncQuality === "ACCEPTED" ? (
              <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
            ) : (
              <ShieldAlert className="w-3 h-3 text-amber-400" />
            )}
            {syncQuality}
          </span>
        </div>

        {/* Upstox Auth Status Pill */}
        {brokerHealth && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111622] border border-[#1E293B] text-[#94A3B8]">
            <KeyRound className="w-3 h-3 text-[#38BDF8]" />
            <span className="text-[10px] text-[#64748B]">AUTH:</span>
            <span className="text-[#38BDF8] font-bold text-[11px]">
              {brokerHealth.valid ? `VALID (${formatDaysRemaining(brokerHealth.seconds_remaining)})` : "EXPIRED"}
            </span>
          </div>
        )}

        {/* Refresh Action Trigger */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Force refresh snapshot"
            className="p-1.5 rounded-md bg-[#111622] border border-[#1E293B] hover:bg-[#1A2234] text-[#94A3B8] hover:text-[#F8FAFC] active:scale-[0.96] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}
