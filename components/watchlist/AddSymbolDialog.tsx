// components/watchlist/AddSymbolDialog.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TickerLogo } from "@/components/ui/TickerLogo";
import { getAssetTypeColor, getSourceColor } from "@/lib/ticker-logo";
import type { SearchResult, AssetSource } from "@/types/market";

// Popular defaults to show before user types
const POPULAR: SearchResult[] = [
  { symbol: "BTC",      name: "Bitcoin Perpetual", assetType: "crypto", source: "hyperliquid", exchange: "Hyperliquid" },
  { symbol: "ETH",      name: "Ethereum Perpetual", assetType: "crypto", source: "hyperliquid", exchange: "Hyperliquid" },
  { symbol: "SOL",      name: "Solana Perpetual", assetType: "crypto", source: "hyperliquid", exchange: "Hyperliquid" },
  { symbol: "HYPE",     name: "Hyperliquid Perpetual", assetType: "crypto", source: "hyperliquid", exchange: "Hyperliquid" },
  { symbol: "AAPL",     name: "Apple Inc.",    assetType: "stock",  source: "yahoo" },
  { symbol: "NVDA",     name: "NVIDIA Corp.",  assetType: "stock",  source: "yahoo" },
  { symbol: "TSLA",     name: "Tesla Inc.",    assetType: "stock",  source: "yahoo" },
  { symbol: "MSFT",     name: "Microsoft",     assetType: "stock",  source: "yahoo" },
  { symbol: "^GSPC",    name: "S&P 500",       assetType: "index",  source: "yahoo" },
];

interface AddSymbolDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (result: SearchResult) => void;
  existingSymbols?: string[];
}

export function AddSymbolDialog({ open, onClose, onAdd, existingSymbols = [] }: AddSymbolDialogProps) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<AssetSource | "all">("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [catalog, setCatalog] = useState<SearchResult[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const loadCatalog = useCallback(async (offset = 0, queryText = "") => {
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({ limit: "60", offset: String(offset) });
      if (queryText) params.set("q", queryText);
      const res = await fetch(`/api/markets/hyperliquid?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load market catalog");
      const data = await res.json() as { markets: SearchResult[]; total: number; nextOffset: number | null };
      setCatalog((current) => offset === 0 ? data.markets : [...current, ...data.markets]);
      setCatalogTotal(data.total);
      setNextOffset(data.nextOffset);
    } catch {
      if (offset === 0) setCatalog([]);
      setCatalogTotal(0);
      setNextOffset(null);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // Update query and reset results asynchronously when cleared
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setLoading(false);
    }
  };

  // Asynchronous debounced autocomplete search (no synchronous setState in effect body)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      if (open && source === "hyperliquid") loadCatalog();
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const endpoint = source === "hyperliquid"
          ? `/api/markets/hyperliquid?q=${encodeURIComponent(trimmed)}&limit=60`
          : `/api/search?q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(endpoint);
        if (res.ok) {
          if (source === "hyperliquid") {
            const data = await res.json() as { markets: SearchResult[]; total: number; nextOffset: number | null };
            setResults(data.markets);
          } else {
            const data: SearchResult[] = await res.json();
            setResults(data);
          }
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [loadCatalog, open, query, source]);

  const handleAdd = useCallback(
    (result: SearchResult) => {
      onAdd(result);
      onClose();
      setQuery("");
      setResults([]);
    },
    [onAdd, onClose]
  );

  const displayList = query.trim() ? results : source === "hyperliquid" ? catalog : POPULAR;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg glass border border-border/40 rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Add Symbol to Watchlist</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Autocomplete Input */}
            <div className="px-6 pt-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Type to search symbol or company name... (e.g. AAPL, BTC, Nvidia)"
                  className="w-full pl-10 pr-10 py-3 bg-background/50 border border-border/40 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  autoFocus
                />
                {loading ? (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                ) : query ? (
                  <button
                    onClick={() => handleQueryChange("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-muted text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>

              {/* Source filter */}
              <div className="flex gap-2 mt-3">
                {(["all", "hyperliquid", "yahoo"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSource(s);
                      setResults([]);
                      if (s === "hyperliquid" && !query.trim()) loadCatalog();
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                      source === s
                        ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                        : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                  >
                    {s === "all" ? "All Sources" : s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Autocomplete Results List */}
            <div className="px-6 py-4 max-h-80 overflow-y-auto space-y-1.5">
              {!query.trim() && source !== "hyperliquid" && (
                <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
                  ⚡ Popular Tickers
                </p>
              )}

              {!query.trim() && source === "hyperliquid" && (
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    All active Hyperliquid markets {catalogTotal > 0 ? `(${catalogTotal})` : ""}
                  </p>
                  {catalogLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </div>
              )}

              {query.trim() && !results.length && !loading && (
                <div className="text-center py-8">
                  <p className="text-sm font-semibold mb-1">No matching assets found</p>
                  <p className="text-xs text-muted-foreground">Try searching by ticker symbol (e.g. AAPL) or company name</p>
                </div>
              )}

              {displayList
                .filter((r) => source === "all" || r.source === source)
                .map((result, idx) => {
                  const alreadyAdded = existingSymbols.includes(result.symbol);
                  return (
                    <motion.div
                      key={`${result.source}-${result.symbol}-${idx}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <TickerLogo
                          symbol={result.symbol}
                          name={result.name}
                          assetType={result.assetType}
                          size={36}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm truncate">{result.symbol}</span>
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded-md font-semibold border uppercase",
                                getAssetTypeColor(result.assetType)
                              )}
                            >
                              {result.assetType}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{result.name}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase hidden sm:inline-block",
                            getSourceColor(result.source)
                          )}
                        >
                          {result.source}
                        </span>
                        <button
                          onClick={() => !alreadyAdded && handleAdd(result)}
                          disabled={alreadyAdded}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                            alreadyAdded
                              ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground"
                              : "bg-foreground text-background hover:bg-foreground/90 shadow-sm hover:scale-105"
                          )}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {alreadyAdded ? "Added" : "Add"}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}

              {!query.trim() && source === "hyperliquid" && nextOffset !== null && (
                <button
                  onClick={() => loadCatalog(nextOffset)}
                  disabled={catalogLoading}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-border/50 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
                >
                  {catalogLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  Load more markets
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
