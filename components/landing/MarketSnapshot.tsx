// components/landing/MarketSnapshot.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPrice, formatChangePercent, formatLargeNumber } from "@/lib/utils";

const SNAPSHOT_ASSETS = [
  { symbol: "BTC",     name: "Bitcoin Perpetual", icon: "₿", source: "hyperliquid", color: "from-orange-500/20 to-yellow-500/20" },
  { symbol: "ETH",     name: "Ethereum Perpetual", icon: "Ξ", source: "hyperliquid", color: "from-blue-500/20 to-cyan-500/20" },
  { symbol: "AAPL",    name: "Apple",   icon: "", source: "yahoo",   color: "from-slate-500/20 to-gray-500/20" },
  { symbol: "NVDA",    name: "NVIDIA",  icon: "⬡", source: "yahoo",  color: "from-green-500/20 to-emerald-500/20" },
  { symbol: "^GSPC",   name: "S&P 500", icon: "📈", source: "yahoo", color: "from-purple-500/20 to-violet-500/20" },
  { symbol: "GC=F",    name: "Gold",    icon: "◈", source: "yahoo",  color: "from-yellow-500/20 to-amber-500/20" },
];

type PriceResult = {
  symbol: string;
  price: number;
  changePercent: number;
  marketCap?: number;
  volume: number;
};

async function fetchSnapshotPrices(): Promise<PriceResult[]> {
  const hyperliquidSyms = SNAPSHOT_ASSETS.filter((a) => a.source === "hyperliquid")
    .map((a) => a.symbol)
    .join(",");
  const yahooSyms = SNAPSHOT_ASSETS.filter((a) => a.source === "yahoo")
    .map((a) => a.symbol)
    .join(",");

  const [hyperliquid, y] = await Promise.allSettled([
    fetch(`/api/prices/hyperliquid?symbols=${hyperliquidSyms}`).then((r) => r.json()),
    fetch(`/api/prices/yahoo?symbols=${yahooSyms}`).then((r) => r.json()),
  ]);

  const results: PriceResult[] = [];
  if (hyperliquid.status === "fulfilled" && Array.isArray(hyperliquid.value)) results.push(...hyperliquid.value);
  if (y.status === "fulfilled" && Array.isArray(y.value)) results.push(...y.value);
  return results;
}

export function MarketSnapshot() {
  const { data, isLoading } = useQuery({
    queryKey: ["snapshot-prices"],
    queryFn: fetchSnapshotPrices,
    refetchInterval: 15_000,
  });

  const priceMap = new Map((data ?? []).map((d) => [d.symbol, d]));

  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Live Market Snapshot</h2>
          <p className="text-muted-foreground text-lg">
            Real-time prices updated every 15 seconds
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SNAPSHOT_ASSETS.map((asset, i) => {
            const price = priceMap.get(asset.symbol);
            const isGain = (price?.changePercent ?? 0) >= 0;

            return (
              <motion.div
                key={asset.symbol}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.02 }}
                className={`relative p-5 rounded-2xl border border-border/40 glass overflow-hidden group`}
              >
                {/* Hover gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${asset.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{asset.icon}</div>
                      <div>
                        <div className="font-semibold text-sm">{asset.name}</div>
                        <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        isGain ? "bg-gain text-gain" : "bg-loss text-loss"
                      }`}
                    >
                      {isGain ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {isLoading
                        ? "—"
                        : formatChangePercent(price?.changePercent ?? 0)}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="skeleton h-7 w-32 rounded mb-2" />
                  ) : (
                    <div className="text-2xl font-bold font-mono">
                      {price ? formatPrice(price.price) : "—"}
                    </div>
                  )}

                  {price?.marketCap && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Cap: {formatLargeNumber(price.marketCap)}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
