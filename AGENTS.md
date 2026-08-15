# AGENTS.md

## Project: MarketWatch — Multi-Source Market Watchlist

This document provides guidelines for AI agents (Copilot, Cursor, Claude, Gemini, etc.) working in this repository.

---

## Quick Reference

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run wasm:build` | Compile AssemblyScript → WASM |
| `npm run wasm:watch` | Watch WASM source for changes |

---

## Architecture Overview

```
app/                  ← Next.js 15 App Router root
├── app/              ← Pages & API routes
│   ├── page.tsx      ← Welcome Dashboard (landing)
│   ├── dashboard/    ← Main watchlist app (protected)
│   └── api/prices/   ← Server-side price proxy routes
├── components/
│   ├── landing/      ← Landing page sections
│   ├── watchlist/    ← Table, dialog, sparkline
│   ├── layout/       ← Navbar, Sidebar, DashboardNav
│   └── providers/    ← Theme, Query providers
├── lib/
│   ├── supabase/     ← Browser & server Supabase clients
│   ├── wasm/         ← WASM loader with JS fallback
│   └── utils.ts      ← Formatters and helpers
├── types/market.ts   ← All TypeScript interfaces
├── assembly/         ← AssemblyScript WASM source
└── supabase/         ← SQL schema
```

---

## Code Conventions

### TypeScript
- **Always use TypeScript** — no `any` unless absolutely unavoidable (comment why).
- Prefer `interface` over `type` for object shapes.
- Use `"use client"` only for components that need browser APIs or React hooks.
- Server Components are the default.

### Styling
- **Tailwind CSS v4** — use `@import "tailwindcss"` (not `@tailwind base/components/utilities`).
- CSS variables defined in `globals.css` — do not hardcode colors.
- Use `cn()` from `@/lib/utils` for conditional classes.
- Use `.glass`, `.gradient-mesh`, `.skeleton`, `.glow-*` utility classes from `globals.css`.

### Components
- Components live in `components/` organized by feature: `landing/`, `watchlist/`, `layout/`.
- shadcn/ui components go in `components/ui/` — do not modify them directly.
- Use Framer Motion for animations — `motion.div`, `AnimatePresence`.
- Use `lucide-react` for all icons.

### API Routes
- All external API calls **must go through server-side API routes** in `app/api/prices/`.
- Never call Binance/Yahoo/OKX directly from the browser (CORS).
- Use Next.js `{ next: { revalidate: 5 } }` for short-lived caches.

### WASM
- WASM module source: `assembly/index.ts` (AssemblyScript).
- Build output: `public/wasm/market_engine.wasm` + JS glue.
- The loader at `lib/wasm/loader.ts` **must always have a JS fallback** in case WASM fails.
- WASM is lazy-loaded — never import WASM at top of file; always use `loadMarketEngine()`.

### Supabase
- Browser client: `lib/supabase/client.ts` — use in Client Components.
- Server client: `lib/supabase/server.ts` — use in Server Components & API routes.
- All tables have **Row Level Security (RLS)** enabled — do not bypass.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

---

## Adding a New Price Source

1. Create `app/api/prices/<source>/route.ts`.
2. Add the source type to `types/market.ts` → `AssetSource`.
3. Add `SOURCE_COLORS` entry in `WatchlistTable.tsx`.
4. Add fetch logic in `dashboard/page.tsx` → `fetchPrices()`.
5. Update `AddSymbolDialog.tsx` source filter list.
6. Document in `CONTEXT.md`.

---

## DO / DON'T

| DO | DON'T |
|---|---|
| Use `cn()` for class merging | String-concatenate class names |
| Keep WASM functions pure (no side effects) | Call DOM from WASM |
| Use TanStack Query for all data fetching | Use raw `useEffect` for fetch |
| Load WASM lazily via `loadMarketEngine()` | Top-level WASM import |
| Use `.env.local` for secrets | Hardcode API keys |
| Use Supabase RLS for security | Bypass RLS with service key on client |
| Keep API routes thin (transform only) | Business logic in API routes |

---

## Environment Variables

See `.env.local.example` for all required variables. Copy to `.env.local` and fill in values.

**Required for full functionality:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Optional (public endpoints work without keys):**
- `BINANCE_API_KEY` / `BINANCE_API_SECRET`
- `OKX_API_KEY` / `OKX_API_SECRET` / `OKX_PASSPHRASE`

---

## Testing

- No test framework configured yet. Recommended: **Vitest** + **Testing Library**.
- Before adding tests, run `npx vitest init`.
- Critical functions to unit test: WASM calculation exports, `lib/utils.ts` formatters.

---

## Common Pitfalls

1. **Hydration mismatch** — `useTheme()` must be guarded with `mounted` state.
2. **WASM on SSR** — WASM cannot run on the server. Always lazy-load in client components.
3. **Yahoo Finance rate limits** — `yahoo-finance2` is unofficial; do not hammer it with parallel requests.
4. **Binance symbol format** — Always uppercase (`BTCUSDT` not `btcusdt`).
5. **OKX symbol format** — Uses dash separator (`BTC-USDT` not `BTCUSDT`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
