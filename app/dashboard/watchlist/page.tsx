// app/dashboard/watchlist/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Trash2,
  Star,
  Database,
  HardDrive,
  LayoutGrid,
  List,
  Filter,
  FolderPlus,
  Layers3,
} from "lucide-react";
import { AddSymbolDialog } from "@/components/watchlist/AddSymbolDialog";
import { TickerLogo } from "@/components/ui/TickerLogo";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { getAssetTypeColor, getSourceColor } from "@/lib/ticker-logo";
import type { WatchlistItem, PriceData } from "@/types/market";
import { cn } from "@/lib/utils";

/* ─── helpers ─────────────────────────────────────────────── */
async function fetchPrices(items: Omit<WatchlistItem, "priceData">[]): Promise<PriceData[]> {
  const binanceSyms = items.filter((i) => i.source === "binance").map((i) => i.symbol);
  const yahooSyms   = items.filter((i) => i.source === "yahoo").map((i) => i.symbol);
  const okxSyms     = items.filter((i) => i.source === "okx").map((i) => i.symbol);
  const bingxSyms   = items.filter((i) => i.source === "bingx").map((i) => i.symbol);
  const hyperliquidSyms = items.filter((i) => i.source === "hyperliquid").map((i) => i.symbol);

  const fetches = [];
  if (binanceSyms.length) fetches.push(fetch(`/api/prices/binance?symbols=${binanceSyms.join(",")}`).then((r) => r.json()));
  if (yahooSyms.length)   fetches.push(fetch(`/api/prices/yahoo?symbols=${yahooSyms.join(",")}`).then((r) => r.json()));
  if (okxSyms.length)     fetches.push(fetch(`/api/prices/okx?symbols=${okxSyms.join(",")}`).then((r) => r.json()));
  if (bingxSyms.length)   fetches.push(fetch(`/api/prices/bingx?symbols=${bingxSyms.join(",")}`).then((r) => r.json()));
  if (hyperliquidSyms.length) fetches.push(fetch(`/api/prices/hyperliquid?symbols=${hyperliquidSyms.join(",")}`).then((r) => r.json()));

  const results = await Promise.allSettled(fetches);
  return results.flatMap((r) => (r.status === "fulfilled" && Array.isArray(r.value) ? r.value : []));
}

function fmt(v: number, prefix = "$"): string {
  if (!isFinite(v)) return "—";
  if (v >= 1_000_000_000) return `${prefix}${(v / 1e9).toFixed(2)}B`;
  if (v >= 1_000_000)     return `${prefix}${(v / 1e6).toFixed(2)}M`;
  if (v >= 1_000)         return `${prefix}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (v < 0.01)           return `${prefix}${v.toPrecision(4)}`;
  return `${prefix}${v.toFixed(2)}`;
}

/* ─── types ───────────────────────────────────────────────── */
type ViewMode = "grid" | "list";
type SortKey  = "symbol" | "price" | "change" | "volume" | "added";
type FilterType = "all" | "crypto" | "stock" | "etf" | "index" | "forex" | "commodity";

/* ─── sub components ──────────────────────────────────────── */
function PriceChange({ pct }: { pct?: number }) {
  if (pct === undefined || pct === null) return <span className="text-muted-foreground">—</span>;
  const pos = pct >= 0;
  return (
    <span className={cn("flex items-center gap-0.5 font-semibold text-sm", pos ? "text-emerald-400" : "text-red-400")}>
      {pos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {pos ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

/* ─── Card view ───────────────────────────────────────────── */
function WatchlistCard({ item, onRemove, index }: { item: WatchlistItem; onRemove: (id: string) => void; index: number }) {
  const p = item.priceData;
  const pos = (p?.changePercent ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04 }}
      layout
      className="group relative ios-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      {/* Remove button */}
      <button
        onClick={() => onRemove(item.id)}
        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Logo + Symbol */}
      <div className="flex items-center gap-3 mb-4">
        <TickerLogo symbol={item.symbol} name={item.name} assetType={item.assetType} size={42} />
        <div className="min-w-0">
          <div className="font-bold text-sm truncate">{item.symbol.replace(/USDT$/, "")}</div>
          <div className="text-xs text-muted-foreground truncate">{item.name}</div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase", getAssetTypeColor(item.assetType))}>
          {item.assetType}
        </span>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase", getSourceColor(item.source))}>
          {item.source}
        </span>
      </div>

      {/* Price */}
      <div className="space-y-1.5">
        <div className="text-xl font-bold tracking-tight">
          {p ? fmt(p.price) : <span className="text-muted-foreground text-base">Loading…</span>}
        </div>
        <div className="flex items-center justify-between">
          <PriceChange pct={p?.changePercent} />
          {p && (
            <span className="text-[10px] text-muted-foreground">
              {fmt(p.change, p.change >= 0 ? "+$" : "-$").replace("--", "-")}
            </span>
          )}
        </div>
        {p?.volume !== undefined && (
          <div className="text-[10px] text-muted-foreground mt-1">
            Vol: {fmt(p.volume, "")}
          </div>
        )}
      </div>

      {/* Mini bar chart indicator */}
      <div className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl transition-all", pos ? "bg-emerald-500/40" : "bg-red-500/40")} />
    </motion.div>
  );
}

/* ─── Row view ────────────────────────────────────────────── */
function WatchlistRow({ item, onRemove, index }: { item: WatchlistItem; onRemove: (id: string) => void; index: number }) {
  const p = item.priceData;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.03 }}
      layout
      className="group border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors"
    >
      {/* Logo + Name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <TickerLogo symbol={item.symbol} name={item.name} assetType={item.assetType} size={36} />
          <div>
            <div className="font-semibold text-sm">{item.symbol}</div>
            <div className="text-xs text-muted-foreground">{item.name}</div>
          </div>
        </div>
      </td>

      {/* Asset type */}
      <td className="py-3 px-3 hidden sm:table-cell">
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase", getAssetTypeColor(item.assetType))}>
          {item.assetType}
        </span>
      </td>

      {/* Source */}
      <td className="py-3 px-3 hidden md:table-cell">
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase", getSourceColor(item.source))}>
          {item.source}
        </span>
      </td>

      {/* Price */}
      <td className="py-3 px-4 text-right">
        <span className="font-bold text-sm">
          {p ? fmt(p.price) : <span className="text-muted-foreground">—</span>}
        </span>
      </td>

      {/* Change */}
      <td className="py-3 px-4 text-right">
        <PriceChange pct={p?.changePercent} />
      </td>

      {/* Volume */}
      <td className="py-3 px-4 text-right hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">{p ? fmt(p.volume, "") : "—"}</span>
      </td>

      {/* 24h High/Low */}
      <td className="py-3 px-4 text-right hidden xl:table-cell">
        {p ? (
          <div className="text-xs">
            <span className="text-emerald-400">{fmt(p.high24h ?? 0)}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-red-400">{fmt(p.low24h ?? 0)}</span>
          </div>
        ) : <span className="text-muted-foreground text-xs">—</span>}
      </td>

      {/* Remove */}
      <td className="py-3 px-3">
        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </motion.tr>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function WatchlistPage() {
  const { items, user, loading: watchlistLoading, watchlists, activeWatchlistId, activeWatchlist, selectWatchlist, createWatchlist, addItem, removeItem } = useWatchlist();
  const [addOpen, setAddOpen]   = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey]   = useState<SortKey>("added");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch]     = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  /* Fetch live prices */
  const { data: prices, isLoading, refetch } = useQuery({
    queryKey: ["watchlist-prices", items.map((i) => i.symbol).join(",")],
    queryFn: () => fetchPrices(items),
    refetchInterval: 15_000,
    enabled: items.length > 0,
  });

  /* Merge price data */
  const enriched: WatchlistItem[] = items.map((item) => ({
    ...item,
    priceData: prices?.find((p) => p.symbol === item.symbol),
  }));

  /* Filter + Search + Sort */
  const filtered = enriched
    .filter((i) => filterType === "all" || i.assetType === filterType)
    .filter((i) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      switch (sortKey) {
        case "symbol":  return a.symbol.localeCompare(b.symbol);
        case "price":   return (b.priceData?.price ?? 0) - (a.priceData?.price ?? 0);
        case "change":  return (b.priceData?.changePercent ?? 0) - (a.priceData?.changePercent ?? 0);
        case "volume":  return (b.priceData?.volume ?? 0) - (a.priceData?.volume ?? 0);
        case "added":   return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        default: return 0;
      }
    });

  /* Summary stats */
  const gainers = enriched.filter((i) => (i.priceData?.changePercent ?? 0) > 0).length;
  const losers  = enriched.filter((i) => (i.priceData?.changePercent ?? 0) < 0).length;

  const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Crypto", value: "crypto" },
    { label: "Stocks", value: "stock" },
    { label: "ETF", value: "etf" },
    { label: "Index", value: "index" },
    { label: "Forex", value: "forex" },
    { label: "Commodities", value: "commodity" },
  ];

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    const created = await createWatchlist(newGroupName);
    if (created) setNewGroupName("");
    setCreatingGroup(false);
  };

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400/30" />
            <h2 className="text-2xl font-bold tracking-tight">{activeWatchlist?.name ?? "My Watchlist"}</h2>
            {user ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                <Database className="w-3 h-3" />
                Synced
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold bg-muted text-muted-foreground border border-border/40 px-2 py-0.5 rounded-full">
                <HardDrive className="w-3 h-3" />
                Local
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {user ? `Saved to cloud for ${user.email}` : "Sign in to sync across devices"} · {items.length} assets · Auto-refresh 15s
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="ios-button flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Symbol
          </button>
        </div>
      </div>

      {/* ── Watchlist groups ── */}
      <section className="ios-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Layers3 className="w-3.5 h-3.5" /> Groups
          </div>
          {watchlists.map((watchlist) => (
            <button
              key={watchlist.id}
              onClick={() => selectWatchlist(watchlist.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                activeWatchlistId === watchlist.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-blue-500/20"
                  : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {watchlist.name}
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto w-full sm:w-auto">
            <input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void handleCreateGroup(); }}
              maxLength={48}
              placeholder="New group (e.g. Crypto)"
              className="min-w-0 flex-1 sm:w-48 rounded-xl border border-border/50 bg-background/45 px-3 py-1.5 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => void handleCreateGroup()}
              disabled={creatingGroup || !newGroupName.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-45 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" /> Add group
            </button>
          </div>
        </div>
      </section>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Assets", value: items.length, color: "text-foreground", icon: Star },
          { label: "Gainers", value: gainers, color: "text-emerald-400", icon: TrendingUp },
          { label: "Losers", value: losers, color: "text-red-400", icon: TrendingDown },
          { label: "Storage", value: user ? "Cloud" : "Local", color: user ? "text-blue-400" : "text-muted-foreground", icon: user ? Database : HardDrive },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="ios-card p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("w-4 h-4", s.color)} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol or name…"
            className="w-full rounded-2xl border border-border/60 bg-card/70 py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground/60 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Asset type filter */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                filterType === f.value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-blue-500/20"
                  : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs bg-muted/30 border border-border/40 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-foreground/20"
          >
            <option value="added">Recently Added</option>
            <option value="symbol">Symbol A–Z</option>
            <option value="price">Price (High–Low)</option>
            <option value="change">Change %</option>
            <option value="volume">Volume</option>
          </select>
        </div>

        {/* View toggle */}
        <div className="flex border border-border/40 rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/70")}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/70")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!watchlistLoading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="ios-card p-16 text-center"
        >
          <Star className="w-10 h-10 mx-auto mb-4 text-muted-foreground/30" />
          <p className="font-semibold mb-1">{search || filterType !== "all" ? "No matching assets" : "Your watchlist is empty"}</p>
          <p className="text-sm text-muted-foreground mb-6">
            {search || filterType !== "all" ? "Try adjusting your search or filter" : "Add your first asset to start tracking"}
          </p>
          {!search && filterType === "all" && (
            <button
              onClick={() => setAddOpen(true)}
              className="ios-button mx-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add Symbol
            </button>
          )}
        </motion.div>
      )}

      {/* ── Loading skeleton ── */}
      {watchlistLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="ios-card h-44 p-5 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Grid View ── */}
      {!watchlistLoading && viewMode === "grid" && filtered.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((item, idx) => (
              <WatchlistCard key={item.id} item={item} onRemove={removeItem} index={idx} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── List View ── */}
      {!watchlistLoading && viewMode === "list" && filtered.length > 0 && (
        <div className="ios-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 bg-muted/10">
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Asset</th>
                <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">Source</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Price</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">24h %</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden lg:table-cell">Volume</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden xl:table-cell">24h H / L</th>
                <th className="py-3 px-3 w-10" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filtered.map((item, idx) => (
                  <WatchlistRow key={item.id} item={item} onRemove={removeItem} index={idx} />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Symbol Dialog ── */}
      <AddSymbolDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addItem}
        existingSymbols={items.map((i) => i.symbol)}
      />
    </div>
  );
}
