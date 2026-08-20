"use client";

import { useState } from "react";
import { CandlestickChart, ExternalLink, Layers3 } from "lucide-react";
import { HyperliquidChart } from "@/components/charts/HyperliquidChart";
import { HyperliquidMarketSearch } from "@/components/charts/HyperliquidMarketSearch";
import { HyperliquidOrderFlow } from "@/components/charts/HyperliquidOrderFlow";
import { HyperliquidOrderBook } from "@/components/charts/HyperliquidOrderBook";
import { cn } from "@/lib/utils";

const SYMBOLS = ["BTC", "ETH", "SOL", "HYPE", "xyz:TSLA", "xyz:NVDA", "xyz:GOLD", "xyz:BRENTOIL"];
const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"];

export default function ChartsPage() {
  const [symbol, setSymbol] = useState("BTC");
  const [interval, setInterval] = useState("15m");

  return (
    <div className="mx-auto max-w-screen-2xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><CandlestickChart className="h-5 w-5 text-primary" /><h2 className="text-2xl font-bold tracking-tight">Hyperliquid chart</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Candles, drawing tools, L2 book, and order-flow signals.</p>
        </div>
        <a href={`https://app.hyperliquid.xyz/trade/${encodeURIComponent(symbol)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /> Open Hyperliquid</a>
      </header>

      <section className="ios-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Layers3 className="h-3.5 w-3.5" /> Perpetual</div>
          <HyperliquidMarketSearch onSelect={(result) => setSymbol(result.symbol)} />
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted/40 p-1">
            {SYMBOLS.map((item) => <button key={item} onClick={() => setSymbol(item)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold transition-colors", item === symbol ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground")}>{item}</button>)}
          </div>
          <div className="ml-0 flex gap-1 sm:ml-auto">
            {INTERVALS.map((item) => <button key={item} onClick={() => setInterval(item)} className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors", item === interval ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted")}>{item}</button>)}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <HyperliquidChart symbol={symbol} interval={interval} />
        <div className="space-y-4">
          <HyperliquidOrderBook symbol={symbol} />
          <HyperliquidOrderFlow symbol={symbol} />
        </div>
      </div>
    </div>
  );
}
