// components/landing/MarketTicker.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPrice, formatChangePercent } from "@/lib/utils";
import type { TickerItem } from "@/types/market";

const TICKER_SYMBOLS = [
  { symbol: "BTC", source: "hyperliquid", name: "Bitcoin" },
  { symbol: "ETH", source: "hyperliquid", name: "Ethereum" },
  { symbol: "SOL", source: "hyperliquid", name: "Solana" },
  { symbol: "HYPE", source: "hyperliquid", name: "Hyperliquid" },
  { symbol: "XRP", source: "hyperliquid", name: "XRP" },
  { symbol: "DOGE", source: "hyperliquid", name: "Dogecoin" },
];

const YAHOO_SYMBOLS = [
  { symbol: "AAPL", source: "yahoo", name: "Apple" },
  { symbol: "TSLA", source: "yahoo", name: "Tesla" },
  { symbol: "NVDA", source: "yahoo", name: "NVIDIA" },
  { symbol: "^GSPC", source: "yahoo", name: "S&P 500" },
  { symbol: "GC=F", source: "yahoo", name: "Gold" },
];

async function fetchTickerPrices(): Promise<TickerItem[]> {
  const hyperliquidSymbols = TICKER_SYMBOLS.map((s) => s.symbol).join(",");
  const yahooSymbols = YAHOO_SYMBOLS.map((s) => s.symbol).join(",");

  const [hyperliquidRes, yahooRes] = await Promise.allSettled([
    fetch(`/api/prices/hyperliquid?symbols=${hyperliquidSymbols}`).then((r) => r.json()),
    fetch(`/api/prices/yahoo?symbols=${yahooSymbols}`).then((r) => r.json()),
  ]);

  const items: TickerItem[] = [];

  if (hyperliquidRes.status === "fulfilled" && Array.isArray(hyperliquidRes.value)) {
    for (const d of hyperliquidRes.value) {
      const meta = TICKER_SYMBOLS.find((s) => s.symbol === d.symbol);
      if (meta) {
        items.push({
          symbol: d.symbol,
          name: meta.name,
          price: d.price,
          changePercent: d.changePercent,
          source: "hyperliquid",
        });
      }
    }
  }

  if (yahooRes.status === "fulfilled" && Array.isArray(yahooRes.value)) {
    for (const d of yahooRes.value) {
      const meta = YAHOO_SYMBOLS.find((s) => s.symbol === d.symbol);
      if (meta) {
        items.push({
          symbol: meta.symbol,
          name: meta.name,
          price: d.price,
          changePercent: d.changePercent,
          source: "yahoo",
        });
      }
    }
  }

  return items;
}

function TickerItemComp({ item }: { item: TickerItem }) {
  const isGain = item.changePercent >= 0;
  return (
    <div className="flex items-center gap-3 px-6 py-2 border-r border-border/30 shrink-0">
      <div className="flex items-center gap-1.5">
        {isGain ? (
          <TrendingUp className="w-3.5 h-3.5 text-gain" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-loss" />
        )}
        <span className="font-semibold text-sm text-foreground">{item.name}</span>
        <span className="text-xs text-muted-foreground">{item.symbol}</span>
      </div>
      <span className="text-sm font-mono font-medium">{formatPrice(item.price)}</span>
      <span className={`text-xs font-semibold ${isGain ? "text-gain" : "text-loss"}`}>
        {formatChangePercent(item.changePercent)}
      </span>
    </div>
  );
}

// Skeleton placeholder while loading
const PLACEHOLDER_COUNT = 8;

export function MarketTicker() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["ticker-prices"],
    queryFn: fetchTickerPrices,
    refetchInterval: 15_000,
  });

  const displayItems = items ?? [];

  return (
    <div className="w-full border-y border-border/40 glass overflow-hidden">
      <div className="flex items-center">
        {/* Label */}
        <div className="shrink-0 px-4 py-3 border-r border-border/40 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-background/20">
          LIVE
        </div>

        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden relative">
          {isLoading ? (
            <div className="flex">
              {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton h-10 w-48 mx-3 rounded-lg shrink-0"
                />
              ))}
            </div>
          ) : (
            // Duplicate items to create seamless loop
            <div className="flex ticker-animate whitespace-nowrap">
              {[...displayItems, ...displayItems].map((item, i) => (
                <TickerItemComp key={`${item.symbol}-${i}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
