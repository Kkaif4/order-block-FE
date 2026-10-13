"use client";

import React from "react";
import { BeeSwarmDot } from "@/lib/types";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface BeeSwarmBreadthProps {
  dots: BeeSwarmDot[];
  bullishCount: number;
  bearishCount: number;
  leadingSector?: string;
  laggingSector?: string;
  onSelect?: (symbol: string) => void;
}

export const BeeSwarmBreadth: React.FC<BeeSwarmBreadthProps> = ({
  dots,
  bullishCount,
  bearishCount,
  leadingSector = "AUTO +2.45%",
  laggingSector = "IT -1.82%",
  onSelect,
}) => {
  // SVG Viewport constants
  const width = 800;
  const height = 64;
  const centerY = height / 2;

  // Scale % change (-4% to +4%) to SVG X coordinate (0 to width)
  const getX = (pct: number) => {
    const clamped = Math.max(-4.0, Math.min(4.0, pct));
    return ((clamped + 4.0) / 8.0) * width;
  };

  return (
    <div className="w-full bg-[#111622] border border-[#1E293B] rounded-lg p-3 my-2 shadow-sm">
      {/* Top Labels: Breadth Counters & Leading/Lagging Sectors */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="text-[#10B981] font-mono font-semibold flex items-center gap-1">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{leadingSector}</span>
        </div>

        <div className="flex items-center gap-4 font-mono font-bold">
          <span className="text-[#10B981] flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>BULLISH {bullishCount}</span>
          </span>
          <span className="text-[#64748B]">|</span>
          <span className="text-[#EF4444] flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>BEARISH {bearishCount}</span>
          </span>
        </div>

        <div className="text-[#EF4444] font-mono font-semibold flex items-center gap-1">
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>{laggingSector}</span>
        </div>
      </div>

      {/* The Bee-Swarm Distribution SVG Canvas */}
      <div className="relative w-full overflow-hidden rounded bg-[#0B0E14] border border-[#1E293B]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-14 block"
          preserveAspectRatio="none"
        >
          {/* Central 0% axis line */}
          <line
            x1={width / 2}
            y1={4}
            x2={width / 2}
            y2={height - 4}
            stroke="#1E293B"
            strokeDasharray="2,2"
          />

          {/* Neutral center horizontal guide */}
          <line
            x1={0}
            y1={centerY}
            x2={width}
            y2={centerY}
            stroke="#1E293B"
            strokeWidth={0.5}
          />

          {/* Plotted Stock Dots */}
          {dots.map((dot) => {
            const cx = getX(dot.change_pct);
            const cy = centerY - dot.stack_y;
            const isGreen = dot.change_pct >= 0;
            const color = isGreen ? "#10B981" : "#EF4444";

            return (
              <g
                key={dot.symbol}
                onClick={() => onSelect?.(dot.symbol)}
                className="cursor-pointer"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={dot.is_pick ? 4.0 : 2.5}
                  fill={color}
                  opacity={dot.is_pick ? 1.0 : 0.7}
                />
                {dot.is_pick && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6.5}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={1.2}
                    opacity={0.9}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
