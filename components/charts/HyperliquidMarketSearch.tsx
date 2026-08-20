"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/market";

interface HyperliquidMarketSearchProps {
  onSelect: (result: SearchResult) => void;
}

export function HyperliquidMarketSearch({ onSelect }: HyperliquidMarketSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const data = response.ok ? await response.json() as SearchResult[] : [];
        setResults(data.filter((result) => result.source === "hyperliquid"));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setResults([]);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function selectMarket(result: SearchResult) {
    onSelect(result);
    setQuery("");
    setResults([]);
  }

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search Hyperliquid: TSLA, GOLD..."
        className="h-9 w-full rounded-xl border border-border/60 bg-background/70 pl-9 pr-9 text-xs font-medium outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
      />
      {loading ? <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" /> : query && <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      {!!query.trim() && (
        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-border/70 bg-popover p-1.5 shadow-xl">
          {results.length ? results.map((result) => (
            <button key={result.symbol} onClick={() => selectMarket(result)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/70">
              <div className="min-w-0"><p className="truncate text-xs font-bold">{result.symbol}</p><p className="truncate text-[10px] text-muted-foreground">{result.exchange}</p></div>
              <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase", result.assetType === "commodity" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : result.assetType === "index" ? "border-purple-500/30 bg-purple-500/10 text-purple-400" : result.assetType === "stock" ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400")}>{result.assetType}</span>
            </button>
          )) : !loading && <p className="px-3 py-5 text-center text-xs text-muted-foreground">No active Hyperliquid market found.</p>}
        </div>
      )}
    </div>
  );
}
