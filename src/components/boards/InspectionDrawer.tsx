"use client";

import React from "react";
import { TopPickCardOutput, Candle5m } from "@/lib/types";
import { PriceChart } from "../charts/PriceChart";
import { X, Crosshair, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { formatMarketTime, formatMarketTimeWithSeconds, formatTimeAgo } from "@/lib/timeUtils";

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
  if (!isOpen || !pick) return null;

  const isBull = pick.board === "BULLISH";
  const accent = isBull ? "text-[#10B981]" : "text-[#EF4444]";
  const bgSoft = isBull ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20";

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
            <div className="text-[10px] text-[#64748B]">1. RANK</div>
            <div className="text-[#F8FAFC] font-semibold">#{pick.rank} · Top Tier</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">2. MODEL</div>
            <div className="text-[#F8FAFC] font-semibold">{pick.board} SMC</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">3. CONVICTION</div>
            <div className="text-[#38BDF8] font-bold">{pick.conviction_score}%</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">4. DERIVATIVE OI</div>
            <div className="text-[#10B981] font-semibold">{pick.buildup}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">5. VWAP</div>
            <div className="text-[#38BDF8] font-semibold">₹{pick.vwap.toFixed(2)}</div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#64748B]">
              <span>6. OB ZONE & TIME</span>
              {pick.ob_state && (
                <span className="text-[9px] text-emerald-400 font-bold px-1 rounded bg-[#1A2234]">
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
            <div className="text-[10px] text-[#64748B]">7. {isBull ? "STOP (S1)" : "STOP (R1)"}</div>
            <div className="text-amber-400 font-semibold">{pick.support_1.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">8. TARGET (R1)</div>
            <div className="text-[#10B981] font-semibold">{pick.resistance_1.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B]">9. RISK : REWARD</div>
            <div className="text-[#F8FAFC] font-bold text-sm">1 : {pick.risk_reward}</div>
          </div>
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
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[#10B981] font-semibold text-[11px]">
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
              invalidationLevel={pick.support_1}
              targetLevel={pick.resistance_1}
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
