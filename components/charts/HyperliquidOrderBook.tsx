"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
}

interface OrderBook {
  symbol: string;
  updatedAt: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

async function fetchOrderBook(symbol: string): Promise<OrderBook> {
  const response = await fetch(`/api/prices/hyperliquid/orderbook?symbol=${encodeURIComponent(symbol)}`);
  if (!response.ok) throw new Error("Could not load Hyperliquid order book");
  return response.json() as Promise<OrderBook>;
}

function formatSize(size: number): string {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(2)}M`;
  if (size >= 1_000) return `${(size / 1_000).toFixed(2)}K`;
  return size.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function BookSide({ levels, side }: { levels: OrderBookLevel[]; side: "ask" | "bid" }) {
  const maximumSize = Math.max(...levels.map((level) => level.size), 1);
  const sortedLevels = side === "ask" ? [...levels].reverse() : levels;
  const tone = side === "ask" ? "text-red-400" : "text-emerald-400";
  const background = side === "ask" ? "bg-red-500/10" : "bg-emerald-500/10";

  return (
    <div className="space-y-0.5">
      {sortedLevels.slice(0, 10).map((level) => (
        <div key={`${side}-${level.price}`} className="relative grid grid-cols-3 gap-2 overflow-hidden rounded px-2 py-1 text-[11px] font-mono tabular-nums">
          <div className={`absolute inset-y-0 right-0 ${background}`} style={{ width: `${(level.size / maximumSize) * 100}%` }} />
          <span className={`relative ${tone}`}>{formatPrice(level.price)}</span>
          <span className="relative text-right text-muted-foreground">{formatSize(level.size)}</span>
          <span className="relative text-right text-muted-foreground/70">{level.orders}</span>
        </div>
      ))}
    </div>
  );
}

export function HyperliquidOrderBook({ symbol }: { symbol: string }) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["hyperliquid-order-book", symbol],
    queryFn: () => fetchOrderBook(symbol),
    refetchInterval: 2_000,
  });
  const bestAsk = data?.asks[0]?.price;
  const bestBid = data?.bids[0]?.price;
  const spread = bestAsk !== undefined && bestBid !== undefined ? bestAsk - bestBid : undefined;

  return (
    <aside className="ios-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold">Order book</h2>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">Hyperliquid L2</p>
        </div>
        {(isLoading || isFetching) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      <div className="grid grid-cols-3 gap-2 border-b border-border/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Price</span><span className="text-right">Size</span><span className="text-right">Orders</span>
      </div>
      <div className="min-h-[326px] p-2">
        {data ? (
          <>
            <BookSide levels={data.asks} side="ask" />
            <div className="my-2 rounded-lg bg-muted/40 px-2 py-2">
              <div className="flex items-baseline justify-between"><span className="font-mono text-sm font-bold">{bestBid ? formatPrice(bestBid) : "—"}</span><span className="text-[10px] text-muted-foreground">Spread {spread !== undefined ? spread.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "—"}</span></div>
            </div>
            <BookSide levels={data.bids} side="bid" />
          </>
        ) : (
          <div className="flex h-full min-h-[326px] items-center justify-center text-sm text-muted-foreground">Order book unavailable</div>
        )}
      </div>
    </aside>
  );
}
