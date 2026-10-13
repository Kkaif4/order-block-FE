"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PositionRecord, OrderRecord } from "@/lib/types";
import { X, Layers, Clock, CheckCircle2 } from "lucide-react";

interface PositionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PositionsDrawer({ isOpen, onClose }: PositionsDrawerProps) {
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"POSITIONS" | "ORDERS">("POSITIONS");
  const [loading, setLoading] = useState(false);

  const fetchPositionsAndOrders = useCallback(async () => {
    try {
      const [posRes, ordRes] = await Promise.all([
        fetch("http://localhost:8000/api/execution/positions", { cache: "no-store" }),
        fetch("http://localhost:8000/api/execution/orders", { cache: "no-store" }),
      ]);
      if (posRes.ok) {
        const pd = await posRes.json();
        setPositions(pd.data || []);
      }
      if (ordRes.ok) {
        const od = await ordRes.json();
        setOrders(od.data || []);
      }
    } catch (e) {
      console.warn("Failed to fetch positions/orders:", e);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const load = async () => {
      if (active) {
        await fetchPositionsAndOrders();
      }
    };
    load();

    const interval = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOpen, fetchPositionsAndOrders]);

  const handleClosePosition = async (pos: PositionRecord) => {
    setLoading(true);
    try {
      await fetch("http://localhost:8000/api/execution/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: pos.symbol,
          side: pos.side === "LONG" ? "SELL" : "BUY",
          quantity: pos.quantity,
          price: pos.current_price,
          order_type: "MARKET",
        }),
      });
      await fetchPositionsAndOrders();
    } catch (e) {
      console.error("Failed to close position:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-[#111622] border-l border-[#1E293B] h-full flex flex-col p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#1A2234] text-[#38BDF8]">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#F8FAFC]">Trading Portfolio</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A2234] active:scale-[0.95] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-xs">
          <button
            onClick={() => setActiveTab("POSITIONS")}
            className={`py-2 rounded-lg font-bold transition-all ${
              activeTab === "POSITIONS"
                ? "bg-[#1A2234] text-[#38BDF8] border border-[#38BDF8]/40"
                : "text-[#94A3B8] hover:text-[#F8FAFC] bg-[#0B0E14]"
            }`}
          >
            Active Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab("ORDERS")}
            className={`py-2 rounded-lg font-bold transition-all ${
              activeTab === "ORDERS"
                ? "bg-[#1A2234] text-[#38BDF8] border border-[#38BDF8]/40"
                : "text-[#94A3B8] hover:text-[#F8FAFC] bg-[#0B0E14]"
            }`}
          >
            Order Audit ({orders.length})
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
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-bold text-sm ${
                            isProfit ? "text-[#10B981]" : "text-[#EF4444]"
                          }`}
                        >
                          {isProfit ? `+₹${pos.unrealized_pnl.toFixed(2)}` : `-₹${Math.abs(pos.unrealized_pnl).toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-[#94A3B8] border-t border-[#1E293B] pt-2">
                      <div>
                        <span className="text-[#64748B] block">ENTRY</span>
                        <span>₹{pos.entry_price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">LTP</span>
                        <span>₹{pos.current_price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">STOP LOSS</span>
                        <span className="text-amber-400">₹{pos.stop_loss.toFixed(2)}</span>
                      </div>
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
          ) : orders.length === 0 ? (
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
                    {new Date(ord.created_at).toLocaleTimeString()}
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
          )}
        </div>
      </div>
    </div>
  );
}
