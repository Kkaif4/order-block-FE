# OrderBlock Live Market Scanner & Trading Terminal (Frontend)

Institutional-grade quantitative scanning and paper trading interface for the **NSE Equity F&O universe (~213 symbols)**, tracking real-time Smart Money Concepts (SMC) Order Blocks, liquidity sweeps, and directional volume buildups.

Built with **Next.js 16 (App Router + Turbopack)**, **React 19**, **Tailwind CSS v4**, and **Lucide React**.

---

## Architecture & Features

- **Full-Duplex Telemetry WebSocket:** Auto-reconnecting real-time socket with exponential backoff and REST polling fallback (`/ws/telemetry`).
- **BeeSwarm Breadth Dispersion:** Real-time directional market breadth visualization with volume-weighted physics.
- **Top Picks Dual Boards:** Live actionable setups categorized by institutional conviction score, directional impulse ($\Delta_{\text{up}} \ge 2\Delta_{\text{down}}$), and derivatives buildup.
- **Institutional Charting Overlays:** Powered by Lightweight Charts, displaying shaded rectangular Order Block zones (`FRESH` vs `MITIGATED`), invalidation stops, and R-multiple target lines.
- **1-Click Execution & RMS Controls:**
  - Automated ATR-based position sizing and order placement modal.
  - Live virtual account summary bar displaying equity, margin, and PnL.
  - Emergency circuit breaker **Kill-Switch** to immediately cancel pending orders and flatten open positions.
- **Strict Invariant Compliance:** Zero OS emoji clutter (pure Lucide React vector icons) and strict TypeScript interfaces with zero `any`.

---

## Tech Stack

- **Framework:** Next.js 16.4.0 (Turbopack, Standalone Output)
- **Library:** React 19.3.0
- **Styling:** Tailwind CSS v4
- **Charts:** Lightweight Charts (TradingView)
- **Icons:** Lucide React
- **State & Tables:** Zustand, TanStack React Table

---

## Getting Started

### 1. Environment Configuration

Create a `.env.local` file in the root of the frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/telemetry
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 4. Production Build & Lint

```bash
# Linting
npm run lint

# Production Standalone Build
npm run build

# Start Production Server
npm run start
```

---

## Repository Documentation

For architectural invariants, telemetry component graphs, and schema references, see:
- [`docs/FE_rulebook.md`](./docs/FE_rulebook.md): Authoritative architectural and UI/UX invariants.
- [`docs/FE_graph_context.md`](./docs/FE_graph_context.md): Component topology and WebSocket data flow.
- [`docs/FE_everything_reference.md`](./docs/FE_everything_reference.md): Design tokens, component contracts, and event payloads.
