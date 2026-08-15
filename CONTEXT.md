# CONTEXT.md

## Project: MarketWatch — Multi-Source Market Watchlist

**Version:** 1.0.0  
**Last Updated:** August 2026  
**Stack:** Next.js 15 · Tailwind CSS v4 · shadcn/ui · next-themes · Supabase · AssemblyScript WASM

---

## What This App Does

MarketWatch aggregates **live financial market data** from multiple sources into a single, unified watchlist interface. Users can track:

- **Stocks & ETFs** — via Yahoo Finance (`yahoo-finance2` npm package)
- **Crypto** — via Binance REST API + WebSocket, OKX REST API
- **Forex & Indices** — via Yahoo Finance

Key differentiator: **WebAssembly (WASM)** is used for heavy client-side computation (sorting large datasets, RSI, Moving Average, normalization) for near-native performance.

---

## Page Structure

| Route | Description | Auth Required |
|---|---|---|
| `/` | Welcome Dashboard — landing page | No |
| `/dashboard` | Main watchlist app (guest mode works) | No (optional) |
| `/auth/login` | Supabase email/password login | No |
| `/auth/register` | Supabase registration | No |

### Welcome Dashboard Flow

```
/ (landing)
├── Navbar            — logo, nav links, theme toggle
├── HeroSection       — animated headline + CTA + stats
├── MarketTicker      — live scrolling price ticker bar
├── FeatureCards      — WASM, multi-source, real-time, dark mode
├── MarketSnapshot    — 6-card live price grid (BTC, ETH, AAPL, NVDA, S&P, Gold)
└── FooterCTA         — register / login / guest mode buttons

          ↓  Click "Open Dashboard"

/dashboard (main app)
├── Sidebar           — navigation between sections
├── DashboardNav      — date, refresh, notifications, theme toggle
└── Dashboard page
    ├── Stats row     — total assets, gainers, losers, WASM status
    ├── WatchlistTable — sortable columns + sparkline charts
    └── AddSymbolDialog — search + add from Yahoo/Binance/OKX
```

---

## Data Flow

```
Browser                        Next.js Server                External APIs
───────                        ──────────────                ─────────────
TanStack Query ──── GET ──→  /api/prices/binance ──────→  api.binance.com
(15s interval)      GET ──→  /api/prices/yahoo   ──────→  (yahoo-finance2 npm)
                    GET ──→  /api/prices/okx      ──────→  www.okx.com

WatchlistTable ←── prices ─── API response (normalized PriceData[])

WASM (lazy)
  loadMarketEngine()
  ├── sortAscending / sortDescending  → column sort
  ├── calculateMA(prices, 14)         → moving average
  ├── calculateRSI(prices, 14)        → RSI indicator
  └── normalizePrices(prices)         → sparkline normalization
```

---

## WASM Module

**Source:** `assembly/index.ts` (AssemblyScript — TypeScript-like)  
**Loader:** `lib/wasm/loader.ts`  

### Build
```bash
npm run wasm:build
# or manually:
npx asc assembly/index.ts -o public/wasm/market_engine.wasm --optimizeLevel 3
```

### Exported Functions

| Function | Input | Output | Use Case |
|---|---|---|---|
| `sortAscending(prices)` | Float64Array | Float64Array | Column sort asc |
| `sortDescending(prices)` | Float64Array | Float64Array | Column sort desc |
| `calculateMA(prices, period)` | Float64Array, i32 | Float64Array | SMA indicator |
| `calculateRSI(prices, period)` | Float64Array, i32 | Float64Array | RSI indicator |
| `normalizePrices(prices)` | Float64Array | Float64Array [0,1] | Sparkline chart |
| `percentChange(prices)` | Float64Array | f64 | % change calc |

### JS Fallback
The loader at `lib/wasm/loader.ts` automatically falls back to pure JavaScript implementations if WASM fails to load. The JS fallback has the same API surface.

---

## API Sources

### Yahoo Finance
- **Package:** `yahoo-finance2` (unofficial, server-side only)
- **Endpoint:** `/api/prices/yahoo?symbols=AAPL,TSLA,^GSPC`
- **Supports:** Stocks, ETFs, Indices, Forex futures (e.g. `GC=F`)
- **Rate limit:** Unofficial — do not make more than ~10 requests/second
- **Sparkline:** Fetches last 24 hours of 1h bars via `yahooFinance.chart()`

### Binance
- **Endpoint:** `/api/prices/binance?symbols=BTCUSDT,ETHUSDT`
- **API:** `https://api.binance.com/api/v3/ticker/24hr`
- **Auth:** Not required for public ticker (no API key needed)
- **Symbol format:** `BTCUSDT` (uppercase, no separator)
- **WebSocket:** Planned — `wss://stream.binance.com:9443/ws/<symbol>@ticker`

### OKX
- **Endpoint:** `/api/prices/okx?symbols=BTC-USDT,ETH-USDT`
- **API:** `https://www.okx.com/api/v5/market/ticker`
- **Auth:** Not required for public spot ticker
- **Symbol format:** `BTC-USDT` (uppercase, dash separator)

---

## Database Schema (Supabase)

See `supabase/schema.sql` for full SQL.

### Tables

**`watchlists`**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| name | TEXT | Watchlist name |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

**`watchlist_items`**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| watchlist_id | UUID | FK → watchlists |
| symbol | TEXT | e.g. AAPL, BTCUSDT |
| name | TEXT | Display name |
| source | TEXT | yahoo / binance / okx |
| asset_type | TEXT | stock / crypto / forex / index / etf |
| notes | TEXT | Optional user notes |
| alert_price | NUMERIC | Optional price alert |
| added_at | TIMESTAMPTZ | |

**`price_alerts`**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| symbol | TEXT | |
| condition | TEXT | above / below |
| target_price | NUMERIC | |
| triggered | BOOLEAN | |

All tables have **Row Level Security** enabled.

---

## Local Development Setup

```bash
# 1. Clone and navigate
cd "Webview and Watchlist/app"

# 2. Install dependencies
npm install

# 3. Copy env template
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key

# 4. (Optional) Build WASM module
npm run wasm:build

# 5. Run database migrations
# Go to your Supabase dashboard > SQL Editor > paste supabase/schema.sql > Run

# 6. Start dev server
npm run dev
# Open http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Only for server-side admin ops |
| `BINANCE_API_KEY` | No | For higher rate limits |
| `OKX_API_KEY` | No | For private OKX endpoints |

---

## Key Design Decisions

1. **WASM via AssemblyScript** (not Rust) — no additional toolchain required; TypeScript devs can read/edit it.
2. **Server-side price proxies** — all external API calls go through Next.js API routes to avoid CORS and hide keys.
3. **Guest mode** — dashboard works without login (localStorage-backed demo watchlist), Supabase only needed for persistence.
4. **15-second polling** — balances freshness vs. rate limits; Binance WebSocket planned for crypto-only real-time.
5. **Glassmorphism + gradient mesh** — premium aesthetic via CSS utilities in `globals.css`.
6. **TanStack Query** — handles caching, background refresh, deduplication out of the box.

---

## Planned Features (v2)

- [ ] Binance WebSocket for <1s crypto updates
- [ ] WASM-powered RSI/MA indicator display in expanded row
- [ ] Portfolio P&L tracking
- [ ] Price alert push notifications (Supabase Realtime)
- [ ] CSV/JSON export of watchlist
- [ ] Multi-watchlist support (tabs)
- [ ] CoinGecko source integration
