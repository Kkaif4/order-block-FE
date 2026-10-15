"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TopPickCardOutput, Candle5m, ZoneState } from "@/lib/types";
import { useOrderBlockSocket } from "@/lib/useOrderBlockSocket";
import { api } from "@/lib/api";
import { HeaderTelemetryBar } from "@/components/telemetry/HeaderTelemetryBar";
import { AccountSummaryBar } from "@/components/execution/AccountSummaryBar";
import { OrderModal } from "@/components/execution/OrderModal";
import { PositionsDrawer } from "@/components/execution/PositionsDrawer";
import { BeeSwarmBreadth } from "@/components/boards/BeeSwarmBreadth";
import { TopPickCard } from "@/components/boards/TopPickCard";
import { FullScreenChartModal } from "@/components/boards/FullScreenChartModal";
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
  const inspectingSymbolRef = React.useRef<string | null>(null);

  const handleInspect = async (symbol: string) => {
    if (!data) return;
    if (inspectingSymbolRef.current === symbol) return;
    inspectingSymbolRef.current = symbol;

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
                  stop_loss: chartData.stop_loss_level ?? chartData.invalidation_level ?? prev.stop_loss,
                  target: chartData.target_level ?? prev.target,
                  support_1: chartData.support_1 ?? prev.support_1,
                  resistance_1: chartData.resistance_1 ?? prev.resistance_1,
                  vwap: chartData.vwap ?? prev.vwap,
                  ob_formed_at: chartData.ob_formed_at ?? prev.ob_formed_at,
                  ob_confirmed_at: chartData.ob_confirmed_at ?? prev.ob_confirmed_at,
                  ob_state: (chartData.ob_state as ZoneState) ?? prev.ob_state,
                  chart_total_obs: chartData.chart_total_obs ?? prev.chart_total_obs,
                  chart_fresh_obs: chartData.chart_fresh_obs ?? prev.chart_fresh_obs,
                  chart_mitigated_obs: chartData.chart_mitigated_obs ?? prev.chart_mitigated_obs,
                  chart_invalidated_obs: chartData.chart_invalidated_obs ?? prev.chart_invalidated_obs,
                }
              : null
          );
        }
      } catch (err) {
        console.error("Failed to load chart for", symbol, err);
      } finally {
        inspectingSymbolRef.current = null;
      }
    } else {
      inspectingSymbolRef.current = null;
    }
  };

  const handleTrade = (pick: TopPickCardOutput) => {
    setTradePick(pick);
    setOrderModalOpen(true);
  };

  const filteredBullishPicks = useMemo(() => {
    if (!data) return [];
    const picks = data.bullish_picks.slice(0, 20);
    if (!searchQuery) return picks;
    const q = searchQuery.toUpperCase();
    return picks.filter((s) => s.symbol.includes(q) || s.sector.includes(q));
  }, [data, searchQuery]);

  const filteredBearishPicks = useMemo(() => {
    if (!data) return [];
    const picks = data.bearish_picks.slice(0, 20);
    if (!searchQuery) return picks;
    const q = searchQuery.toUpperCase();
    return picks.filter((s) => s.symbol.includes(q) || s.sector.includes(q));
  }, [data, searchQuery]);

  const [syncElapsed, setSyncElapsed] = useState(0);

  useEffect(() => {
    if (data) return;
    const timer = setInterval(() => {
      setSyncElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [data]);

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3 max-w-md text-center px-4">
          <div className="w-8 h-8 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm text-[#F8FAFC]">Syncing OrderBlock Terminal...</span>
          <span className="font-mono text-xs text-[#94A3B8]">
            Status: {connectionState} {syncElapsed > 3 ? `(${syncElapsed}s)` : ""}
          </span>
          {syncElapsed > 5 && (
            <div className="flex flex-col items-center gap-2 mt-1">
              <span className="text-[11px] text-amber-400/90 font-mono">
                Connecting to backend feeds. Render free-tier spins up in ~30s on cold start.
              </span>
              <button
                onClick={reconnect}
                className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#1A2234] hover:bg-[#243048] border border-[#38BDF8]/40 text-[#38BDF8] text-xs font-mono transition-all active:scale-95"
              >
                Retry Sync Now
              </button>
            </div>
          )}
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
        onOpenPositions={() => setPositionsOpen(true)}
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
            All Top Picks ({filteredBullishPicks.length + filteredBearishPicks.length})
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
            <span>Bullish Top 20 ({filteredBullishPicks.length})</span>
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
            <span>Bearish Top 20 ({filteredBearishPicks.length})</span>
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
                TOP 20 PICKS (SECTOR DIVERSIFIED)
              </div>
            </div>

            {/* Top Picks Hero Cards (Top 20 Exclusive View) */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] mb-2.5 uppercase">
                <span className="text-[#10B981] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  High Conviction · Top 20 Bullish Stocks (R:R ≥ 1:2.0)
                </span>
                <span>Ranks #1 – #{filteredBullishPicks.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 max-h-[860px] overflow-y-auto pr-1">
                {filteredBullishPicks.map((pick) => (
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
                TOP 20 PICKS (HIGH CONVICTION · R:R ≥ 1:2.0)
              </div>
            </div>

            {/* Top Picks Hero Cards (Top 20 Exclusive View) */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] mb-2.5 uppercase">
                <span className="text-[#EF4444] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  High Conviction · Top 20 Bearish Stocks (R:R ≥ 1:2.0)
                </span>
                <span>Ranks #1 – #{filteredBearishPicks.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 max-h-[860px] overflow-y-auto pr-1">
                {filteredBearishPicks.map((pick) => (
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
          </section>
        )}
      </div>

      {/* 6. Full-Screen SMC Candlestick Chart with 28% Sidebar */}
      <FullScreenChartModal
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
