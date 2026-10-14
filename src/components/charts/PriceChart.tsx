"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  CandlestickSeries,
  CandlestickData,
  Time,
  createSeriesMarkers,
} from "lightweight-charts";
import { Candle5m } from "@/lib/types";

interface PriceChartProps {
  candles: Candle5m[];
  zoneHigh?: number;
  zoneLow?: number;
  invalidationLevel?: number;
  targetLevel?: number;
  isBullish?: boolean;
  obFormedAt?: string | null;
  obConfirmedAt?: string | null;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  candles,
  zoneHigh,
  zoneLow,
  invalidationLevel,
  targetLevel,
  isBullish = true,
  obFormedAt,
  obConfirmedAt,
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
      localization: {
        dateFormat: "yyyy-MM-dd",
        timeFormatter: (sec: number) => {
          try {
            return new Intl.DateTimeFormat("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date(sec * 1000));
          } catch {
            return "";
          }
        },
      },
      timeScale: {
        borderColor: "#1A212D",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 9,
        minBarSpacing: 4,
        tickMarkFormatter: (sec: number) => {
          try {
            return new Intl.DateTimeFormat("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date(sec * 1000));
          } catch {
            return "";
          }
        },
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

    // Deduplicate and sort candles strictly ascending by timestamp
    const candleMap = new Map<number, CandlestickData<Time>>();
    for (const c of candles) {
      const timeVal = Math.floor(new Date(c.timestamp).getTime() / 1000);
      if (typeof timeVal === "number" && !isNaN(timeVal) && timeVal > 0) {
        candleMap.set(timeVal, {
          time: timeVal as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        });
      }
    }
    const formattedData: CandlestickData<Time>[] = Array.from(candleMap.values()).sort(
      (a, b) => (a.time as number) - (b.time as number)
    );

    if (formattedData.length > 0) {
      candleSeries.setData(formattedData);

      // Add markers for Order Block generation (origin candle) and BOS confirmation
      interface SeriesMarker {
        time: Time;
        position: "aboveBar" | "belowBar" | "inBar";
        color: string;
        shape: "circle" | "square" | "arrowUp" | "arrowDown";
        text: string;
      }
      const markers: SeriesMarker[] = [];
      const candleTimes = new Set(formattedData.map((d) => d.time as number));

      const findClosestCandleTime = (isoString?: string | null): Time | null => {
        if (!isoString || formattedData.length === 0) return null;
        const targetSec = Math.floor(new Date(isoString).getTime() / 1000);
        if (isNaN(targetSec) || targetSec <= 0) return null;

        if (candleTimes.has(targetSec)) return targetSec as Time;

        let closest: number | null = null;
        let minDiff = 1800; // within 30m window
        for (const d of formattedData) {
          const diff = Math.abs((d.time as number) - targetSec);
          if (diff < minDiff) {
            minDiff = diff;
            closest = d.time as number;
          }
        }
        return closest !== null ? (closest as Time) : null;
      };

      const formedTime = findClosestCandleTime(obFormedAt);
      if (formedTime) {
        markers.push({
          time: formedTime,
          position: isBullish ? "belowBar" : "aboveBar",
          color: isBullish ? "#10B981" : "#EF4444",
          shape: isBullish ? "arrowUp" : "arrowDown",
          text: "OB Base",
        });
      }

      const confirmedTime = findClosestCandleTime(obConfirmedAt);
      if (confirmedTime && confirmedTime !== formedTime) {
        markers.push({
          time: confirmedTime,
          position: isBullish ? "aboveBar" : "belowBar",
          color: "#38BDF8",
          shape: "square",
          text: "BOS Break",
        });
      }

      if (markers.length > 0) {
        markers.sort((a, b) => (a.time as number) - (b.time as number));
        try {
          createSeriesMarkers(candleSeries, markers);
        } catch (err) {
          console.warn("Failed to set chart markers:", err);
        }
      }
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
        color: isBullish ? "#FFB020" : "#FF4D67",
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: isBullish ? "STOP LOSS (S1)" : "STOP LOSS (R1)",
      });
    }

    if (targetLevel) {
      candleSeries.createPriceLine({
        price: targetLevel,
        color: "#10B981",
        lineWidth: 1,
        lineStyle: 1, // Dotted
        axisLabelVisible: true,
        title: isBullish ? "TARGET (R1)" : "TARGET (S1)",
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
  }, [candles, zoneHigh, zoneLow, invalidationLevel, targetLevel, isBullish, obFormedAt, obConfirmedAt]);

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
