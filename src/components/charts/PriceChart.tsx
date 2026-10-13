"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  CandlestickSeries,
  CandlestickData,
  Time,
} from "lightweight-charts";
import { Candle5m } from "@/lib/types";

interface PriceChartProps {
  candles: Candle5m[];
  zoneHigh?: number;
  zoneLow?: number;
  invalidationLevel?: number;
  targetLevel?: number;
  isBullish?: boolean;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  candles,
  zoneHigh,
  zoneLow,
  invalidationLevel,
  targetLevel,
  isBullish = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [zoneBounds, setZoneBounds] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    // Create chart with attribution logo disabled and institutional dark styling
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 320,
      layout: {
        background: { color: "#0B0F16" },
        textColor: "#A2AEC1",
        attributionLogo: false, // Disables the TradingView watermark and external link redirect
      },
      grid: {
        vertLines: { color: "#161C27" },
        horzLines: { color: "#161C27" },
      },
      timeScale: {
        borderColor: "#1A212D",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#1A212D",
      },
    });

    chartRef.current = chart;

    // 5-minute Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#19E58C",
      downColor: "#FF4D67",
      borderUpColor: "#19E58C",
      borderDownColor: "#FF4D67",
      wickUpColor: "#19E58C",
      wickDownColor: "#FF4D67",
    });

    const formattedData: CandlestickData<Time>[] = candles
      .map((c) => {
        const timeVal = Math.floor(new Date(c.timestamp).getTime() / 1000);
        return {
          time: timeVal as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        };
      })
      .filter((c) => typeof c.time === "number" && !isNaN(c.time) && c.time > 0)
      .sort((a, b) => (a.time as number) - (b.time as number));

    if (formattedData.length > 0) {
      candleSeries.setData(formattedData);
    }

    // Overlay horizontal lines for S1, Z, and Targets
    if (zoneHigh && zoneLow) {
      candleSeries.createPriceLine({
        price: zoneHigh,
        color: isBullish ? "#19E58C" : "#FF4D67",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "OB ZONE HIGH",
      });
      candleSeries.createPriceLine({
        price: zoneLow,
        color: isBullish ? "#19E58C" : "#FF4D67",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "OB ZONE LOW",
      });
    }

    if (invalidationLevel) {
      candleSeries.createPriceLine({
        price: invalidationLevel,
        color: "#FFB020",
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: isBullish ? "S1 (STOP)" : "R1 (STOP)",
      });
    }

    if (targetLevel) {
      candleSeries.createPriceLine({
        price: targetLevel,
        color: "#45B8FF",
        lineWidth: 1,
        lineStyle: 1, // Dotted
        axisLabelVisible: true,
        title: "TARGET R1",
      });
    }

    chart.timeScale().fitContent();

    // Compute pixel coordinates for the shaded order block box overlay
    const updateZoneOverlay = () => {
      if (zoneHigh && zoneLow) {
        const yHigh = candleSeries.priceToCoordinate(zoneHigh);
        const yLow = candleSeries.priceToCoordinate(zoneLow);
        if (yHigh !== null && yLow !== null) {
          const top = Math.min(yHigh, yLow);
          const height = Math.abs(yLow - yHigh);
          setZoneBounds({ top, height: Math.max(height, 4) });
          return;
        }
      }
      setZoneBounds(null);
    };

    // Update overlay after initial fit and on visible range changes
    requestAnimationFrame(updateZoneOverlay);
    chart.timeScale().subscribeVisibleLogicalRangeChange(updateZoneOverlay);

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        updateZoneOverlay();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles, zoneHigh, zoneLow, invalidationLevel, targetLevel, isBullish]);

  return (
    <div className="relative w-full h-80 rounded overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* Institutional Shaded Order Block Zone Overlay */}
      {zoneBounds && zoneHigh && zoneLow && (
        <div
          className="absolute left-0 right-14 pointer-events-none transition-all duration-75 flex items-center justify-between px-3"
          style={{
            top: `${zoneBounds.top}px`,
            height: `${zoneBounds.height}px`,
            backgroundColor: isBullish
              ? "rgba(25, 229, 140, 0.16)"
              : "rgba(255, 77, 103, 0.16)",
            borderTop: `1.5px solid ${isBullish ? "#19E58C" : "#FF4D67"}`,
            borderBottom: `1.5px solid ${isBullish ? "#19E58C" : "#FF4D67"}`,
            boxShadow: `0 0 16px ${
              isBullish ? "rgba(25, 229, 140, 0.2)" : "rgba(255, 77, 103, 0.2)"
            }`,
          }}
        >
          <span
            className="font-mono-num text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded shadow-sm"
            style={{
              backgroundColor: isBullish ? "rgba(25, 229, 140, 0.85)" : "rgba(255, 77, 103, 0.85)",
              color: "#07090D",
            }}
          >
            {isBullish ? "BULLISH SMC ORDER BLOCK" : "BEARISH SMC ORDER BLOCK"} [₹{zoneLow.toFixed(1)} – ₹{zoneHigh.toFixed(1)}]
          </span>
          <span
            className="font-mono-num text-[9px] uppercase px-1 rounded font-semibold"
            style={{
              color: isBullish ? "#19E58C" : "#FF4D67",
              backgroundColor: "#07090D",
            }}
          >
            FRESH · RETEST ZONE
          </span>
        </div>
      )}
    </div>
  );
};
