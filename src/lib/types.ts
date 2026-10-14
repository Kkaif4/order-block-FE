/**
 * OrderBlock TypeScript Domain Interfaces
 * File: frontend/src/lib/types.ts
 * Strictly mirrors backend schemas with zero `any` types.
 * Adheres strictly to docs/FE_rulebook.md.
 */

export type BoardType = "BULLISH" | "BEARISH";
export type CycleQuality = "ACCEPTED" | "DEGRADED" | "REJECTED";
export type BuildupType = "LONG BUILD-UP" | "SHORT BUILD-UP" | "SHORT COVERING" | "LONG UNWINDING" | "NEUTRAL";
export type ZoneState = "FRESH" | "MITIGATED" | "INVALIDATED";
export type WebSocketConnectionState = "CONNECTING" | "LIVE" | "STALE" | "DISCONNECTED";

export interface Candle5m {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface OrderBlockZone {
  zone_id: string;
  symbol: string;
  direction: BoardType;
  detection_time: string;
  confirmation_time: string;
  zone_high: number;
  zone_low: number;
  invalidation_level: number;
  state: ZoneState;
  touch_count: number;
  invalidation_reason?: string | null;
  displacement_ratio?: number;
}

export interface StockRankOutput {
  symbol: string;
  ltp: number;
  open: number;
  unrounded_change_pct: number;
  display_change_pct: number;
  raw_baseline: number;
  effective_baseline: number;
  guard_threshold: number;
  guard_applied: boolean;
  upward_excursion: number;
  downward_excursion: number;
  imbalance_passed: boolean;
  raw_score: number;
  effective_score: number;
  display_score: number;
  rank: number;
  percentile: number;
  board: BoardType;
  sector: string;
  initials: string;
  buildup: BuildupType;
  oi_change_pct: number;
  oi_net_delta: number;
  conviction_score: number;
  candidate_scores?: Record<string, number>;
}

export interface TopPickCardOutput {
  symbol: string;
  board: BoardType;
  rank: number;
  sector: string;
  ltp: number;
  change_pct: number;
  conviction_score: number;
  buildup: BuildupType;
  oi_change_pct: number;
  oi_net_delta: number;
  support_1: number;
  zone_low: number;
  zone_high: number;
  resistance_1: number;
  resistance_2: number;
  risk_reward: number;
  vwap: number;
  mini_chart_candles?: Candle5m[];
  ob_formed_at?: string;
  ob_confirmed_at?: string;
  ob_state?: ZoneState;
}

export interface BeeSwarmDot {
  symbol: string;
  change_pct: number;
  stack_y: number;
  is_pick: boolean;
  event_risk: boolean;
  board: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface SynchronizationAudit {
  reference_timestamp_utc: string;
  oldest_timestamp_utc: string | null;
  newest_timestamp_utc: string | null;
  max_skew_seconds: number;
  stale_count: number;
  quality: CycleQuality;
  published: boolean;
  rejection_reason?: string | null;
}

export interface BoardSnapshot {
  timestamp: string;
  contractual_universe_size: number;
  received_snapshot_count: number;
  valid_snapshot_count: number;
  eligible_count: number;
  published_bullish_count: number;
  published_bearish_count: number;
  boards_published: boolean;
  synchronization: SynchronizationAudit;
  bullish_board: StockRankOutput[];
  bearish_board: StockRankOutput[];
  bullish_picks: TopPickCardOutput[];
  bearish_picks: TopPickCardOutput[];
  bee_swarm_dots: BeeSwarmDot[];
}

export interface AccountSummary {
  initial_capital: number;
  cash_balance: number;
  equity: number;
  margin_used: number;
  available_margin: number;
  unrealized_pnl: number;
  open_positions_count: number;
  kill_switch_active: boolean;
  realized_daily_loss: number;
}

export interface OrderRecord {
  order_id: string;
  symbol: string;
  side: "BUY" | "SELL";
  order_type: "MARKET" | "LIMIT" | "SL";
  quantity: number;
  price: number;
  stop_loss: number;
  target: number;
  status: "PENDING" | "FILLED" | "CANCELLED" | "REJECTED";
  fill_price: number;
  created_at: string;
  filled_at?: string | null;
  metadata?: Record<string, string | number>;
}

export interface PositionRecord {
  position_id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  stop_loss: number;
  target: number;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  closed_at?: string | null;
}

export interface StockChartResponse {
  symbol: string;
  candles: Candle5m[];
  zone_high: number;
  zone_low: number;
  invalidation_level: number;
  target_level: number;
  vwap: number;
  order_blocks: OrderBlockZone[];
}
