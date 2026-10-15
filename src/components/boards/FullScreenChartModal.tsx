"use client";

import React, { useEffect, useState } from "react";
import { TopPickCardOutput, Candle5m, SymbolAnalyticsResponse, ZoneState } from "@/lib/types";
import { PriceChart } from "../charts/PriceChart";
import {
  X,
  Crosshair,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldAlert,
  Target,
  CheckCircle2,
  Maximize2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatPositionTime, formatDuration, formatTimeAgo } from "@/lib/timeUtils";
import { apiClient } from "@/lib/api";

interface FullScreenChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  pick: TopPickCardOutput | null;
  candles?: Candle5m[];
  onTrade?: (pick: TopPickCardOutput) => void;
}

export const FullScreenChartModal: React.FC<FullScreenChartModalProps> = ({
  isOpen,
  onClose,
  pick,
  candles = [],
  onTrade,
}) => {
  const [analytics, setAnalytics] = useState<SymbolAnalyticsResponse | null>(null);

  useEffect(() => {
    if (!isOpen || !pick?.symbol) return;

    let isMounted = true;
    apiClient
      .getSymbolAnalytics(pick.symbol)
      .then((data) => {
        if (isMounted) setAnalytics(data);
      })
      .catch((err) => {
        console.warn("Failed to load symbol analytics:", err);
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener("keydown", handleKeyDown);
      setAnalytics(null);
    };
  }, [isOpen, pick?.symbol, onClose]);

  if (!isOpen || !pick) return null;

  const isBull = pick.board === "BULLISH";

  // Strict mathematical directional levels:
  // For Bullish: Stop Loss is below price, Target is above price
  // For Bearish: Stop Loss is above price, Target is below price
  const minRisk = Math.max(Number((pick.ltp * 0.005).toFixed(2)), 0.05);
  let stopLossLevel = pick.stop_loss && pick.stop_loss > 0 ? pick.stop_loss : (isBull ? pick.support_1 : pick.resistance_1);
  let targetLevel = pick.target && pick.target > 0 ? pick.target : (isBull ? pick.resistance_1 : pick.support_1);

  if (isBull) {
    if (stopLossLevel >= pick.ltp) stopLossLevel = Number((pick.ltp - minRisk).toFixed(2));
    if (targetLevel <= pick.ltp) targetLevel = Number((pick.ltp + minRisk * 2.5).toFixed(2));
  } else {
    if (stopLossLevel <= pick.ltp) stopLossLevel = Number((pick.ltp + minRisk).toFixed(2));
    if (targetLevel >= pick.ltp) targetLevel = Math.max(0.05, Number((pick.ltp - minRisk * 2.5).toFixed(2)));
  }

  const riskPerShare = Math.abs(pick.ltp - stopLossLevel);
  const rewardPerShare = Math.abs(targetLevel - pick.ltp);
  const calculatedRR = riskPerShare > 0 ? (rewardPerShare / riskPerShare).toFixed(1) : "2.2";

  const openPos = analytics?.open_position;
  const tradeHistory = analytics?.history || [];
  const latestTrade = tradeHistory.length > 0 ? tradeHistory[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0E14] text-[#F8FAFC] animate-fade-in select-none">
      {/* 1. Modal Top Bar */}
      <header className="h-14 border-b border-[#1E293B] bg-[#111622] px-5 flex items-center justify-between shrink-0">
        {/* Left: Symbol & Big Clear Green/Red Trend Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-xl tracking-tight text-[#F8FAFC] font-sans">
              {pick.symbol}
            </span>
            <span className="text-xs text-[#94A3B8] font-mono uppercase bg-[#1A2234] px-2 py-0.5 rounded border border-[#1E293B]">
              {pick.sector}
            </span>
          </div>

          <div className="flex items-baseline gap-2 font-mono">
            <span className="font-bold text-lg text-[#F8FAFC]">
              ₹{pick.ltp.toFixed(2)}
            </span>
            <span
              className={`font-semibold text-xs flex items-center gap-0.5 ${
                pick.change_pct >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
              }`}
            >
              {pick.change_pct >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {pick.change_pct > 0 ? `+${pick.change_pct}%` : `${pick.change_pct}%`}
            </span>
          </div>

          {/* Prominent High-Contrast Green vs Red Trend Badge */}
          <div
            className={`px-3 py-1 rounded-md border font-bold text-xs uppercase flex items-center gap-1.5 shadow-sm ${
              isBull
                ? "bg-emerald-500/20 text-[#10B981] border-emerald-500/40"
                : "bg-red-500/20 text-[#EF4444] border-red-500/40"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isBull ? "bg-[#10B981]" : "bg-[#EF4444]"} animate-pulse`} />
            <span>{isBull ? "🟢 BULLISH ORDER BLOCK (DEMAND)" : "🔴 BEARISH ORDER BLOCK (SUPPLY)"}</span>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2.5">
          {onTrade && (
            <button
              onClick={() => onTrade(pick)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#0B0E14] text-xs font-bold active:scale-95 transition-all shadow-md font-sans"
            >
              <Crosshair className="w-4 h-4" />
              <span>Place Order</span>
            </button>
          )}

          <button
            onClick={onClose}
            title="Close Full Screen Chart (Esc)"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A2234] border border-transparent hover:border-[#1E293B] active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Main Body Split: 72% Wide Chart + 28% Analytical Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: 72% Wide Candlestick Canvas */}
        <main className="flex-1 flex flex-col bg-[#0B0E14] p-3 border-r border-[#1E293B] relative overflow-hidden">
          {/* Chart Header Info */}
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1E293B]/60 text-xs font-mono text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#F8FAFC]">5-Minute SMC Frame</span>
              {pick.ob_formed_at && (
                <span className="text-[#64748B]">
                  · Formed: <strong className="text-[#38BDF8]">{formatPositionTime(pick.ob_formed_at)}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isBull
                    ? "bg-emerald-500/10 text-[#10B981] border-emerald-500/20"
                    : "bg-red-500/10 text-[#EF4444] border-red-500/20"
                }`}
              >
                {pick.ob_state || "FRESH"} OB
              </span>
              <span className="text-[10px] text-[#64748B]">
                Total OBs: <strong className="text-[#F8FAFC]">{pick.chart_total_obs || 1}</strong>
              </span>
            </div>
          </div>

          {/* Interactive Lightweight Chart */}
          <div className="flex-1 w-full h-full relative">
            <PriceChart
              candles={candles.length > 0 ? candles : (pick.mini_chart_candles || [])}
              zoneHigh={pick.zone_high}
              zoneLow={pick.zone_low}
              invalidationLevel={stopLossLevel}
              targetLevel={targetLevel}
              isBullish={isBull}
              obFormedAt={pick.ob_formed_at}
              obConfirmedAt={pick.ob_confirmed_at}
            />
          </div>
        </main>

        {/* RIGHT: 28% Detail & Analytics Sidebar */}
        <aside className="w-[380px] shrink-0 bg-[#111622] flex flex-col overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {/* Section 1: Order Block Setup Clarity */}
          <div className="p-3.5 rounded-lg bg-[#0B0E14] border border-[#1E293B] flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
              <span className="text-[10px] text-[#64748B] uppercase tracking-wider">PREDICTED SETUP</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isBull
                    ? "bg-emerald-500/15 text-[#10B981]"
                    : "bg-red-500/15 text-[#EF4444]"
                }`}
              >
                {isBull ? "LONG EXPANSION" : "SHORT EXPANSION"}
              </span>
            </div>

            <p className="text-[11px] text-[#94A3B8] font-sans leading-relaxed">
              {isBull
                ? "Institutional buying identified. Price is anticipated to react upward from Demand Zone with minimum 1:2 Risk-to-Reward."
                : "Institutional selling identified. Price is anticipated to reject downward from Supply Zone with minimum 1:2 Risk-to-Reward."}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-[#1E293B] text-[11px]">
              <div>
                <span className="text-[#64748B] text-[10px] block">CONVICTION</span>
                <span className="font-bold text-[#F8FAFC]">{pick.conviction_score}%</span>
              </div>
              <div>
                <span className="text-[#64748B] text-[10px] block">RISK : REWARD</span>
                <span className="font-bold text-[#38BDF8]">1 : {calculatedRR}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Mathematical Levels Ladder */}
          <div className="p-3.5 rounded-lg bg-[#0B0E14] border border-[#1E293B] flex flex-col gap-2.5">
            <span className="text-[10px] text-[#64748B] uppercase tracking-wider border-b border-[#1E293B] pb-1.5">
              EXECUTION LEVELS
            </span>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8]">Target (Take Profit):</span>
              <span className="font-bold text-[#10B981] text-sm">₹{targetLevel.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8]">OB Zone (Entry):</span>
              <span className="font-semibold text-[#F8FAFC]">
                ₹{pick.zone_low.toFixed(2)} – ₹{pick.zone_high.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8]">Stop Loss (Invalidation):</span>
              <span className="font-bold text-[#EF4444] text-sm">₹{stopLossLevel.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#1E293B] text-[#64748B]">
              <span>VWAP:</span>
              <span className="text-[#38BDF8]">₹{pick.vwap.toFixed(2)}</span>
            </div>
          </div>

          {/* Section 3: Paper Trading Status for This Stock */}
          <div className="p-3.5 rounded-lg bg-[#0B0E14] border border-[#1E293B] flex flex-col gap-2">
            <span className="text-[10px] text-[#64748B] uppercase tracking-wider border-b border-[#1E293B] pb-1.5">
              1-SHARE AUTOMATED PAPER TRADE
            </span>

            {openPos ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    ACTIVE {openPos.side}
                  </span>
                  <span
                    className={`font-bold text-sm ${
                      openPos.unrealized_pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {openPos.unrealized_pnl >= 0 ? "+" : ""}₹{openPos.unrealized_pnl.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                  <div>Entry: ₹{openPos.entry_price.toFixed(2)}</div>
                  <div>Target: ₹{openPos.target?.toFixed(2)}</div>
                  <div>Stop Loss: ₹{openPos.stop_loss?.toFixed(2)}</div>
                </div>
              </div>
            ) : latestTrade ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#94A3B8]">Last Trade Result:</span>
                  <span
                    className={`font-bold ${
                      latestTrade.realized_pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {latestTrade.realized_pnl >= 0 ? "+" : ""}₹{latestTrade.realized_pnl.toFixed(2)} ({latestTrade.hit_type})
                  </span>
                </div>
                <div className="text-[10px] text-[#64748B]">
                  Exit: {formatPositionTime(latestTrade.exit_time)}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-[#94A3B8] py-1">
                Automated 1-share execution ready for confirmed OB setup.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
