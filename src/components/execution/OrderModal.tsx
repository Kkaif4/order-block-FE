"use client";

import React, { useState } from "react";
import { TopPickCardOutput } from "@/lib/types";
import { api } from "@/lib/api";
import { X, Crosshair, TrendingUp, TrendingDown, ShieldCheck, AlertCircle } from "lucide-react";

interface OrderModalProps {
  pick: TopPickCardOutput;
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess?: () => void;
}

export function OrderModal({ pick, isOpen, onClose, onOrderSuccess }: OrderModalProps) {
  const isBull = pick.board === "BULLISH";
  const [side, setSide] = useState<"BUY" | "SELL">(isBull ? "BUY" : "SELL");
  const [quantity, setQuantity] = useState<number>(50);
  const [price, setPrice] = useState<number>(pick.ltp);
  const [stopLoss, setStopLoss] = useState<number>(pick.support_1);
  const [target, setTarget] = useState<number>(pick.resistance_1);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const orderValue = price * quantity;
  const riskPerShare = Math.abs(price - stopLoss);
  const rewardPerShare = Math.abs(target - price);
  const calculatedRR = riskPerShare > 0 ? (rewardPerShare / riskPerShare).toFixed(2) : "0.00";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const data = await api.placeOrder({
        symbol: pick.symbol,
        side: side,
        quantity: Number(quantity),
        price: Number(price),
        order_type: "MARKET",
        stop_loss: Number(stopLoss),
        target: Number(target),
      });

      if (!data.success) {
        throw new Error("Order execution rejected by RMS.");
      }

      setStatusMessage(`Order FILLED for ${quantity} shares of ${pick.symbol} at ₹${data.data.fill_price}!`);
      setTimeout(() => {
        onOrderSuccess?.();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Order failed. Please check inputs.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111622] border border-[#1E293B] rounded-xl max-w-lg w-full p-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#1A2234] text-[#38BDF8]">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F8FAFC]">Place Paper Order</h3>
              <p className="text-[11px] text-[#94A3B8] font-mono">{pick.symbol} · {pick.sector}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A2234] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Side Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide("BUY")}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                side === "BUY"
                  ? "bg-[#10B981] text-white shadow-md shadow-emerald-950/40"
                  : "bg-[#1A2234] text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>BUY / LONG</span>
            </button>
            <button
              type="button"
              onClick={() => setSide("SELL")}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                side === "SELL"
                  ? "bg-[#EF4444] text-white shadow-md shadow-red-950/40"
                  : "bg-[#1A2234] text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>SELL / SHORT</span>
            </button>
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#94A3B8] block mb-1">QUANTITY</label>
              <input
                type="number"
                min="1"
                max="10000"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E293B] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-[#94A3B8] block mb-1">EXECUTION PRICE (₹)</label>
              <input
                type="number"
                step="0.05"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E293B] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                required
              />
            </div>
          </div>

          {/* Stop Loss & Target */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-amber-400 block mb-1">STOP LOSS (₹)</label>
              <input
                type="number"
                step="0.05"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E293B] rounded-lg text-amber-400 focus:outline-none focus:border-amber-400"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-[#10B981] block mb-1">TAKE PROFIT (₹)</label>
              <input
                type="number"
                step="0.05"
                value={target}
                onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#1E293B] rounded-lg text-[#10B981] focus:outline-none focus:border-[#10B981]"
                required
              />
            </div>
          </div>

          {/* Risk Metrics Summary Pill */}
          <div className="p-3 rounded-lg bg-[#1A2234] border border-[#1E293B] flex items-center justify-between text-[11px]">
            <div>
              <span className="text-[#64748B] block">ORDER VALUE</span>
              <span className="text-[#F8FAFC] font-bold">₹{orderValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-[#64748B] block">RISK / REWARD</span>
              <span className="text-[#38BDF8] font-bold">1 : {calculatedRR}</span>
            </div>
            <div>
              <span className="text-[#64748B] block">TOTAL RISK</span>
              <span className="text-[#EF4444] font-bold">₹{(riskPerShare * quantity).toFixed(2)}</span>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800 text-[#EF4444] flex items-center gap-2 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-[#10B981] flex items-center gap-2 text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
              side === "BUY"
                ? "bg-[#10B981] hover:bg-emerald-600 text-white"
                : "bg-[#EF4444] hover:bg-red-600 text-white"
            }`}
          >
            {loading ? "Transmitting..." : `Submit Paper ${side} Order`}
          </button>
        </form>
      </div>
    </div>
  );
}
