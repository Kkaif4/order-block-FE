# Frontend Complete Master Reference ("Everything" Document)

This master document provides an exhaustive reference for the frontend architecture, component specifications, TypeScript data types, and charting implementations of the **OrderBlock Market Scanner & Intelligence Engine**.

---

## 1. Directory & File Organization

```
frontend/
├── public/                      # Static assets, icons, fonts
├── src/
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css          # Tailwind CSS directives & global scrollbar styles
│   │   ├── layout.tsx           # Root metadata & layout shell
│   │   └── page.tsx             # Main dashboard controller with dual boards & swarm
│   ├── components/
│   │   ├── boards/
│   │   │   ├── BeeSwarmBreadth.tsx   # D3/SVG market breadth dispersion swarm
│   │   │   ├── DepthBricks.tsx       # Segmented visual conviction strength meter
│   │   │   ├── InspectionDrawer.tsx  # Deep-dive drawer with D_50 formulas & chart
│   │   │   └── TopPickCard.tsx       # High-conviction pick summary card
│   │   └── charts/
│   │       └── PriceChart.tsx        # 5m candlestick chart with Order Block overlays
│   └── lib/
│       └── types.ts             # TypeScript domain definitions mirroring backend
├── next.config.ts               # Next.js bundler configuration & API proxies
├── package.json                 # React 19, Next.js 15, Lucide-react, Tailwind CSS
├── tsconfig.json                # Strict TypeScript configuration
└── eslint.config.mjs            # ESLint rules
```

---

## 2. TypeScript Data Interfaces (`src/lib/types.ts`)

### `StockRankOutput`
Represents an individual stock ranked on either the Bullish or Bearish board.
```typescript
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
  board: "BULLISH" | "BEARISH";
  sector: string;
  initials: string;
  buildup: "LONG BUILD-UP" | "SHORT BUILD-UP" | "SHORT COVERING" | "LONG UNWINDING" | "NEUTRAL";
  oi_change_pct: number;
  oi_net_delta: number;
  conviction_score: number;
  candidate_scores?: Record<string, number>;
}
```

### `TopPickCardOutput`
Presents a synthesized top pick with structural boundaries and risk metrics.
```typescript
export interface TopPickCardOutput {
  symbol: string;
  board: "BULLISH" | "BEARISH";
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
}
```

### `BeeSwarmDot`
Lightweight payload for rendering the market-wide breadth dispersion plot.
```typescript
export interface BeeSwarmDot {
  symbol: string;
  change_pct: number;
  stack_y: number;
  is_pick: boolean;
  event_risk: boolean;
  board: "BULLISH" | "BEARISH" | "NEUTRAL";
}
```

---

## 3. UI Component Specifications

### 3.1 `page.tsx` (Dashboard Controller)
- **Role:** Central page coordinator.
- **State Management:**
  - `snapshot`: Holds latest `BoardSnapshot`.
  - `selectedStock`: Selected symbol for inspection drawer.
  - `activeTab`: Filter board views (`ALL`, `BULLISH`, `BEARISH`).
  - `wsStatus`: Connection status indicator (`CONNECTED`, `CONNECTING`, `DISCONNECTED`).
- **Data Fetching:** Initiates fetch to `/api/boards` on mount, connects to `ws://localhost:8000/ws/telemetry` for live updates.

---

### 3.2 `BeeSwarmBreadth.tsx`
- **Role:** Visualizes the market's collective momentum and dispersion.
- **X-Axis:** Intraday percentage change ($\Delta C_\%$), centered at 0.0%, spanning $-6.0\%$ to $+6.0\%$.
- **Y-Axis:** Collision-avoidance stack offset so multiple stocks at the same price change do not obscure each other.
- **Styling:**
  - Bullish dots: Emerald `#10B981`
  - Bearish dots: Crimson `#EF4444`
  - Neutral dots: Slate `#64748B`
  - Top Pick dots: Pulsing accent glow border `#38BDF8` with ring animation.

---

### 3.3 `TopPickCard.tsx`
- **Role:** High-density institutional summary card for prime trading setups.
- **Header:** Initials badge, ticker symbol, sector tag, board rank badge (`#1`, `#2`, etc.).
- **Price Block:** LTP and percentage change pill with color indicator.
- **Microstructure Section:**
  - Support & Resistance pivot levels.
  - Detected Order Block zone boundary ($Z_{\text{low}} \dots Z_{\text{high}}$).
  - Risk-to-Reward ratio (e.g., `1:2.8`).
- **Derivative Pill:** Color-coded derivative buildup badge (`LONG BUILD-UP` in green, `SHORT BUILD-UP` in red).
- **Depth Bricks:** Embedded conviction strength visualizer.

---

### 3.4 `DepthBricks.tsx`
- **Role:** Renders a 4-segment visual conviction meter based on the calculated conviction score (0 to 100).
- **Thresholds:**
  - Segment 1: Conviction $\ge 25\%$
  - Segment 2: Conviction $\ge 50\%$
  - Segment 3: Conviction $\ge 75\%$
  - Segment 4: Conviction $\ge 90\%$

---

### 3.5 `PriceChart.tsx`
- **Role:** Renders 5-minute candlestick chart and overlays detected Order Blocks.
- **Features:**
  - Dynamic price and time coordinate transforms.
  - Candlestick body and wick rendering.
  - Order Block zone boxes shaded with mitigation status flags.
  - Crosshair cursor displaying active bar timestamp, OHLC, and volume.

---

### 3.6 `InspectionDrawer.tsx`
- **Role:** Slide-over detail drawer displaying full quantitative transparency when a user clicks any stock.
- **Contents:**
  - Live price, session open, high, low, previous close.
  - 50-day rolling baseline breakdown: Raw vs Effective ATR, ADM, AHR.
  - Guard floor threshold and `guard_applied` transparency indicator.
  - Upward vs downward excursions and multiplicative imbalance ratio check.
  - Embedded interactive `PriceChart`.
