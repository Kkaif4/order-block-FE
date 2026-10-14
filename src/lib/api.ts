/**
 * Centralized API & WebSocket Gateway Client
 * File: frontend/src/lib/api.ts
 *
 * All frontend HTTP and WebSocket communication is strictly centralized through this client.
 * Configured dynamically via NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL.
 * Adheres strictly to docs/FE_rulebook.md.
 */

import {
  BoardSnapshot,
  Candle5m,
  OrderBlockZone,
  AccountSummary,
  PositionRecord,
  OrderRecord,
} from "@/lib/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || `${API_BASE_URL.replace(/^http/, "ws")}/ws/telemetry`;

export interface SystemHealthResponse {
  status: string;
  market_state: string;
  feed_latency_ms: number;
  engine_version: string;
  feed_provider: string;
  universe_size: number;
  connected_ws_clients: number;
  broker_auth: {
    valid: boolean;
    expires_at_utc: string | null;
    seconds_remaining: number;
  };
  rms_state: {
    kill_switch_active: boolean;
    open_positions: number;
  };
}

export interface StockChartResponse {
  symbol: string;
  candles: Candle5m[];
  zone_high?: number;
  zone_low?: number;
  invalidation_level?: number;
  target_level?: number;
  vwap?: number;
  order_blocks: OrderBlockZone[];
}

export interface OrderPlacementPayload {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  order_type: "MARKET" | "LIMIT" | "SL";
  stop_loss?: number;
  target?: number;
}

/**
 * Generic fetch wrapper with standard error handling and no-cache policy
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`API Error [${res.status}] ${endpoint}: ${errorText}`);
  }

  return res.json();
}

export const api = {
  /**
   * Health & Broker Telemetry
   */
  async getHealth(): Promise<SystemHealthResponse> {
    return apiFetch<SystemHealthResponse>("/api/health");
  },

  /**
   * Complete Boards Snapshot (Bullish, Bearish, Picks, Breadth Dots)
   */
  async getBoards(): Promise<BoardSnapshot> {
    return apiFetch<BoardSnapshot>("/api/boards");
  },

  /**
   * 5m Candles & Detected Order Block Zones for a Stock
   */
  async getStockChart(symbol: string): Promise<StockChartResponse> {
    return apiFetch<StockChartResponse>(`/api/stock/${encodeURIComponent(symbol)}/chart`);
  },

  /**
   * Virtual Account Summary (Equity, Margin, Daily PnL, Kill-Switch)
   */
  async getAccountSummary(): Promise<{ success: boolean; data: AccountSummary }> {
    return apiFetch<{ success: boolean; data: AccountSummary }>("/api/execution/account");
  },

  /**
   * Open Positions with Unrealized PnL
   */
  async getPositions(): Promise<{ success: boolean; count: number; data: PositionRecord[] }> {
    return apiFetch<{ success: boolean; count: number; data: PositionRecord[] }>("/api/execution/positions");
  },

  /**
   * Order History
   */
  async getOrders(): Promise<{ success: boolean; count: number; data: OrderRecord[] }> {
    return apiFetch<{ success: boolean; count: number; data: OrderRecord[] }>("/api/execution/orders");
  },

  /**
   * Place Simulated Order with RMS Validation
   */
  async placeOrder(payload: OrderPlacementPayload): Promise<{ success: boolean; data: OrderRecord }> {
    return apiFetch<{ success: boolean; data: OrderRecord }>("/api/execution/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Emergency Circuit Breaker: Flattens open positions, halts orders
   */
  async triggerKillSwitch(): Promise<{ success: boolean; data: { kill_switch_engaged: boolean } }> {
    return apiFetch<{ success: boolean; data: { kill_switch_engaged: boolean } }>("/api/execution/kill-switch", {
      method: "POST",
    });
  },

  /**
   * Reset Kill Switch and Restore Normal Trading
   */
  async resetKillSwitch(): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>("/api/execution/kill-switch/reset", {
      method: "POST",
    });
  },
};
