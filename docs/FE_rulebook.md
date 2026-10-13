# Frontend Engineering & UI/UX Invariants Rulebook

> **Project:** OrderBlock Market Scanner & Intelligence Engine (Frontend)  
> **Tech Stack:** Next.js App Router (Next 15+ & React 19), Tailwind CSS, TypeScript (Strict), Lucide React  
> **Purpose:** This rulebook defines the strict, non-negotiable architectural, security, design system, and code quality invariants for the frontend dashboard.

---

# CRITICAL RULEBOOK INSTRUCTION

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

The rules in this document are mandatory.

Any AI agent, subagent, or engineer working on this codebase MUST follow these rules.

The agent MUST NOT:
- change a rule;
- remove a rule;
- weaken a rule;
- reinterpret a rule;
- add an unapproved new rule;
- replace a rule with a different rule;
- create an exception unless the rulebook explicitly defines the exception.

If a requested task conflicts with a rule, the agent MUST stop and report the conflict.  
The agent MUST NOT silently resolve the conflict.  
The agent MUST ask for an explicit rulebook change before proceeding.  
The rulebook is the authoritative source of truth for all frontend invariants.

---

# 1. Architectural Invariants

## 1.1 Next.js 15+ & React 19 App Router Compliance

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

### Rule: Asynchronous Dynamic Parameters
In Next.js 15+, dynamic route parameters and search parameters are asynchronous Promises.

#### Correct
```typescript
interface RouteProps {
  params: Promise<{ symbol: string }>;
}

export default async function Page({ params }: RouteProps) {
  const { symbol } = await params;
  // ...
}
```

#### Incorrect
```typescript
export default function Page({ params }: { params: { symbol: string } }) {
  const { symbol } = params; // FORBIDDEN: Direct synchronous property access
}
```

### Rule: Strict Server vs. Client Component Boundaries
- Use **Server Components** by default for initial page shell layout, metadata generation, and non-interactive server-rendered markup.
- Use **Client Components** (`"use client"`) strictly when required for:
  - WebSocket subscription listeners;
  - Interactive charts (`PriceChart`);
  - BeeSwarm D3 physics canvas;
  - Inspection drawers and modals;
  - Local interactive filter tabs.

---

# 2. UI/UX & Design Non-Negotiables

## 2.1 Zero OS Emoji Clutter

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

### Rule
NEVER use raw operating system emojis in:
- UI buttons;
- headers and titles;
- badges and pills;
- dashboard metrics and cards;
- charts or tooltips.

Examples of forbidden raw emojis include:
```text
🔥, 🚀, 📈, 📉, 🟢, 🔴, ⚡, 💎, 🎯, 🎉
```

### Standard
Use **Lucide React vector icons** instead.
Examples:
```tsx
import { TrendingUp, TrendingDown, Flame, ShieldAlert, Sparkles, Activity } from "lucide-react";

<span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
  <TrendingUp className="w-4 h-4" />
</span>
```

### Rationale
OS emojis render completely differently across iOS, macOS, Windows, Android, and Linux, breaking institutional visual rhythm and typographic precision.

---

## 2.2 Institutional Color Tokens & Theme

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

| Token Name | Hex / Value | Usage Constraint |
| :--- | :--- | :--- |
| **Canvas Background** | `#0B0E14` | Global root page viewport |
| **Surface Primary** | `#111622` | Cards, boards, drawer containers |
| **Surface Secondary** | `#1A2234` | Nested metric tiles, header bars |
| **Border Subtle** | `#1E293B` | Structural dividers and cards |
| **Bullish Emerald** | `#10B981` | Positive returns, accumulation boards, fresh bullish OBs |
| **Bearish Crimson** | `#EF4444` | Negative returns, distribution boards, fresh bearish OBs |
| **Neutral Slate** | `#64748B` | Balanced returns, inactive indicators |
| **Accent Sky** | `#38BDF8` | Telemetry badges, selected cards, crosshairs |

---

## 2.3 Mobile-First, Thumb-Friendly & Tactile Feedback

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

### Rule
1. Interactive buttons, cards, and list rows MUST have a minimum tap target height of **48px** (desktop) and **56px** (mobile).
2. All interactive elements MUST provide tactile click feedback:
   ```css
   active:scale-[0.98] transition-transform duration-100
   ```
3. Critical filters and drawer close triggers must remain reachable above the fold or sticky on mobile viewports.

---

## 2.4 Zero Layout Shift (CLS) & Stable Keys

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

### Rule
1. **Stable Keys:** Always key list items using the immutable symbol identifier (`key={stock.symbol}`). Using array indices (`key={index}`) is strictly forbidden.
2. **Dimension Placeholders:** Charts and metric grids must declare explicit container heights and skeleton placeholders to prevent layout shift when market cycles stream in.

---

# 3. Security, XSS Defense & Error Handling

## 3.1 Safe String Sanitization & XSS Invariant

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

### Rule
NEVER use:
```tsx
dangerouslySetInnerHTML
```
All dynamic ticker symbols, sector names, and strings must be escaped through standard React JSX string interpolation.

---

## 3.2 Error Handling & User-Facing Copy

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

### Rule
Never expose raw network exceptions, HTTP tracebacks, or database errors to the user interface.

### Standard
Display calm, informative fallback banners:
```tsx
<div className="p-4 rounded-lg bg-red-950/40 border border-red-800 text-red-200 text-sm flex items-center gap-2">
  <ShieldAlert className="w-4 h-4 text-red-400" />
  <span>Live market stream temporarily unavailable. Retrying connection...</span>
</div>
```

---

# 4. Code Quality & Implementation Invariants

## 4.1 Strict TypeScript & Zero `any`

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

### Rule
- Zero implicit `any` types.
- Zero explicit `any` types.
- All incoming payloads from the backend must be strictly typed according to `frontend/src/lib/types.ts`.

---

## 4.2 WebSocket Lifecycle & Fallback Invariant

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

### Rule
The WebSocket client MUST implement exponential backoff reconnection:
$$\text{Delay} = \min(1000 \times 2^{\text{attempt}}, 10000)\text{ ms}$$
If WebSocket disconnects, fall back gracefully to HTTP polling every 3 seconds without freezing the UI.

---

# 5. Documentation & Context Graph Maintenance

## 5.1 Context Graph Logging Invariant

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

Whenever a structurally significant change is made to:
- frontend component topology;
- routing or layout structure;
- TypeScript domain types in `types.ts`;
- WebSocket or API integration hooks;

the engineer or agent MUST update `docs/FE_graph_context.md` and `docs/FE_everything_reference.md`.

---

# RULEBOOK ENFORCEMENT PROTOCOL

**[IMMUTABLE — DO NOT CHANGE OR ADD]**

Before implementing any frontend task:
1. Verify the task against this rulebook.
2. The agent MUST NOT modify an invariant to make an implementation easier.
3. The agent MUST NOT silently create exceptions.
4. If a conflict arises:
   - Stop implementation immediately.
   - State the conflicting rule explicitly.
   - Request explicit user approval for a rulebook amendment before proceeding.
