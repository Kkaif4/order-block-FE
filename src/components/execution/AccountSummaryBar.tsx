"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AccountSummary } from "@/lib/types";
import { Wallet, ShieldAlert, Power, Layers, RefreshCw } from "lucide-react";

interface AccountSummaryBarProps {
  onOpenPositions?: () => void;
  onKillSwitchTriggered?: () => void;
}

import { api } from "@/lib/api";
import { isIndianMarketHours } from "@/lib/timeUtils";

export function AccountSummaryBar({
  onOpenPositions,
  onKillSwitchTriggered,
}: AccountSummaryBarProps) {
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showKillConfirm, setShowKillConfirm] = useState(false);

  const fetchAccount = useCallback(() => {
    api.getAccountSummary()
      .then((d) => {
        if (d?.data) {
          setAccount(d.data);
        }
      })
      .catch((e) => console.warn("Failed to fetch account summary:", e));
  }, []);

  useEffect(() => {
    fetchAccount();

    // Do NOT poll outside Indian market hours to preserve Render free-tier sleep
    if (!isIndianMarketHours()) {
      return;
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible" && isIndianMarketHours()) {
        fetchAccount();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchAccount]);

  const handleKillSwitch = async () => {
    setLoading(true);
    try {
      const res = await api.triggerKillSwitch();
      if (res.success) {
        setShowKillConfirm(false);
        fetchAccount();
        onKillSwitchTriggered?.();
      }
    } catch (e) {
      console.error("Kill switch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResetKillSwitch = async () => {
    try {
      await api.resetKillSwitch();
      fetchAccount();
    } catch (e) {
      console.error("Reset failed:", e);
    }
  };

  const isPositivePnl = (account?.unrealized_pnl ?? 0) >= 0;
  const equity = account?.equity ?? 500000;
  const margin = account?.available_margin ?? 500000;
  const pnl = account?.unrealized_pnl ?? 0;
  const dailyLoss = account?.realized_daily_loss ?? 0;
  const posCount = account?.open_positions_count ?? 0;
  const isKillActive = account?.kill_switch_active ?? false;

  return (
    <>
      <div className="w-full bg-[#111622] border border-[#1E293B] rounded-lg p-2.5 mb-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-sm">
        {/* Left: Account Tickers */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-[#1A2234] text-[#38BDF8]">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[#64748B] text-[10px] block">EQUITY</span>
              <span className="text-[#F8FAFC] font-bold">
                ₹{equity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="border-l border-[#1E293B] pl-3">
            <span className="text-[#64748B] text-[10px] block">AVAILABLE MARGIN</span>
            <span className="text-[#94A3B8]">
              ₹{margin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="border-l border-[#1E293B] pl-3">
            <span className="text-[#64748B] text-[10px] block">UNREALIZED P&L</span>
            <span
              className={`font-bold ${
                isPositivePnl ? "text-[#10B981]" : "text-[#EF4444]"
              }`}
            >
              {isPositivePnl ? `+₹${pnl.toFixed(2)}` : `-₹${Math.abs(pnl).toFixed(2)}`}
            </span>
          </div>

          <div className="border-l border-[#1E293B] pl-3">
            <span className="text-[#64748B] text-[10px] block">DAILY LOSS RECORD</span>
            <span className="text-amber-400">
              ₹{dailyLoss.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right: Positions Drawer Trigger & Emergency Kill-Switch */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPositions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A2234] hover:bg-[#243048] border border-[#38BDF8]/30 hover:border-[#38BDF8]/60 text-[#38BDF8] active:scale-[0.96] transition-all font-sans font-semibold shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Positions & Portfolio ({posCount})</span>
          </button>

          {isKillActive ? (
            <button
              onClick={handleResetKillSwitch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 active:scale-[0.96] transition-all font-sans font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Circuit Breaker</span>
            </button>
          ) : (
            <button
              onClick={() => setShowKillConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-[#EF4444] hover:bg-red-500/20 active:scale-[0.96] transition-all font-sans font-semibold"
            >
              <Power className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>KILL-SWITCH</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Kill Switch */}
      {showKillConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111622] border border-red-500/40 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3 text-[#EF4444]">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-base text-[#F8FAFC]">Emergency Kill-Switch</h3>
            </div>
            <p className="text-sm text-[#94A3B8] mb-4">
              Are you sure you want to engage the circuit breaker? This will immediately
              <strong className="text-[#EF4444]"> flatten all open positions</strong>, cancel pending orders, and halt further execution.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowKillConfirm(false)}
                className="px-4 py-2 rounded-lg bg-[#1A2234] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] active:scale-[0.98] transition-all text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={handleKillSwitch}
                className="px-4 py-2 rounded-lg bg-[#EF4444] text-white hover:bg-red-600 active:scale-[0.98] transition-all text-xs font-bold"
              >
                {loading ? "Engaging..." : "Confirm & Flatten All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
