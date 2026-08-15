"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { formatPrice, formatChangePercent } from "@/lib/utils";
import type { WatchlistItem } from "@/types/market";
import Link from "next/link";

interface TopMoversProps {
  items: WatchlistItem[];
}

export function TopMovers({ items }: TopMoversProps) {
  const withPrices = items.filter((i) => i.priceData !== undefined);
  
  if (withPrices.length < 2) {
    return (
      <div className="p-4 rounded-2xl border border-border/40 glass">
        <h3 className="font-semibold text-sm mb-4">Top Movers</h3>
        <p className="text-sm text-muted-foreground">Add more assets to see top movers.</p>
      </div>
    );
  }

  const sorted = [...withPrices].sort(
    (a, b) => (b.priceData?.changePercent ?? 0) - (a.priceData?.changePercent ?? 0)
  );

  const topGainer = sorted[0];
  const topLoser = sorted[sorted.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 rounded-2xl border border-border/40 glass space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Top Movers (24h)</h3>
        <Link href="/dashboard/charts" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          More <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {/* Top Gainer */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gain/5 border border-gain/10 group cursor-default">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gain/10 text-gain group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm">{topGainer.symbol}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{topGainer.name}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-semibold text-gain">
              {formatChangePercent(topGainer.priceData?.changePercent ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {formatPrice(topGainer.priceData?.price ?? 0)}
            </div>
          </div>
        </div>

        {/* Top Loser */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-loss/5 border border-loss/10 group cursor-default">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-loss/10 text-loss group-hover:scale-110 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm">{topLoser.symbol}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{topLoser.name}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-semibold text-loss">
              {formatChangePercent(topLoser.priceData?.changePercent ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {formatPrice(topLoser.priceData?.price ?? 0)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
