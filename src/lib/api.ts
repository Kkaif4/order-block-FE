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
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "https://orderblock-backend-latest.onrender.com";

const defaultWsUrl = API_BASE_URL.startsWith("https://")
  ? `${API_BASE_URL.replace(/^https:\/\//, "wss://")}/ws/telemetry`
  : `${API_BASE_URL.replace(/^http:\/\//, "ws://")}/ws/telemetry`;

let rawWsUrl = process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl;
// Sanitize any malformed wss:/ or ws:/ single-slash prefix
rawWsUrl = rawWsUrl.replace(/^wss:\/([^\/])/, "wss://$1").replace(/^ws:\/([^\/])/, "ws://$1");

// Auto-guard: browsers reject wss:// to unencrypted localhost/127.0.0.1
if (rawWsUrl.includes("localhost") || rawWsUrl.includes("127.0.0.1")) {
  rawWsUrl = rawWsUrl.replace(/^wss:\/\//, "ws://");
}

export const WS_BASE_URL = rawWsUrl;

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
  direction?: "BULLISH" | "BEARISH";
  invalidation_level?: number;
  stop_loss_level?: number;
  target_level?: number;
  support_1?: number;
  resistance_1?: number;
  vwap?: number;
  ob_formed_at?: string;
  ob_confirmed_at?: string;
  ob_state?: string;
  chart_total_obs?: number;
  chart_fresh_obs?: number;
  chart_mitigated_obs?: number;
  chart_invalidated_obs?: number;
  order_blocks: OrderBlockZone[];
  auto_paper_trade?: Record<string, unknown> | null;
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

export interface ApiFetchOptions extends RequestInit {
  forceRefresh?: boolean;
}

// In-flight promise tracker for deduplication of concurrent identical GET requests
const inFlightRequests = new Map<string, Promise<unknown>>();

// Short-lived response cache to prevent duplicate requests across rapid re-renders / mountings
const responseCache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL_MS = 1500; // 1.5 seconds deduplication window

export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(pattern)) {
      responseCache.delete(key);
    }
  }
}

/**
 * Generic fetch wrapper with standard error handling, deduplication of concurrent in-flight GET requests,
 * and short-lived caching for duplicate prevention.
 */
async function apiFetch<T>(endpoint: string, options?: ApiFetchOptions): Promise<T> {
  const method = (options?.method || "GET").toUpperCase();
  const url = `${API_BASE_URL}${endpoint}`;
  const isGet = method === "GET";

  // Check cache and in-flight requests for idempotent GET calls
  if (isGet && !options?.forceRefresh) {
    const cached = responseCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }
    const ongoing = inFlightRequests.get(url);
    if (ongoing) {
      return ongoing as Promise<T>;
    }
  }

  const executeFetch = async (): Promise<T> => {
    try {
      const fetchOptions = { ...options };
      delete fetchOptions.forceRefresh;
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(fetchOptions.headers || {}),
        },
        ...fetchOptions,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`API Error [${res.status}] ${endpoint}: ${errorText}`);
      }

      const data = (await res.json()) as T;
      if (isGet) {
        responseCache.set(url, { timestamp: Date.now(), data });
      } else {
        // Invalidate execution and analytics caches on mutations
        if (endpoint.includes("/execution")) {
          invalidateApiCache("/execution");
          invalidateApiCache("/analytics");
        }
      }
      return data;
    } finally {
      if (isGet) {
        inFlightRequests.delete(url);
      }
    }
  };

  if (isGet && !options?.forceRefresh) {
    const promise = executeFetch();
    inFlightRequests.set(url, promise as Promise<unknown>);
    return promise;
  }

  return executeFetch();
}

export const api = {
  /**
   * Health & Broker Telemetry
   */
  async getHealth(options?: ApiFetchOptions): Promise<SystemHealthResponse> {
    return apiFetch<SystemHealthResponse>("/api/health", options);
  },

  /**
   * Complete Boards Snapshot (Bullish, Bearish, Picks, Breadth Dots)
   */
  async getBoards(options?: ApiFetchOptions): Promise<BoardSnapshot> {
    return apiFetch<BoardSnapshot>("/api/boards", options);
  },

  /**
   * 5m Candles & Detected Order Block Zones for a Stock
   */
  async getStockChart(symbol: string, options?: ApiFetchOptions): Promise<StockChartResponse> {
    return apiFetch<StockChartResponse>(`/api/stock/${encodeURIComponent(symbol)}/chart`, options);
  },

  /**
   * Virtual Account Summary (Equity, Margin, Daily PnL, Kill-Switch)
   */
  async getAccountSummary(options?: ApiFetchOptions): Promise<{ success: boolean; data: AccountSummary }> {
    return apiFetch<{ success: boolean; data: AccountSummary }>("/api/execution/account", options);
  },

  /**
   * Open Positions with Unrealized PnL
   */
  async getPositions(options?: ApiFetchOptions): Promise<{ success: boolean; count: number; data: PositionRecord[] }> {
    return apiFetch<{ success: boolean; count: number; data: PositionRecord[] }>("/api/execution/positions", options);
  },

  /**
   * Order History
   */
  async getOrders(options?: ApiFetchOptions): Promise<{ success: boolean; count: number; data: OrderRecord[] }> {
    return apiFetch<{ success: boolean; count: number; data: OrderRecord[] }>("/api/execution/orders", options);
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
  async getTradeAnalytics(
    params?: { symbol?: string; hitType?: string; limit?: number },
    options?: ApiFetchOptions
  ): Promise<{
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
    }>(`/api/analytics/trades${qs}`, options);
  },

  /**
   * Aggregated Trade Performance & Order Block Density Correlation
   */
  async getTradeSummary(options?: ApiFetchOptions): Promise<{
    success: boolean;
    data: import("@/lib/types").TradeSummaryResponse;
  }> {
    return apiFetch<{
      success: boolean;
      data: import("@/lib/types").TradeSummaryResponse;
    }>("/api/analytics/summary", options);
  },

  /**
   * Count of Order Blocks placed on the chart for a given stock
   */
  async getStockObStats(symbol: string, options?: ApiFetchOptions): Promise<{
    success: boolean;
    data: import("@/lib/types").StockObStatsResponse;
  }> {
    return apiFetch<{
      success: boolean;
      data: import("@/lib/types").StockObStatsResponse;
    }>(`/api/stock/${encodeURIComponent(symbol)}/ob-stats`, options);
  },

  /**
   * Symbol specific 1-share paper trade status and history
   */
  async getSymbolAnalytics(symbol: string, options?: ApiFetchOptions): Promise<import("@/lib/types").SymbolAnalyticsResponse> {
    return apiFetch<import("@/lib/types").SymbolAnalyticsResponse>(
      `/api/execution/analytics/${encodeURIComponent(symbol)}`,
      options
    );
  },
};

export const apiClient = api;
