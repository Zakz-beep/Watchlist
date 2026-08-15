"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { WatchlistItem } from "@/types/market";

interface MarketSentimentProps {
  items: WatchlistItem[];
}

export function MarketSentiment({ items }: MarketSentimentProps) {
  const total = items.length;
  
  if (total === 0) {
    return (
      <div className="p-4 rounded-2xl border border-border/40 glass">
        <h3 className="font-semibold text-sm mb-4">Market Sentiment</h3>
        <p className="text-sm text-muted-foreground">Not enough data.</p>
      </div>
    );
  }

  const gainers = items.filter((i) => (i.priceData?.changePercent ?? 0) > 0).length;
  const losers = items.filter((i) => (i.priceData?.changePercent ?? 0) < 0).length;
  const neutral = total - gainers - losers;

  const gainPct = (gainers / total) * 100;
  const lossPct = (losers / total) * 100;
  const neutPct = (neutral / total) * 100;

  let sentiment = "Neutral";
  let color = "text-muted-foreground";
  if (gainers > losers * 1.5) {
    sentiment = "Strong Bullish";
    color = "text-gain";
  } else if (gainers > losers) {
    sentiment = "Bullish";
    color = "text-gain";
  } else if (losers > gainers * 1.5) {
    sentiment = "Strong Bearish";
    color = "text-loss";
  } else if (losers > gainers) {
    sentiment = "Bearish";
    color = "text-loss";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl border border-border/40 glass space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Market Sentiment</h3>
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>
          {sentiment}
        </span>
      </div>

      <div className="h-3 w-full rounded-full flex overflow-hidden bg-muted/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${gainPct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="bg-gain h-full"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${neutPct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="bg-muted-foreground/30 h-full"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${lossPct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="bg-loss h-full"
        />
      </div>

      <div className="flex justify-between text-xs font-medium">
        <div className="flex items-center gap-1.5 text-gain">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{gainers} Gainers</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Minus className="w-3.5 h-3.5" />
          <span>{neutral} Flat</span>
        </div>
        <div className="flex items-center gap-1.5 text-loss">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>{losers} Losers</span>
        </div>
      </div>
    </motion.div>
  );
}
