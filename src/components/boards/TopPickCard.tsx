"use client";

import React from "react";
import { TopPickCardOutput } from "@/lib/types";
import { DepthBricks } from "./DepthBricks";
import { TrendingUp, TrendingDown, Crosshair, Clock } from "lucide-react";
import { formatMarketTime, formatTimeAgo } from "@/lib/timeUtils";

interface TopPickCardProps {
  pick: TopPickCardOutput;
  onInspect?: (symbol: string) => void;
  onTrade?: (pick: TopPickCardOutput) => void;
  tier?: "top6" | "next4" | "next2";
}

export const TopPickCard: React.FC<TopPickCardProps> = ({
  pick,
  onInspect,
  onTrade,
  tier = "top6",
}) => {
  const isBull = pick.board === "BULLISH";
  const accentColor = isBull ? "text-[#10B981]" : "text-[#EF4444]";
  const bgSoft = isBull ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20";
  const borderHighlight = isBull ? "hover:border-emerald-500/50" : "hover:border-red-500/50";

  // Tier 1: Hero focus with expanded metrics & Trade trigger
  if (tier === "top6") {
    return (
      <div
        className={`rounded-lg p-3.5 bg-[#111622] border border-[#1E293B] ${borderHighlight} transition-all duration-150 relative shadow-sm hover:shadow-md flex flex-col justify-between`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 mb-2.5">
          <div
            onClick={() => onInspect?.(pick.symbol)}
            className="flex items-center gap-2.5 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs border ${bgSoft}`}>
              {isBull ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-[#F8FAFC]">
                {pick.symbol}
              </div>
              <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-mono">
                {pick.sector}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${bgSoft}`}>
              {pick.board} #{pick.rank}
            </span>
            <div
              title={`Conviction Score: ${pick.conviction_score}%`}
              className="w-6 h-6 rounded-full border border-[#1E293B] bg-[#1A2234] flex items-center justify-center font-mono text-[10px] text-[#F8FAFC] font-semibold"
            >
              {pick.conviction_score}
            </div>
          </div>
        </div>

        {/* Middle: Price, Net Change, Buildup */}
        <div
          onClick={() => onInspect?.(pick.symbol)}
          className="cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-baseline justify-between mb-1">
            <div className="font-mono text-lg font-bold text-[#F8FAFC]">
              ₹{pick.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className={`font-mono text-sm font-semibold flex items-center gap-1 ${accentColor}`}>
              {isBull ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{pick.change_pct > 0 ? `+${pick.change_pct}%` : `${pick.change_pct}%`}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-2 font-mono">
            <span className="font-medium text-[#F8FAFC] px-1.5 py-0.5 rounded bg-[#1A2234] border border-[#1E293B] text-[10px]">
              {pick.buildup}
            </span>
            <span>
              OI {pick.oi_change_pct > 0 ? `+${pick.oi_change_pct}%` : `${pick.oi_change_pct}%`}
            </span>
          </div>

          {/* Depth Bricks Bar */}
          <DepthBricks ltp={pick.ltp} high={pick.resistance_1} low={pick.support_1} />
        </div>

        {/* Level Ladder & Trade Setup Footer */}
        <div className="mt-2.5 pt-2 border-t border-[#1E293B] flex flex-col gap-1.5 font-mono">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-[#94A3B8]">
              <Clock className="w-3 h-3 text-[#38BDF8]" />
              <span className="text-[#64748B]">OB:</span>
              <span className="text-[#F8FAFC] font-semibold">
                {pick.ob_formed_at ? formatMarketTime(pick.ob_formed_at) : pick.zone_low.toFixed(1)}
              </span>
              {pick.ob_formed_at && (
                <span className="text-[#64748B] text-[9px]">({formatTimeAgo(pick.ob_formed_at)})</span>
              )}
              {pick.ob_state && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#1A2234] border border-[#1E293B] text-emerald-400 font-bold">
                  {pick.ob_state}
                </span>
              )}
              {Boolean(pick.chart_total_obs && pick.chart_total_obs > 0) && (
                <span
                  title={`${pick.chart_fresh_obs || 0} Fresh, ${pick.chart_mitigated_obs || 0} Mitigated`}
                  className="text-[9px] px-1 py-0.2 rounded bg-[#1A2234] text-[#38BDF8]"
                >
                  {pick.chart_total_obs} OBs
                </span>
              )}
            </div>
            <div>
              <span className="text-[#64748B]">R:R: </span>
              <span className="text-[#38BDF8] font-bold">{pick.risk_reward}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2.5 text-[#94A3B8]">
              <div>
                <span className="text-[#64748B]">Zone: </span>
                <span className="text-[#F8FAFC] font-semibold">{pick.zone_low.toFixed(1)} - {pick.zone_high.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-[#64748B]">{isBull ? "SL: " : "SL: "}</span>
                <span className="text-amber-400 font-semibold">{pick.support_1.toFixed(1)}</span>
              </div>
            </div>

            {onTrade && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTrade(pick);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A2234] hover:bg-[#38BDF8]/20 border border-[#1E293B] hover:border-[#38BDF8]/50 text-[#38BDF8] active:scale-[0.95] transition-all font-sans font-semibold text-[10px]"
              >
                <Crosshair className="w-3 h-3" />
                <span>Trade</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tier 2: Next 4 (Compact card)
  return (
    <div
      onClick={() => onInspect?.(pick.symbol)}
      className={`cursor-pointer rounded-md p-2.5 bg-[#111622] border border-[#1E293B] ${borderHighlight} transition-all duration-150 flex flex-col justify-between active:scale-[0.99]`}
    >
      <div className="flex items-center justify-between mb-1.5 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-[#64748B]">#{pick.rank}</span>
          <span className="font-bold text-xs text-[#F8FAFC] font-sans">{pick.symbol}</span>
          <span className="text-[9px] text-[#94A3B8] uppercase">{pick.sector.slice(0, 4)}</span>
        </div>
        <span className={`text-xs font-semibold ${accentColor}`}>
          {pick.change_pct > 0 ? `+${pick.change_pct}%` : `${pick.change_pct}%`}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
        <span className="text-[#F8FAFC] font-semibold">
          ₹{pick.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
        <span className="text-[10px] text-[#94A3B8]">{pick.buildup}</span>
      </div>

      <DepthBricks ltp={pick.ltp} high={pick.resistance_1} low={pick.support_1} />

      <div className="flex items-center justify-between text-[9px] mt-2 pt-1.5 border-t border-[#1E293B]/70 font-mono text-[#94A3B8]">
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 text-[#38BDF8]" />
          <span>OB: {pick.ob_formed_at ? formatMarketTime(pick.ob_formed_at) : pick.zone_low.toFixed(0)}</span>
          {pick.ob_state && (
            <span className="text-[8px] px-1 rounded bg-[#1A2234] text-emerald-400 font-semibold">{pick.ob_state}</span>
          )}
        </div>
        <span className="text-[#38BDF8] font-bold">1:{pick.risk_reward}</span>
      </div>
    </div>
  );
};
