"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  PositionRecord,
  OrderRecord,
  TradeAnalyticsRecord,
  TradeSummaryResponse,
} from "@/lib/types";
import {
  X,
  Layers,
  Clock,
  CheckCircle2,
  Target,
  ShieldAlert,
  BarChart3,
  Box,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  formatMarketTime,
  formatMarketTimeWithSeconds,
  formatDuration,
} from "@/lib/timeUtils";

interface PositionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PositionsDrawer({ isOpen, onClose }: PositionsDrawerProps) {
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [trades, setTrades] = useState<TradeAnalyticsRecord[]>([]);
  const [summary, setSummary] = useState<TradeSummaryResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"POSITIONS" | "ORDERS" | "ANALYTICS">("POSITIONS");
  const [hitTypeFilter, setHitTypeFilter] = useState<"ALL" | "TARGET" | "STOP_LOSS">("ALL");
  const [loading, setLoading] = useState(false);
  const isFetchingRef = React.useRef(false);

  const fetchData = useCallback(async (forcedTab?: "POSITIONS" | "ORDERS" | "ANALYTICS") => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const currentTab = forcedTab || activeTab;

    try {
      if (currentTab === "ANALYTICS") {
        const [tradesRes, sumRes] = await Promise.all([
          api.getTradeAnalytics({ limit: 100 }).catch(() => ({ data: [] })),
          api.getTradeSummary().catch(() => ({ data: null })),
        ]);
        setTrades(tradesRes.data || []);
        if (sumRes.data) {
          setSummary(sumRes.data);
        }
      } else if (currentTab === "ORDERS") {
        const ordRes = await api.getOrders().catch(() => ({ data: [] }));
        setOrders(ordRes.data || []);
      } else {
        const [posRes, ordRes] = await Promise.all([
          api.getPositions().catch(() => ({ data: [] })),
          api.getOrders().catch(() => ({ data: [] })),
        ]);
        setPositions(posRes.data || []);
        setOrders(ordRes.data || []);
      }
    } catch (e) {
      console.warn("Failed to fetch execution & analytics data:", e);
    } finally {
      isFetchingRef.current = false;
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    void (async () => {
      if (isMounted) {
        await fetchData();
      }
    })();

    // Only active tab is polled to eliminate duplicate background fetches
    const interval = setInterval(() => {
      if (isMounted) {
        void fetchData();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, fetchData]);

  const handleClosePosition = async (pos: PositionRecord) => {
    setLoading(true);
    try {
      await api.closePosition(pos.symbol);
      await fetchData();
    } catch (e) {
      console.error("Failed to close position:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrades = trades.filter((t) => {
    if (hitTypeFilter === "ALL") return true;
    return t.hit_type === hitTypeFilter;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-[#111622] border-l border-[#1E293B] h-full flex flex-col p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#1A2234] text-[#38BDF8]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F8FAFC]">Trading Portfolio & Analytics</h3>
              <p className="text-[10px] text-[#64748B]">
                Real-time mark-to-market positions, order audit & Target/SL hit analytics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A2234] active:scale-[0.95] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-2 mb-4 font-mono text-xs">
          <button
            onClick={() => setActiveTab("POSITIONS")}
            className={`py-2 rounded-lg font-bold transition-all ${
              activeTab === "POSITIONS"
                ? "bg-[#1A2234] text-[#38BDF8] border border-[#38BDF8]/40"
                : "text-[#94A3B8] hover:text-[#F8FAFC] bg-[#0B0E14]"
            }`}
          >
            Active ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab("ORDERS")}
            className={`py-2 rounded-lg font-bold transition-all ${
              activeTab === "ORDERS"
                ? "bg-[#1A2234] text-[#38BDF8] border border-[#38BDF8]/40"
                : "text-[#94A3B8] hover:text-[#F8FAFC] bg-[#0B0E14]"
            }`}
          >
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("ANALYTICS")}
            className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "ANALYTICS"
                ? "bg-[#1A2234] text-[#38BDF8] border border-[#38BDF8]/40"
                : "text-[#94A3B8] hover:text-[#F8FAFC] bg-[#0B0E14]"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics ({trades.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs pr-1">
          {activeTab === "POSITIONS" ? (
            positions.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-[#64748B] text-center">
                <Layers className="w-8 h-8 mb-2 opacity-50" />
                <span>No open positions. Select a Top Pick to initiate paper trades.</span>
              </div>
            ) : (
              positions.map((pos) => {
                const isProfit = pos.unrealized_pnl >= 0;
                return (
                  <div
                    key={pos.position_id}
                    className="p-3.5 rounded-lg bg-[#0B0E14] border border-[#1E293B] hover:border-[#38BDF8]/30 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.side === "LONG"
                              ? "bg-emerald-500/10 text-[#10B981] border border-emerald-500/20"
                              : "bg-red-500/10 text-[#EF4444] border border-red-500/20"
                          }`}
                        >
                          {pos.side}
                        </span>
                        <span className="font-bold text-sm text-[#F8FAFC] font-sans">
                          {pos.symbol}
                        </span>
                        <span className="text-[#94A3B8]">x{pos.quantity}</span>
                        {(pos.chart_total_obs !== undefined && pos.chart_total_obs > 0) && (
                          <span
                            title={`${pos.chart_fresh_obs || 0} Fresh, ${pos.chart_mitigated_obs || 0} Mitigated`}
                            className="px-1.5 py-0.5 rounded bg-[#1A2234] border border-[#1E293B] text-[10px] text-[#38BDF8]"
                          >
                            {pos.chart_total_obs} OBs
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-bold text-sm ${
                            isProfit ? "text-[#10B981]" : "text-[#EF4444]"
                          }`}
                        >
                          {isProfit
                            ? `+₹${pos.unrealized_pnl.toFixed(2)}`
                            : `-₹${Math.abs(pos.unrealized_pnl).toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-[10px] text-[#94A3B8] border-t border-[#1E293B] pt-2">
                      <div>
                        <span className="text-[#64748B] block">ENTRY</span>
                        <span>₹{pos.entry_price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">LTP</span>
                        <span>₹{pos.current_price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">TARGET</span>
                        <span className="text-[#10B981]">₹{(pos.target || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">STOP LOSS</span>
                        <span className="text-amber-400">₹{(pos.stop_loss || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#38BDF8]" />
                        <span>Opened: {formatMarketTime(pos.opened_at)}</span>
                      </div>
                      {pos.active_ob_formed_at && (
                        <span>OB Formed: {formatMarketTime(pos.active_ob_formed_at)}</span>
                      )}
                    </div>

                    <button
                      disabled={loading}
                      onClick={() => handleClosePosition(pos)}
                      className="mt-1 w-full py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[#EF4444] text-[11px] font-bold active:scale-[0.98] transition-all font-sans"
                    >
                      Close Position (Market)
                    </button>
                  </div>
                );
              })
            )
          ) : activeTab === "ORDERS" ? (
            orders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-[#64748B] text-center">
                <Clock className="w-8 h-8 mb-2 opacity-50" />
                <span>No order history recorded yet.</span>
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.order_id}
                  className="p-3 rounded-lg bg-[#0B0E14] border border-[#1E293B] text-[11px] flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          ord.side === "BUY" ? "text-[#10B981]" : "text-[#EF4444]"
                        }`}
                      >
                        {ord.side}
                      </span>
                      <span className="font-bold text-[#F8FAFC] font-sans">{ord.symbol}</span>
                      <span className="text-[#94A3B8]">x{ord.quantity}</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      {formatMarketTimeWithSeconds(ord.created_at)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-[#F8FAFC]">₹{ord.fill_price || ord.price}</div>
                    <div className="flex items-center gap-1 text-[10px]">
                      {ord.status === "FILLED" ? (
                        <span className="text-[#10B981] flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          FILLED
                        </span>
                      ) : (
                        <span className="text-[#EF4444]">{ord.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            /* ANALYTICS TAB: Target/SL Hit timing and OB Density correlation */
            <div className="space-y-3">
              {/* Summary KPIs */}
              {summary && (
                <div className="grid grid-cols-4 gap-2 p-3 bg-[#0B0E14] border border-[#1E293B] rounded-lg">
                  <div>
                    <span className="text-[10px] text-[#64748B] block">WIN RATE</span>
                    <span className="text-sm font-bold text-[#10B981]">
                      {summary.win_rate_pct}%
                    </span>
                    <span className="text-[9px] text-[#94A3B8] block">
                      {summary.target_hits}W / {summary.stop_loss_hits}L
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#64748B] block">REALIZED PNL</span>
                    <span
                      className={`text-sm font-bold ${
                        summary.total_realized_pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                      }`}
                    >
                      {summary.total_realized_pnl >= 0 ? "+" : ""}₹
                      {summary.total_realized_pnl.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-[#94A3B8] block">
                      Avg RR: {summary.avg_r_multiple}R
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#64748B] block">TARGET HITS</span>
                    <span className="text-sm font-bold text-[#38BDF8]">
                      {summary.target_hits}
                    </span>
                    <span className="text-[9px] text-[#64748B] block">
                      SL: {summary.stop_loss_hits}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#64748B] block">AVG CHART OBS</span>
                    <span className="text-sm font-bold text-[#F8FAFC]">
                      {summary.avg_obs_winning_trades}
                    </span>
                    <span className="text-[9px] text-[#64748B] block">
                      Win vs {summary.avg_obs_losing_trades} Loss
                    </span>
                  </div>
                </div>
              )}

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => setHitTypeFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                    hitTypeFilter === "ALL"
                      ? "bg-[#1A2234] text-[#38BDF8] border border-[#38BDF8]/40"
                      : "bg-[#0B0E14] text-[#94A3B8] border border-[#1E293B]"
                  }`}
                >
                  All ({trades.length})
                </button>
                <button
                  onClick={() => setHitTypeFilter("TARGET")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                    hitTypeFilter === "TARGET"
                      ? "bg-emerald-500/20 text-[#10B981] border border-emerald-500/40"
                      : "bg-[#0B0E14] text-[#94A3B8] border border-[#1E293B]"
                  }`}
                >
                  <Target className="w-3 h-3" />
                  <span>Target Hits ({summary?.target_hits || 0})</span>
                </button>
                <button
                  onClick={() => setHitTypeFilter("STOP_LOSS")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                    hitTypeFilter === "STOP_LOSS"
                      ? "bg-red-500/20 text-[#EF4444] border border-red-500/40"
                      : "bg-[#0B0E14] text-[#94A3B8] border border-[#1E293B]"
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>Stop-Loss Hits ({summary?.stop_loss_hits || 0})</span>
                </button>
              </div>

              {/* Trade Records List */}
              {filteredTrades.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-[#64748B] text-center">
                  <Target className="w-8 h-8 mb-2 opacity-50" />
                  <span>No trade analytics recorded for this filter.</span>
                </div>
              ) : (
                filteredTrades.map((t) => {
                  const isTarget = t.hit_type === "TARGET";
                  const isSL = t.hit_type === "STOP_LOSS";
                  const isProfit = t.realized_pnl > 0;

                  return (
                    <div
                      key={t.trade_id}
                      className="p-3.5 rounded-lg bg-[#0B0E14] border border-[#1E293B] hover:border-[#38BDF8]/30 transition-all flex flex-col gap-2.5"
                    >
                      {/* Top Row: Symbol, Hit Badge, Realized PnL */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.side === "LONG"
                                ? "bg-emerald-500/10 text-[#10B981] border border-emerald-500/20"
                                : "bg-red-500/10 text-[#EF4444] border border-red-500/20"
                            }`}
                          >
                            {t.side}
                          </span>
                          <span className="font-bold text-sm text-[#F8FAFC] font-sans">
                            {t.symbol}
                          </span>
                          <span className="text-[#94A3B8]">x{t.quantity}</span>

                          {/* Hit Type Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${
                              isTarget
                                ? "bg-emerald-500/15 text-[#10B981] border-emerald-500/30"
                                : isSL
                                ? "bg-red-500/15 text-[#EF4444] border-red-500/30"
                                : "bg-slate-700/30 text-[#94A3B8] border-slate-600/30"
                            }`}
                          >
                            {isTarget ? (
                              <>
                                <Target className="w-3 h-3" />
                                <span>TARGET HIT</span>
                              </>
                            ) : isSL ? (
                              <>
                                <ShieldAlert className="w-3 h-3" />
                                <span>STOP-LOSS HIT</span>
                              </>
                            ) : (
                              <span>MANUAL CLOSE</span>
                            )}
                          </span>
                        </div>

                        {/* Realized PnL & R-Multiple */}
                        <div className="text-right">
                          <div
                            className={`font-bold text-sm ${
                              isProfit ? "text-[#10B981]" : "text-[#EF4444]"
                            }`}
                          >
                            {isProfit ? `+₹${t.realized_pnl.toFixed(2)}` : `-₹${Math.abs(t.realized_pnl).toFixed(2)}`}
                            <span className="text-[10px] ml-1 opacity-80">
                              ({t.return_pct > 0 ? `+${t.return_pct}%` : `${t.return_pct}%`})
                            </span>
                          </div>
                          <div className="text-[10px] text-[#38BDF8] font-bold">
                            {t.r_multiple_achieved > 0 ? `+${t.r_multiple_achieved}R` : `${t.r_multiple_achieved}R`}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Hit Timestamp & Holding Duration */}
                      <div className="flex items-center justify-between text-[11px] bg-[#111622] p-2 rounded border border-[#1E293B]">
                        <div className="flex items-center gap-1.5 text-[#94A3B8]">
                          <Clock className="w-3 h-3 text-[#38BDF8]" />
                          <span className="text-[#64748B]">Hit / Exit Time:</span>
                          <span className="text-[#F8FAFC] font-bold">
                            {formatMarketTimeWithSeconds(t.exit_time)}
                          </span>
                        </div>
                        <div className="text-[#94A3B8]">
                          <span className="text-[#64748B]">Holding: </span>
                          <span className="text-[#F8FAFC] font-semibold">
                            {formatDuration(t.holding_seconds)}
                          </span>
                        </div>
                      </div>

                      {/* Trade Execution Price Levels */}
                      <div className="grid grid-cols-4 gap-2 text-[10px] text-[#94A3B8] border-t border-[#1E293B] pt-2">
                        <div>
                          <span className="text-[#64748B] block">ENTRY</span>
                          <span>₹{t.entry_price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block">EXIT</span>
                          <span className="text-[#F8FAFC] font-semibold">₹{t.exit_price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block">TARGET</span>
                          <span className="text-[#10B981]">₹{t.target_price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block">STOP LOSS</span>
                          <span className="text-amber-400">₹{t.stop_loss_price.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Chart Order Block Statistics Snapshot */}
                      <div className="border-t border-[#1E293B] pt-2 text-[10px] flex items-center justify-between text-[#64748B]">
                        <div className="flex items-center gap-1.5">
                          <Box className="w-3 h-3 text-[#38BDF8]" />
                          <span>Chart OBs: </span>
                          <span className="text-[#F8FAFC] font-bold">
                            {t.chart_total_obs} Total
                          </span>
                          <span className="text-[#94A3B8]">
                            ({t.chart_fresh_obs} Fresh, {t.chart_mitigated_obs} Mitigated, {t.chart_invalidated_obs} Invalidated)
                          </span>
                        </div>

                        {t.active_ob_formed_at && (
                          <div className="text-[9px] text-[#64748B]">
                            OB Formed: <strong className="text-[#94A3B8]">{formatMarketTime(t.active_ob_formed_at)}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
