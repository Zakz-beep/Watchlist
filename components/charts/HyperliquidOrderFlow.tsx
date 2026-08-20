"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowDownRight, ArrowUpRight, Loader2, Radar, ShieldAlert, Waves } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

interface FlowTrade {
  id: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  notional: number;
  time: number;
}

interface BookLevel {
  price: number;
  size: number;
  orders: number;
}

interface OrderFlowData {
  symbol: string;
  updatedAt: number;
  trades: FlowTrade[];
  bids: BookLevel[];
  asks: BookLevel[];
}

interface BookSnapshot {
  mid: number;
  bidLiquidity: number;
  askLiquidity: number;
}

interface Wall {
  key: string;
  side: "bid" | "ask";
  price: number;
  notional: number;
  multiple: number;
  status: "new" | "holding" | "weakening";
}

interface WallEvent {
  key: string;
  side: "bid" | "ask";
  price: number;
  status: "pulled";
}

interface AbsorptionSignal {
  side: "bid" | "ask";
  score: number;
  aggressorNotional: number;
}

async function fetchOrderFlow(symbol: string): Promise<OrderFlowData> {
  const response = await fetch(`/api/prices/hyperliquid/orderflow?symbol=${encodeURIComponent(symbol)}`);
  if (!response.ok) throw new Error("Could not load Hyperliquid order flow");
  return response.json() as Promise<OrderFlowData>;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatClock(time: number): string {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(time);
}

function findWalls(levels: BookLevel[], side: "bid" | "ask"): Wall[] {
  const depth = levels.slice(0, 15);
  const baseline = median(depth.map((level) => level.price * level.size));
  if (!baseline) return [];

  return depth
    .map((level) => ({
      key: `${side}-${level.price}`,
      side,
      price: level.price,
      notional: level.price * level.size,
      multiple: (level.price * level.size) / baseline,
      status: "new" as const,
    }))
    .filter((wall) => wall.multiple >= 4)
    .sort((a, b) => b.notional - a.notional)
    .slice(0, 3);
}

export function HyperliquidOrderFlow({ symbol }: { symbol: string }) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["hyperliquid-order-flow", symbol],
    queryFn: () => fetchOrderFlow(symbol),
    refetchInterval: 2_000,
    staleTime: 0,
  });
  const seenTrades = useRef(new Set<string>());
  const previousBook = useRef<BookSnapshot | null>(null);
  const trackedWalls = useRef(new Map<string, Wall>());
  const activeSymbol = useRef(symbol);
  const [cvd, setCvd] = useState(0);
  const [recentTrades, setRecentTrades] = useState<FlowTrade[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [lastWallEvent, setLastWallEvent] = useState<WallEvent | null>(null);
  const [absorption, setAbsorption] = useState<AbsorptionSignal | null>(null);

  useEffect(() => {
    if (!data) return;

    if (activeSymbol.current !== data.symbol) {
      activeSymbol.current = data.symbol;
      seenTrades.current.clear();
      previousBook.current = null;
      trackedWalls.current.clear();
      setCvd(0);
      setRecentTrades([]);
      setWalls([]);
      setLastWallEvent(null);
      setAbsorption(null);
    }

    const unseenTrades = data.trades.filter((trade) => !seenTrades.current.has(trade.id));
    unseenTrades.forEach((trade) => seenTrades.current.add(trade.id));
    if (seenTrades.current.size > 1_200) {
      const ids = [...seenTrades.current].slice(-800);
      seenTrades.current = new Set(ids);
    }

    if (unseenTrades.length) {
      const delta = unseenTrades.reduce((total, trade) => total + (trade.side === "buy" ? trade.notional : -trade.notional), 0);
      setCvd((current) => current + delta);
      setRecentTrades((current) => [...unseenTrades, ...current].sort((a, b) => b.time - a.time).slice(0, 22));
    }

    const bidLiquidity = data.bids.slice(0, 3).reduce((total, level) => total + level.price * level.size, 0);
    const askLiquidity = data.asks.slice(0, 3).reduce((total, level) => total + level.price * level.size, 0);
    const bestBid = data.bids[0]?.price;
    const bestAsk = data.asks[0]?.price;
    const currentBook = bestBid && bestAsk ? { mid: (bestBid + bestAsk) / 2, bidLiquidity, askLiquidity } : null;
    const priorBook = previousBook.current;

    if (priorBook && currentBook && unseenTrades.length >= 8) {
      const buyNotional = unseenTrades.filter((trade) => trade.side === "buy").reduce((total, trade) => total + trade.notional, 0);
      const sellNotional = unseenTrades.filter((trade) => trade.side === "sell").reduce((total, trade) => total + trade.notional, 0);
      const totalNotional = buyNotional + sellNotional;
      const dominantSide = buyNotional >= sellNotional ? "buy" : "sell";
      const dominantNotional = Math.max(buyNotional, sellNotional);
      const dominance = totalNotional ? dominantNotional / totalNotional : 0;
      const moveBps = Math.abs((currentBook.mid - priorBook.mid) / priorBook.mid) * 10_000;
      const defendingSide = dominantSide === "buy" ? "ask" : "bid";
      const retainedLiquidity = defendingSide === "ask"
        ? currentBook.askLiquidity / Math.max(priorBook.askLiquidity, 1)
        : currentBook.bidLiquidity / Math.max(priorBook.bidLiquidity, 1);

      if (dominance >= 0.65 && moveBps <= 1.5 && retainedLiquidity >= 0.8) {
        setAbsorption({
          side: defendingSide,
          aggressorNotional: dominantNotional,
          score: Math.min(99, Math.round(dominance * 55 + Math.min(25, unseenTrades.length) + Math.min(19, retainedLiquidity * 12))),
        });
      } else {
        setAbsorption(null);
      }
    }
    previousBook.current = currentBook;

    const detectedWalls = [...findWalls(data.bids, "bid"), ...findWalls(data.asks, "ask")];
    const nextTrackedWalls = new Map<string, Wall>();
    const classifiedWalls = detectedWalls.map((wall) => {
      const prior = trackedWalls.current.get(wall.key);
      const status: Wall["status"] = !prior ? "new" : wall.notional >= prior.notional * 0.8 ? "holding" : "weakening";
      const classified = { ...wall, status };
      nextTrackedWalls.set(wall.key, classified);
      return classified;
    });
    const pulled = [...trackedWalls.current.values()].find((wall) => !nextTrackedWalls.has(wall.key));
    if (pulled) setLastWallEvent({ key: pulled.key, side: pulled.side, price: pulled.price, status: "pulled" });
    trackedWalls.current = nextTrackedWalls;
    setWalls(classifiedWalls);
  }, [data]);

  const tradeTotals = useMemo(() => recentTrades.reduce((total, trade) => ({
    buy: total.buy + (trade.side === "buy" ? trade.notional : 0),
    sell: total.sell + (trade.side === "sell" ? trade.notional : 0),
  }), { buy: 0, sell: 0 }), [recentTrades]);

  return (
    <section className="ios-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><h2 className="text-sm font-bold">Order flow</h2></div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">Hyperliquid · 2s feed</p>
        </div>
        {(isLoading || isFetching) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-3 divide-x divide-border/40 border-b border-border/40">
        <div className="p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">CVD</p><p className={cn("mt-1 font-mono text-sm font-bold", cvd >= 0 ? "text-emerald-400" : "text-red-400")}>{cvd >= 0 ? "+" : ""}{formatUsd(cvd)}</p></div>
        <div className="p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">Buy</p><p className="mt-1 font-mono text-sm font-bold text-emerald-400">{formatUsd(tradeTotals.buy)}</p></div>
        <div className="p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">Sell</p><p className="mt-1 font-mono text-sm font-bold text-red-400">{formatUsd(tradeTotals.sell)}</p></div>
      </div>

      <div className="space-y-2 border-b border-border/40 p-3">
        <div className="flex items-center gap-1.5 text-xs font-bold"><Radar className="h-3.5 w-3.5 text-amber-400" /> Absorption</div>
        {absorption ? (
          <div className={cn("rounded-xl border px-3 py-2 text-xs", absorption.side === "ask" ? "border-red-500/30 bg-red-500/10" : "border-emerald-500/30 bg-emerald-500/10")}>
            <div className="flex items-center justify-between font-bold"><span>{absorption.side === "ask" ? "Ask absorption" : "Bid absorption"}</span><span>Score {absorption.score}</span></div>
            <p className="mt-1 text-[11px] text-muted-foreground">{formatUsd(absorption.aggressorNotional)} aggressive flow was absorbed while price held.</p>
          </div>
        ) : <p className="text-[11px] text-muted-foreground">No absorption setup confirmed yet.</p>}
      </div>

      <div className="border-b border-border/40 p-3">
        <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-bold"><Waves className="h-3.5 w-3.5 text-primary" /> Large order walls</span><span className="text-[10px] text-muted-foreground">≥4× local depth</span></div>
        {walls.length ? <div className="space-y-1.5">{walls.map((wall) => <div key={wall.key} className="flex items-center justify-between rounded-lg bg-muted/35 px-2.5 py-2 text-[11px]"><span className={wall.side === "bid" ? "text-emerald-400" : "text-red-400"}>{wall.side === "bid" ? "BID" : "ASK"} {formatPrice(wall.price)}</span><span className="font-mono font-semibold">{formatUsd(wall.notional)} · {wall.multiple.toFixed(1)}×</span><span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", wall.status === "new" ? "bg-amber-500/15 text-amber-400" : wall.status === "holding" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>{wall.status}</span></div>)}</div> : <p className="text-[11px] text-muted-foreground">No unusually large resting liquidity.</p>}
        {lastWallEvent && <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"><ShieldAlert className="h-3 w-3 text-amber-400" /> {lastWallEvent.side.toUpperCase()} wall at {formatPrice(lastWallEvent.price)} was pulled.</p>}
      </div>

      <div className="p-3">
        <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold">Trade tape</span><span className="text-[10px] text-muted-foreground">latest fills</span></div>
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {recentTrades.length ? recentTrades.map((trade) => <div key={trade.id} className="grid grid-cols-[48px_1fr_1fr] gap-2 rounded px-1 py-1 text-[11px] font-mono tabular-nums"><span className="text-muted-foreground">{formatClock(trade.time)}</span><span className={trade.side === "buy" ? "text-emerald-400" : "text-red-400"}>{trade.side === "buy" ? <ArrowUpRight className="mr-1 inline h-3 w-3" /> : <ArrowDownRight className="mr-1 inline h-3 w-3" />}{formatPrice(trade.price)}</span><span className="text-right text-foreground">{formatUsd(trade.notional)}</span></div>) : <p className="py-3 text-center text-[11px] text-muted-foreground">Waiting for trades…</p>}
        </div>
      </div>
    </section>
  );
}
