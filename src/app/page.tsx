"use client";

import React, { useState, useMemo } from "react";
import { TopPickCardOutput, Candle5m } from "@/lib/types";
import { useOrderBlockSocket } from "@/lib/useOrderBlockSocket";
import { api } from "@/lib/api";
import { HeaderTelemetryBar } from "@/components/telemetry/HeaderTelemetryBar";
import { AccountSummaryBar } from "@/components/execution/AccountSummaryBar";
import { OrderModal } from "@/components/execution/OrderModal";
import { PositionsDrawer } from "@/components/execution/PositionsDrawer";
import { BeeSwarmBreadth } from "@/components/boards/BeeSwarmBreadth";
import { TopPickCard } from "@/components/boards/TopPickCard";
import { DepthBricks } from "@/components/boards/DepthBricks";
import { InspectionDrawer } from "@/components/boards/InspectionDrawer";
import { TrendingUp, TrendingDown, Search } from "lucide-react";

export default function DashboardPage() {
  const { data, connectionState, reconnect } = useOrderBlockSocket();

  const [selectedPick, setSelectedPick] = useState<TopPickCardOutput | null>(null);
  const [tradePick, setTradePick] = useState<TopPickCardOutput | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [positionsOpen, setPositionsOpen] = useState(false);
  const [inspectCandles, setInspectCandles] = useState<Candle5m[]>([]);
  const [activeBoardFilter, setActiveBoardFilter] = useState<"ALL" | "BULLISH" | "BEARISH">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const handleInspect = async (symbol: string) => {
    if (!data) return;
    const found =
      data.bullish_picks.find((p) => p.symbol === symbol) ||
      data.bearish_picks.find((p) => p.symbol === symbol);

    let activePick: TopPickCardOutput | null = found || null;

    if (!activePick) {
      const bFound =
        data.bullish_board.find((b) => b.symbol === symbol) ||
        data.bearish_board.find((b) => b.symbol === symbol);
      if (bFound) {
        activePick = {
          symbol: bFound.symbol,
          board: bFound.board,
          rank: bFound.rank,
          sector: bFound.sector,
          ltp: bFound.ltp,
          change_pct: bFound.display_change_pct,
          conviction_score: bFound.conviction_score,
          buildup: bFound.buildup,
          oi_change_pct: bFound.oi_change_pct,
          oi_net_delta: bFound.oi_net_delta,
          support_1: bFound.open - 10,
          zone_low: bFound.open,
          zone_high: bFound.open + 15,
          resistance_1: bFound.ltp + 20,
          resistance_2: bFound.ltp + 40,
          risk_reward: 2.8,
          vwap: bFound.open + 5,
        };
      }
    }

    if (activePick) {
      setSelectedPick(activePick);
      setDrawerOpen(true);

      // Fetch complete 5m candles and Order Block boundaries
      try {
        const chartData = await api.getStockChart(symbol);
        if (chartData && chartData.candles && chartData.candles.length > 0) {
          setInspectCandles(chartData.candles);
          setSelectedPick((prev) =>
            prev
              ? {
                  ...prev,
                  zone_high: chartData.zone_high ?? prev.zone_high,
                  zone_low: chartData.zone_low ?? prev.zone_low,
                  support_1: chartData.invalidation_level ?? prev.support_1,
                  resistance_1: chartData.target_level ?? prev.resistance_1,
                  vwap: chartData.vwap ?? prev.vwap,
                }
              : null
          );
        }
      } catch (err) {
        console.error("Failed to load chart for", symbol, err);
      }
    }
  };

  const handleTrade = (pick: TopPickCardOutput) => {
    setTradePick(pick);
    setOrderModalOpen(true);
  };

  // Filtered boards based on search query
  const filteredBullishBoard = useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data.bullish_board;
    const q = searchQuery.toUpperCase();
    return data.bullish_board.filter((s) => s.symbol.includes(q) || s.sector.includes(q));
  }, [data, searchQuery]);

  const filteredBearishBoard = useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data.bearish_board;
    const q = searchQuery.toUpperCase();
    return data.bearish_board.filter((s) => s.symbol.includes(q) || s.sector.includes(q));
  }, [data, searchQuery]);

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-[#94A3B8]">Syncing OrderBlock Terminal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F8FAFC] p-4 max-w-[1780px] mx-auto font-sans">
      {/* 1. Header Telemetry Bar */}
      <HeaderTelemetryBar
        wsStatus={connectionState}
        syncQuality={data.synchronization.quality}
        universeSize={data.contractual_universe_size}
        onRefresh={reconnect}
      />

      {/* 2. Paper Trading Account Summary Ticker & Kill-Switch */}
      <AccountSummaryBar
        onOpenPositions={() => setPositionsOpen(true)}
        onKillSwitchTriggered={() => setPositionsOpen(true)}
      />

      {/* 3. Market Breadth Bee-Swarm Dispersion View */}
      <BeeSwarmBreadth
        dots={data.bee_swarm_dots}
        bullishCount={data.published_bullish_count}
        bearishCount={data.published_bearish_count}
        leadingSector="AUTO +2.45%"
        laggingSector="IT -1.82%"
        onSelect={handleInspect}
      />

      {/* 4. Controls: Board Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 my-3 font-mono text-xs">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#111622] border border-[#1E293B]">
          <button
            onClick={() => setActiveBoardFilter("ALL")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeBoardFilter === "ALL"
                ? "bg-[#1A2234] text-[#38BDF8] shadow-sm"
                : "text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            All Boards ({data.published_bullish_count + data.published_bearish_count})
          </button>
          <button
            onClick={() => setActiveBoardFilter("BULLISH")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeBoardFilter === "BULLISH"
                ? "bg-emerald-500/10 text-[#10B981] border border-emerald-500/20"
                : "text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Bullish Only ({data.published_bullish_count})</span>
          </button>
          <button
            onClick={() => setActiveBoardFilter("BEARISH")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeBoardFilter === "BEARISH"
                ? "bg-red-500/10 text-[#EF4444] border border-red-500/20"
                : "text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Bearish Only ({data.published_bearish_count})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symbol or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#111622] border border-[#1E293B] rounded-lg text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
          />
        </div>
      </div>

      {/* 5. Main Terminal Dual Boards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BULLISH BOARD */}
        {(activeBoardFilter === "ALL" || activeBoardFilter === "BULLISH") && (
          <section className="bg-[#111622] border border-[#1E293B] rounded-lg p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-[#10B981] border border-emerald-500/20 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>BULLISH BOARD</span>
                </span>
                <span className="font-mono text-xs text-[#94A3B8]">
                  {data.published_bullish_count} Active
                </span>
              </div>
              <div className="text-[11px] text-[#94A3B8] font-mono">
                TOP PICKS (SECTOR CAP ≤ 2)
              </div>
            </div>

            {/* Top Picks Hero Cards */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] mb-2 uppercase">
                <span className="text-[#10B981] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  Primary Focus · Top Picks
                </span>
                <span>Ranks #1 – #6</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {data.bullish_picks.slice(0, 6).map((pick) => (
                  <TopPickCard
                    key={pick.symbol}
                    pick={pick}
                    tier="top6"
                    onInspect={handleInspect}
                    onTrade={handleTrade}
                  />
                ))}
              </div>
            </div>

            {/* Bullish Candidates Table */}
            <div className="border border-[#1E293B] rounded-lg overflow-hidden bg-[#0B0E14]">
              <div className="bg-[#111622] px-3 py-2 border-b border-[#1E293B] grid grid-cols-12 text-[10px] font-mono text-[#64748B] uppercase">
                <span className="col-span-1">#</span>
                <span className="col-span-3">SYMBOL</span>
                <span className="col-span-2 text-right">LTP</span>
                <span className="col-span-2 text-right">% CHG</span>
                <span className="col-span-4 pl-3">ORDER DEPTH</span>
              </div>

              <div className="divide-y divide-[#1E293B] max-h-80 overflow-y-auto">
                {filteredBullishBoard.map((stock) => (
                  <div
                    key={stock.symbol}
                    onClick={() => handleInspect(stock.symbol)}
                    className="px-3 py-2 grid grid-cols-12 items-center text-xs hover:bg-[#1A2234] cursor-pointer transition-colors font-mono"
                  >
                    <span className="col-span-1 text-[#64748B]">{stock.rank}</span>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <span className="font-bold text-[#F8FAFC] font-sans">{stock.symbol}</span>
                      <span className="text-[9px] text-[#64748B] uppercase">{stock.sector.slice(0, 4)}</span>
                    </div>
                    <span className="col-span-2 text-right font-semibold text-[#F8FAFC]">
                      ₹{stock.ltp.toFixed(2)}
                    </span>
                    <span className="col-span-2 text-right font-semibold text-[#10B981]">
                      +{stock.display_change_pct}%
                    </span>
                    <div className="col-span-4 pl-3">
                      <DepthBricks ltp={stock.ltp} high={stock.open + 15} low={stock.open - 5} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* BEARISH BOARD */}
        {(activeBoardFilter === "ALL" || activeBoardFilter === "BEARISH") && (
          <section className="bg-[#111622] border border-[#1E293B] rounded-lg p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-red-500/10 text-[#EF4444] border border-red-500/20 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>BEARISH BOARD</span>
                </span>
                <span className="font-mono text-xs text-[#94A3B8]">
                  {data.published_bearish_count} Active
                </span>
              </div>
              <div className="text-[11px] text-[#94A3B8] font-mono">
                TOP PICKS (SECTOR CAP ≤ 2)
              </div>
            </div>

            {/* Top Picks Hero Cards */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] mb-2 uppercase">
                <span className="text-[#EF4444] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  Primary Focus · Top Picks
                </span>
                <span>Ranks #1 – #6</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {data.bearish_picks.slice(0, 6).map((pick) => (
                  <TopPickCard
                    key={pick.symbol}
                    pick={pick}
                    tier="top6"
                    onInspect={handleInspect}
                    onTrade={handleTrade}
                  />
                ))}
              </div>
            </div>

            {/* Bearish Candidates Table */}
            <div className="border border-[#1E293B] rounded-lg overflow-hidden bg-[#0B0E14]">
              <div className="bg-[#111622] px-3 py-2 border-b border-[#1E293B] grid grid-cols-12 text-[10px] font-mono text-[#64748B] uppercase">
                <span className="col-span-1">#</span>
                <span className="col-span-3">SYMBOL</span>
                <span className="col-span-2 text-right">LTP</span>
                <span className="col-span-2 text-right">% CHG</span>
                <span className="col-span-4 pl-3">ORDER DEPTH</span>
              </div>

              <div className="divide-y divide-[#1E293B] max-h-80 overflow-y-auto">
                {filteredBearishBoard.map((stock) => (
                  <div
                    key={stock.symbol}
                    onClick={() => handleInspect(stock.symbol)}
                    className="px-3 py-2 grid grid-cols-12 items-center text-xs hover:bg-[#1A2234] cursor-pointer transition-colors font-mono"
                  >
                    <span className="col-span-1 text-[#64748B]">{stock.rank}</span>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <span className="font-bold text-[#F8FAFC] font-sans">{stock.symbol}</span>
                      <span className="text-[9px] text-[#64748B] uppercase">{stock.sector.slice(0, 4)}</span>
                    </div>
                    <span className="col-span-2 text-right font-semibold text-[#F8FAFC]">
                      ₹{stock.ltp.toFixed(2)}
                    </span>
                    <span className="col-span-2 text-right font-semibold text-[#EF4444]">
                      {stock.display_change_pct}%
                    </span>
                    <div className="col-span-4 pl-3">
                      <DepthBricks ltp={stock.ltp} high={stock.open + 5} low={stock.open - 15} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 6. Inspection Slide-over Drawer with Detailed 5m Chart */}
      <InspectionDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pick={selectedPick}
        candles={inspectCandles}
        onTrade={handleTrade}
      />

      {/* 7. 1-Click Paper Trading Modal */}
      {tradePick && (
        <OrderModal
          pick={tradePick}
          isOpen={orderModalOpen}
          onClose={() => {
            setOrderModalOpen(false);
            setTradePick(null);
          }}
          onOrderSuccess={() => setPositionsOpen(true)}
        />
      )}

      {/* 8. Active Positions & Order Audit Drawer */}
      <PositionsDrawer
        isOpen={positionsOpen}
        onClose={() => setPositionsOpen(false)}
      />
    </div>
  );
}
