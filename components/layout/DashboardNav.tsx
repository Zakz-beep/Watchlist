// components/layout/DashboardNav.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { Sun, Moon, Bell, RefreshCw, Search, X, Loader2, Plus, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { TickerLogo } from "@/components/ui/TickerLogo";
import { getAssetTypeColor } from "@/lib/ticker-logo";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import type { SearchResult } from "@/types/market";
import { cn } from "@/lib/utils";

export function DashboardNav() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { items, addItem } = useWatchlist();

  // Autocomplete state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [addedSymbols, setAddedSymbols] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update query state & clear dropdown on empty query
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setLoading(false);
      setOpenDropdown(false);
    }
  };

  // Asynchronous debounced search effect (no synchronous setState inside effect body)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      setOpenDropdown(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data: SearchResult[] = await res.json();
          setResults(data);
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
  }, [query]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleAdd = (result: SearchResult) => {
    addItem(result);
    setAddedSymbols((prev) => new Set(prev).add(result.symbol));
  };

  const existingSymbols = items.map((i) => i.symbol);

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border/40 glass shrink-0 relative z-50">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-sm font-semibold">Dashboard</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {mounted
              ? new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : ""}
          </p>
        </div>
      </div>

      {/* ── Global Autocomplete Search Bar ── */}
      <div className="relative flex-1 max-w-md mx-4" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query.trim() && setOpenDropdown(true)}
            placeholder="Quick search symbol or company... (e.g. AAPL, BTC, NVDA)"
            className="w-full pl-9 pr-8 py-1.5 bg-muted/30 border border-border/40 rounded-xl text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {loading ? (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
          ) : query ? (
            <button
              onClick={() => handleQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {/* Floating Autocomplete Dropdown */}
        <AnimatePresence>
          {openDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 glass border border-border/40 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 max-h-80 overflow-y-auto"
            >
              {loading && !results.length && (
                <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Searching assets...
                </div>
              )}

              {!loading && !results.length && query.trim() && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No matching tickers found for &quot;{query}&quot;
                </div>
              )}

              {results.map((result, idx) => {
                const isAdded = existingSymbols.includes(result.symbol) || addedSymbols.has(result.symbol);
                return (
                  <div
                    key={`${result.source}-${result.symbol}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TickerLogo
                        symbol={result.symbol}
                        name={result.name}
                        assetType={result.assetType}
                        size={32}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs truncate">{result.symbol}</span>
                          <span
                            className={cn(
                              "text-[9px] px-1.5 py-0.2 rounded-md font-semibold border uppercase",
                              getAssetTypeColor(result.assetType)
                            )}
                          >
                            {result.assetType}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{result.name}</div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAdded) handleAdd(result);
                      }}
                      disabled={isAdded}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ml-2",
                        isAdded
                          ? "bg-muted/50 text-muted-foreground opacity-60 cursor-default"
                          : "bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                      )}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav Actions ── */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          title="Refresh prices"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </button>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  );
}
