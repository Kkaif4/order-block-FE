"use client";

import React from "react";
import { TopPickCardOutput } from "@/lib/types";
import { TrendingUp, TrendingDown, Crosshair, Clock } from "lucide-react";
import { formatTimeAgo } from "@/lib/timeUtils";

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
}) => {
  const isBull = pick.board === "BULLISH";
  const accentColor = isBull ? "text-[#10B981]" : "text-[#EF4444]";
  const borderHighlight = isBull
    ? "hover:border-emerald-500/50"
    : "hover:border-red-500/50";

  // Strict directional calculations for Target & Stop Loss
  const minRisk = Math.max(Number((pick.ltp * 0.005).toFixed(2)), 0.05);
  let sl =
    pick.stop_loss && pick.stop_loss > 0
      ? pick.stop_loss
      : isBull
        ? pick.support_1
        : pick.resistance_1;
  let tp =
    pick.target && pick.target > 0
      ? pick.target
      : isBull
        ? pick.resistance_1
        : pick.support_1;

  if (isBull) {
    if (sl >= pick.ltp) sl = Number((pick.ltp - minRisk).toFixed(2));
    if (tp <= pick.ltp) tp = Number((pick.ltp + minRisk * 2.5).toFixed(2));
  } else {
    if (sl <= pick.ltp) sl = Number((pick.ltp + minRisk).toFixed(2));
    if (tp >= pick.ltp)
      tp = Math.max(0.05, Number((pick.ltp - minRisk * 2.5).toFixed(2)));
  }

  return (
    <div
      onClick={() => onInspect?.(pick.symbol)}
      className={`cursor-pointer rounded-lg p-3 bg-[#111622] border border-[#1E293B] ${borderHighlight} transition-all duration-150 relative shadow-sm hover:shadow-md flex flex-col justify-between group active:scale-[0.99]`}
    >
      {/* 1. Header: Symbol, Sector & Rank */}
      <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 mb-2 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#64748B]">#{pick.rank}</span>
          <span className="font-extrabold text-sm text-[#F8FAFC] font-sans tracking-wide group-hover:text-[#38BDF8] transition-colors">
            {pick.symbol}
          </span>
          <span className="text-[10px] text-[#94A3B8] uppercase px-1.5 py-0.2 rounded bg-[#1A2234]">
            {pick.sector.slice(0, 5)}
          </span>
        </div>
      </div>

      {/* 2. Middle: Price, Net Change & Conviction */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="font-mono text-base font-bold text-[#F8FAFC]">
          ₹{pick.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </div>
        <div
          className={`font-mono text-xs font-semibold flex items-center gap-1 ${accentColor}`}
        >
          {isBull ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>
            {pick.change_pct > 0
              ? `+${pick.change_pct}%`
              : `${pick.change_pct}%`}
          </span>
        </div>
      </div>

      {/* 3. Conviction & Buildup Indicator */}
      <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-mono mb-2.5">
        <span className="px-1.5 py-0.5 rounded bg-[#1A2234] border border-[#1E293B] text-[#F8FAFC]">
          {pick.buildup}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[#64748B]">Conv:</span>
          <span className="font-bold text-[#38BDF8]">
            {pick.conviction_score}%
          </span>
        </div>
      </div>

      {/* 4. Execution Levels: Target, SL & R:R (Clean & Decluttered) */}
      <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between font-mono text-[10px]">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[#64748B] block text-[9px]">TARGET</span>
            <span className="font-bold text-[#10B981]">₹{tp.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-[#64748B] block text-[9px]">STOP LOSS</span>
            <span className="font-bold text-[#EF4444]">₹{sl.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-[#64748B] block text-[9px]">R:R</span>
            <span className="font-bold text-[#38BDF8]">
              1:{pick.risk_reward}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
