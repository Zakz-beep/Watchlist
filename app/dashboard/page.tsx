// app/dashboard/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, RefreshCw, Cpu, TrendingUp, TrendingDown, UserCheck } from "lucide-react";
import { WatchlistTable } from "@/components/watchlist/WatchlistTable";
import { AddSymbolDialog } from "@/components/watchlist/AddSymbolDialog";
import { MarketSentiment } from "@/components/dashboard/MarketSentiment";
import { TopMovers } from "@/components/dashboard/TopMovers";
import { RecentNews } from "@/components/dashboard/RecentNews";
import { loadMarketEngine } from "@/lib/wasm/loader";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import type { WatchlistItem, PriceData } from "@/types/market";

async function fetchPrices(items: Omit<WatchlistItem, "priceData">[]): Promise<PriceData[]> {
  const binanceSyms = items.filter((i) => i.source === "binance").map((i) => i.symbol);
  const yahooSyms   = items.filter((i) => i.source === "yahoo").map((i) => i.symbol);
  const okxSyms     = items.filter((i) => i.source === "okx").map((i) => i.symbol);

  const fetches = [];
  if (binanceSyms.length)
    fetches.push(fetch(`/api/prices/binance?symbols=${binanceSyms.join(",")}`).then((r) => r.json()));
  if (yahooSyms.length)
    fetches.push(fetch(`/api/prices/yahoo?symbols=${yahooSyms.join(",")}`).then((r) => r.json()));
  if (okxSyms.length)
    fetches.push(fetch(`/api/prices/okx?symbols=${okxSyms.join(",")}`).then((r) => r.json()));

  const results = await Promise.allSettled(fetches);
  const prices: PriceData[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      prices.push(...r.value);
    }
  }
  return prices;
}

export default function DashboardPage() {
  const { items, user, loading: watchlistLoading, addItem, removeItem } = useWatchlist();
  const [addOpen, setAddOpen] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);

  // Pre-load WASM module
  useEffect(() => {
    loadMarketEngine().then(() => setWasmReady(true)).catch(() => {});
  }, []);

  // Fetch live prices
  const { data: prices, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-prices", items.map((i) => i.symbol).join(",")],
    queryFn: () => fetchPrices(items),
    refetchInterval: 15_000,
    enabled: items.length > 0,
  });

  // Merge items with live price data
  const watchlistItems: WatchlistItem[] = items.map((item) => {
    const priceData = prices?.find((p) => p.symbol === item.symbol);
    return { ...item, priceData };
  });

  // Summary stats
  const gainers = watchlistItems.filter((i) => (i.priceData?.changePercent ?? 0) > 0).length;
  const losers  = watchlistItems.filter((i) => (i.priceData?.changePercent ?? 0) < 0).length;

  const STATS = [
    { label: "Assets",  value: items.length,  icon: TrendingUp,  color: "text-blue-400" },
    { label: "Gainers", value: gainers,        icon: TrendingUp,  color: "text-gain" },
    { label: "Losers",  value: losers,         icon: TrendingDown, color: "text-loss" },
    { label: "WASM",    value: wasmReady ? "Active" : "Loading", icon: Cpu, color: wasmReady ? "text-purple-400" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">My Watchlist</h2>
            {user && (
              <span className="flex items-center gap-1 text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                <UserCheck className="w-3 h-3" />
                {user.email}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {user ? "Synced with Supabase DB" : "Guest Mode (Local)"} • Auto-refreshes every 15s • {wasmReady ? "WASM sort active" : "Loading WASM..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Add Symbol
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-border/40 glass"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Left Column: Watchlist Table */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/40 glass overflow-hidden"
          >
            <WatchlistTable
              items={watchlistItems}
              onRemove={removeItem}
              isLoading={(isLoading || watchlistLoading) && !prices}
            />
          </motion.div>
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-6">
          <MarketSentiment items={watchlistItems} />
          <TopMovers items={watchlistItems} />
          <RecentNews />
        </div>
      </div>

      {/* Add Symbol Dialog */}
      <AddSymbolDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addItem}
        existingSymbols={items.map((i) => i.symbol)}
      />
    </div>
  );
}
