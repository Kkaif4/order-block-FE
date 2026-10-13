"use client";

import React from "react";

interface DepthBricksProps {
  ltp: number;
  high: number;
  low: number;
}

export const DepthBricks: React.FC<DepthBricksProps> = ({
  ltp,
  high,
  low,
}) => {
  // Compute approximate bid vs ask balance
  const range = Math.max(0.1, high - low);
  const posRatio = Math.min(1.0, Math.max(0.0, (ltp - low) / range));
  const totalBricks = 16;
  const greenBricks = Math.round(posRatio * totalBricks);

  return (
    <div className="flex items-center gap-1.5 w-full my-1">
      <div className="flex items-center gap-0.5 flex-1 h-3 overflow-hidden rounded bg-[var(--surface-3)] px-1">
        {Array.from({ length: totalBricks }).map((_, idx) => {
          const isGreen = idx < greenBricks;
          return (
            <div
              key={idx}
              className="h-2 flex-1 rounded-xs transition-colors duration-200"
              style={{
                backgroundColor: isGreen
                  ? "var(--bull)"
                  : "var(--bear)",
                opacity: isGreen ? 0.85 : 0.45,
              }}
            />
          );
        })}
      </div>
      <div className="font-mono-num text-[11px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)]">
        {ltp.toFixed(2)}
      </div>
    </div>
  );
};
