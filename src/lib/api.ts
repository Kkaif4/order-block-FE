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
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "https://order-block-backend-latest.onrender.com";

const defaultWsUrl = API_BASE_URL.startsWith("https://")
  ? `${API_BASE_URL.replace(/^https:\/\//, "wss://")}/ws/telemetry`
  : `${API_BASE_URL.replace(/^http:\/\//, "ws://")}/ws/telemetry`;

export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl;

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
  ob_formed_at?: string;
  ob_confirmed_at?: string;
  ob_state?: string;
  chart_total_obs?: number;
  chart_fresh_obs?: number;
  chart_mitigated_obs?: number;
  chart_invalidated_obs?: number;
  order_blocks: OrderBlockZone[];
  auto_paper_trade?: Record<string, any> | null;
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

  /**
   * Close a specific open position manually
   */
  async closePosition(symbol: string): Promise<{ success: boolean; data: OrderRecord }> {
    return apiFetch<{ success: boolean; data: OrderRecord }>(`/api/execution/positions/${encodeURIComponent(symbol)}/close`, {
      method: "POST",
    });
  },

  /**
   * Historical Trade Analytics with Target/SL hit timing & OB counts
   */
  async getTradeAnalytics(params?: { symbol?: string; hitType?: string; limit?: number }): Promise<{
    success: boolean;
    count: number;
    data: import("@/lib/types").TradeAnalyticsRecord[];
  }> {
    const query = new URLSearchParams();
    if (params?.symbol) query.set("symbol", params.symbol);
    if (params?.hitType) query.set("hit_type", params.hitType);
    if (params?.limit) query.set("limit", params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<{
      success: boolean;
      count: number;
      data: import("@/lib/types").TradeAnalyticsRecord[];
    }>(`/api/analytics/trades${qs}`);
  },

  /**
   * Aggregated Trade Performance & Order Block Density Correlation
   */
  async getTradeSummary(): Promise<{
    success: boolean;
    data: import("@/lib/types").TradeSummaryResponse;
  }> {
    return apiFetch<{
      success: boolean;
      data: import("@/lib/types").TradeSummaryResponse;
    }>("/api/analytics/summary");
  },

  /**
   * Count of Order Blocks placed on the chart for a given stock
   */
  async getStockObStats(symbol: string): Promise<{
    success: boolean;
    data: import("@/lib/types").StockObStatsResponse;
  }> {
    return apiFetch<{
      success: boolean;
      data: import("@/lib/types").StockObStatsResponse;
    }>(`/api/stock/${encodeURIComponent(symbol)}/ob-stats`);
  },

  /**
   * Symbol specific 1-share paper trade status and history
   */
  async getSymbolAnalytics(symbol: string): Promise<import("@/lib/types").SymbolAnalyticsResponse> {
    return apiFetch<import("@/lib/types").SymbolAnalyticsResponse>(
      `/api/execution/analytics/${encodeURIComponent(symbol)}`
    );
  },
};

export const apiClient = api;
