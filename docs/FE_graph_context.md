# Frontend Graph Context & Architecture

This document describes the component hierarchy, UI state flow, real-time WebSocket consumption, and charting pipeline of the Next.js client for the **OrderBlock Market Scanner & Intelligence Engine**.

---

## 1. High-Level Component Hierarchy

```mermaid
graph TD
    subgraph Root Layout & Dashboard Shell
        ROOT[RootLayout<br/>src/app/layout.tsx] --> PAGE[Dashboard Page<br/>src/app/page.tsx]
        PAGE --> HOOK[useOrderBlockSocket<br/>src/lib/useOrderBlockSocket.ts]
        PAGE --> TELEM_BAR[HeaderTelemetryBar<br/>src/components/telemetry/HeaderTelemetryBar.tsx]
        PAGE --> ACCT_BAR[AccountSummaryBar<br/>src/components/execution/AccountSummaryBar.tsx]
    end

    subgraph Analytics & Market Breadth
        PAGE --> SWARM_SECTION[Market Dispersion View]
        SWARM_SECTION --> BEE_SWARM[BeeSwarmBreadth<br/>src/components/boards/BeeSwarmBreadth.tsx]
    end

    subgraph Tactical Signals & Ranking Boards
        PAGE --> FILTER_BAR[Board Filter Tabs & Symbol Search Bar]
        PAGE --> BOARDS_CONTAINER[Dual Boards Grid]
        BOARDS_CONTAINER --> BULL_BOARD[Bullish Accumulation Board]
        BOARDS_CONTAINER --> BEAR_BOARD[Bearish Distribution Board]
        BULL_BOARD --> PICK_CARD_BULL[TopPickCard<br/>src/components/boards/TopPickCard.tsx]
        BEAR_BOARD --> PICK_CARD_BEAR[TopPickCard<br/>src/components/boards/TopPickCard.tsx]
        PICK_CARD_BULL --> BRICKS_BULL[DepthBricks<br/>src/components/boards/DepthBricks.tsx]
        PICK_CARD_BEAR --> BRICKS_BEAR[DepthBricks<br/>src/components/boards/DepthBricks.tsx]
    end

    subgraph Execution & Trading Gateways
        PICK_CARD_BULL -->|Trade Click| ORDER_MODAL[OrderModal<br/>src/components/execution/OrderModal.tsx]
        PICK_CARD_BEAR -->|Trade Click| ORDER_MODAL
        ACCT_BAR -->|Positions Click| POSITIONS_DRAWER[PositionsDrawer<br/>src/components/execution/PositionsDrawer.tsx]
        ACCT_BAR -->|Kill Switch| KILL_ACTION[Circuit Breaker Flatten]
    end

    subgraph Deep Dive & Microstructure Inspection
        PAGE --> DRAWER[InspectionDrawer<br/>src/components/boards/InspectionDrawer.tsx]
        DRAWER --> CHART[PriceChart<br/>src/components/charts/PriceChart.tsx]
        DRAWER -->|Trade Click| ORDER_MODAL
    end
```

---

## 2. Frontend State & Telemetry Flow

```mermaid
sequenceDiagram
    autonumber
    participant Backend as FastAPI Server (/api)
    participant Hook as useOrderBlockSocket.ts
    participant Page as Dashboard Page (page.tsx)
    participant AcctBar as AccountSummaryBar.tsx
    participant OrderModal as OrderModal.tsx
    participant PosDrawer as PositionsDrawer.tsx
    participant Drawer as InspectionDrawer (Chart)

    Note over Hook: Real-Time Stream Subscription
    Hook->>Backend: WebSocket ws://localhost:8000/ws/telemetry
    Backend-->>Hook: OnMessage: BOARD_SNAPSHOT & BOARD_UPDATE
    Hook-->>Page: Re-render state (data, connectionState)

    Note over AcctBar: Account & Margin Sync
    AcctBar->>Backend: GET /api/execution/account (every 2.5s)
    Backend-->>AcctBar: Live equity, margin used, PnL

    Note over OrderModal: 1-Click Paper Trade Execution
    User->>Page: Click "Trade" on TopPickCard
    Page->>OrderModal: Open modal with precalculated SL/TP
    User->>OrderModal: Confirm Order
    OrderModal->>Backend: POST /api/execution/orders
    Backend-->>OrderModal: Order FILLED Record
    OrderModal-->>PosDrawer: Open Positions Drawer

    Note over PosDrawer: Real-Time Positions & Emergency Flatten
    User->>AcctBar: Click Emergency KILL-SWITCH
    AcctBar->>Backend: POST /api/execution/kill-switch
    Backend-->>AcctBar: Flatten all positions & halt trading
```

---

## 3. Component Details & Responsibilities

| Component | Path | Data Inputs (Props) | Output / User Interactions |
| :--- | :--- | :--- | :--- |
| **Dashboard Page** | `src/app/page.tsx` | None (Top-level client container) | Manages tabs, search queries, selected symbol, modal states. |
| **useOrderBlockSocket** | `src/lib/useOrderBlockSocket.ts` | `wsUrl`, `fallbackPollUrl` | Custom hook with auto-reconnect backoff and HTTP fallback. |
| **HeaderTelemetryBar** | `src/components/telemetry/HeaderTelemetryBar.tsx` | `wsStatus`, `syncQuality`, `universeSize` | Displays connection badge, Upstox token health, and sync quality. |
| **AccountSummaryBar** | `src/components/execution/AccountSummaryBar.tsx` | `onOpenPositions`, `onKillSwitchTriggered` | Live equity, margin used, daily loss ticker, and emergency Kill-Switch. |
| **OrderModal** | `src/components/execution/OrderModal.tsx` | `pick`, `isOpen`, `onClose`, `onOrderSuccess` | 1-click paper trading dialog with ATR Stop Loss & Target. |
| **PositionsDrawer** | `src/components/execution/PositionsDrawer.tsx` | `isOpen`, `onClose` | Slide-over drawer of open positions and order audit log with close actions. |
| **BeeSwarmBreadth** | `src/components/boards/BeeSwarmBreadth.tsx` | `dots`, `bullishCount`, `bearishCount`, `onSelect` | SVG breadth dispersion with Lucide icons. |
| **TopPickCard** | `src/components/boards/TopPickCard.tsx` | `pick`, `onInspect`, `onTrade`, `tier` | Hero card with setup metrics, depth bricks, and trade trigger. |
| **InspectionDrawer** | `src/components/boards/InspectionDrawer.tsx` | `pick`, `candles`, `isOpen`, `onClose`, `onTrade` | 9-metric institutional breakdown and embedded 5m `PriceChart`. |
