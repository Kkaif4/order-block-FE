"use client";

import React, { useEffect, useState } from "react";
import { TopPickCardOutput, Candle5m, SymbolAnalyticsResponse } from "@/lib/types";
import { PriceChart } from "../charts/PriceChart";
import { X, Crosshair, TrendingUp, TrendingDown, Clock, ShieldAlert, Target, CheckCircle2, AlertOctagon } from "lucide-react";
import { formatMarketTime, formatMarketTimeWithSeconds, formatTimeAgo } from "@/lib/timeUtils";
import { apiClient } from "@/lib/api";

interface InspectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pick: TopPickCardOutput | null;
  candles?: Candle5m[];
  onTrade?: (pick: TopPickCardOutput) => void;
}

export const InspectionDrawer: React.FC<InspectionDrawerProps> = ({
  isOpen,
  onClose,
  pick,
  candles = [],
  onTrade,
}) => {
  const [analytics, setAnalytics] = useState<SymbolAnalyticsResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !pick?.symbol) {
      setAnalytics(null);
      return;
    }

    let isMounted = true;
    setLoadingAnalytics(true);
    apiClient
      .getSymbolAnalytics(pick.symbol)
      .then((data) => {
        if (isMounted) setAnalytics(data);
      })
      .catch((err) => {
        console.warn("Failed to load symbol analytics:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingAnalytics(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, pick?.symbol]);

  if (!isOpen || !pick) return null;

  const isBull = pick.board === "BULLISH";
  const accent = isBull ? "text-[#10B981]" : "text-[#EF4444]";
  const bgSoft = isBull
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : "bg-red-500/10 text-red-400 border-red-500/20";

  // For Bullish: support_1 is Stop Loss, resistance_1 is Target
  // For Bearish: resistance_1 is Stop Loss, support_1 is Target
  const stopLossLevel = isBull ? pick.support_1 : pick.resistance_1;
  const targetLevel = isBull ? pick.resistance_1 : pick.support_1;

  const openPos = analytics?.open_position;
  const tradeHistory = analytics?.history || [];
  const latestTrade = tradeHistory.length > 0 ? tradeHistory[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl h-full bg-[#111622] border-l border-[#1E293B] flex flex-col p-5 overflow-y-auto shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg font-bold text-sm flex items-center justify-center border ${bgSoft}`}>
              {isBull ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-base text-[#F8FAFC]">
                  {pick.symbol}
                </span>
                <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-mono">
                  {pick.sector}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-bold text-sm text-[#F8FAFC]">
                  ₹{pick.ltp.toFixed(2)}
                </span>
                <span className={`font-mono text-xs font-semibold ${accent}`}>
                  {pick.change_pct > 0 ? `+${pick.change_pct}%` : `${pick.change_pct}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onTrade && (
              <button
                onClick={() => onTrade(pick)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-bold active:scale-[0.96] transition-all font-sans"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Trade</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A2234] active:scale-[0.95] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The 9-Metric Quantitative Grid */}
        <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-[#0B0E14] border border-[#1E293B] rounded-lg mb-4 text-xs font-mono">
          <div>
            <div className="text-[10px] text-[#64748B]">1. RANK & CONVICTION</div>
            <div className="text-[#F8FAFC] font-semibold">#{pick.rank} · <span className="text-[#38BDF8] font-bold">{pick.conviction_score}%</span></div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">2. MODEL & SETUP</div>
            <div className={`font-bold uppercase ${accent}`}>{pick.board} SMC</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">3. DERIVATIVE OI</div>
            <div className="text-[#10B981] font-semibold">{pick.buildup}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">4. VWAP</div>
            <div className="text-[#38BDF8] font-semibold">₹{pick.vwap.toFixed(2)}</div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#64748B]">
              <span>5. OB ZONE & TIME</span>
              {pick.ob_state && (
                <span className={`text-[9px] font-bold px-1 rounded border ${
                  isBull ? "bg-emerald-500/10 border-emerald-500/20 text-[#10B981]" : "bg-red-500/10 border-red-500/20 text-[#EF4444]"
                }`}>
                  {pick.ob_state}
                </span>
              )}
            </div>
            <div className="text-[#F8FAFC] font-semibold">{pick.zone_low.toFixed(1)} – {pick.zone_high.toFixed(1)}</div>
            {pick.ob_formed_at && (
              <div className="text-[9px] text-[#94A3B8] mt-0.5 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-[#38BDF8]" />
                <span>{formatMarketTime(pick.ob_formed_at)} ({formatTimeAgo(pick.ob_formed_at)})</span>
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">6. RISK : REWARD</div>
            <div className="text-[#38BDF8] font-bold text-sm">1 : {pick.risk_reward}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">7. {isBull ? "STOP LOSS (S1)" : "STOP LOSS (R1)"}</div>
            <div className="text-amber-400 font-semibold">₹{stopLossLevel.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">8. {isBull ? "TARGET (R1)" : "TARGET (S1)"}</div>
            <div className="text-[#10B981] font-semibold">₹{targetLevel.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">9. CHART OB COUNT</div>
            <div className="text-[#F8FAFC] font-semibold">
              {pick.chart_total_obs || 1} OBs ({pick.chart_fresh_obs || 1} Fresh)
            </div>
          </div>
        </div>

        {/* 1-Share Automated Paper Trading & OB Placement Card */}
        <div className="p-3 bg-[#0B0E14] border border-[#1E293B] rounded-lg mb-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E293B] mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
              <span className="font-bold text-[#F8FAFC] tracking-wide">
                AUTOMATED 1-SHARE PAPER TRADE (OB SPOT)
              </span>
            </div>
            {openPos ? (
              <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[#38BDF8] text-[10px] font-bold animate-pulse">
                ACTIVE POSITION ({openPos.side})
              </span>
            ) : latestTrade ? (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                latestTrade.hit_type === "TARGET"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-[#10B981]"
                  : "bg-red-500/10 border-red-500/20 text-[#EF4444]"
              }`}>
                {latestTrade.hit_type === "TARGET" ? "TARGET HIT 🎯" : "STOP LOSS HIT 🛑"}
              </span>
            ) : (
              <span className="text-[10px] text-[#64748B]">PENDING FILL</span>
            )}
          </div>

          {openPos ? (
            <div className="grid grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-[#64748B] block text-[9px]">ENTRY SPOT</span>
                <span className="font-bold text-[#F8FAFC]">₹{openPos.entry_price.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[9px]">TARGET (MIN 2R)</span>
                <span className="font-bold text-[#10B981]">₹{openPos.target.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[9px]">STOP LOSS</span>
                <span className="font-bold text-amber-400">₹{openPos.stop_loss.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[9px]">LIVE UNREALIZED PnL</span>
                <span className={`font-bold ${openPos.unrealized_pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                  {openPos.unrealized_pnl >= 0 ? `+₹${openPos.unrealized_pnl.toFixed(2)}` : `-₹${Math.abs(openPos.unrealized_pnl).toFixed(2)}`}
                </span>
              </div>
            </div>
          ) : latestTrade ? (
            <div className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {latestTrade.hit_type === "TARGET" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  ) : (
                    <AlertOctagon className="w-3.5 h-3.5 text-[#EF4444]" />
                  )}
                  <span className="text-[#94A3B8]">
                    1 Share {latestTrade.side} filled at ₹{latestTrade.entry_price.toFixed(2)} · Exited at ₹{latestTrade.exit_price.toFixed(2)}
                  </span>
                </div>
                <span className={`font-bold ${latestTrade.realized_pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                  {latestTrade.realized_pnl >= 0 ? `+₹${latestTrade.realized_pnl.toFixed(2)}` : `-₹${Math.abs(latestTrade.realized_pnl).toFixed(2)}`} ({latestTrade.return_pct}%)
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-[#64748B]">
                <span>Exit Trigger: <strong>{latestTrade.exit_reason}</strong></span>
                <span>Hit at: <strong>{formatMarketTimeWithSeconds(latestTrade.exit_time)}</strong></span>
                <span>R:R Achieved: <strong className="text-[#38BDF8]">{latestTrade.r_multiple_achieved}R</strong></span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-[#94A3B8] flex items-center justify-between">
              <span>Automated 1-share trade triggered on OB formation. Awaiting market fill.</span>
              <span className="text-[#38BDF8]">Spot: ₹{pick.ltp.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Candlestick Chart View */}
        <div className="flex-1 bg-[#0B0E14] border border-[#1E293B] rounded-lg p-3 flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-2 px-1 font-mono">
            <div className="flex items-center gap-2">
              <span>5-Minute Completed Bars</span>
              {pick.ob_formed_at && (
                <span className="text-[10px] text-[#64748B]">
                  · Formed: <strong className="text-[#F8FAFC]">{formatMarketTimeWithSeconds(pick.ob_formed_at)}</strong>
                  {pick.ob_confirmed_at && (
                    <> (BOS: <strong className="text-[#38BDF8]">{formatMarketTime(pick.ob_confirmed_at)}</strong>)</>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {pick.chart_total_obs !== undefined && pick.chart_total_obs > 0 && (
                <span className="text-[10px] text-[#94A3B8] px-1.5 py-0.5 rounded bg-[#1A2234] border border-[#1E293B]">
                  Chart OBs: <strong className="text-[#38BDF8]">{pick.chart_total_obs}</strong> ({pick.chart_fresh_obs || 0} Fresh, {pick.chart_mitigated_obs || 0} Mitigated)
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isBull ? "bg-[#10B981]" : "bg-[#EF4444]"} animate-pulse`} />
                <span className={`font-semibold text-[11px] ${accent}`}>
                  {pick.ob_state || "ACTIVE"} ORDER BLOCK
                </span>
                {pick.ob_formed_at && (
                  <span className="text-[10px] text-[#64748B]">· {formatTimeAgo(pick.ob_formed_at)}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1">
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
        </div>
      </div>
    </div>
  );
};
