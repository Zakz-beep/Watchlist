"use client";

import { motion } from "framer-motion";
import { Newspaper, ExternalLink } from "lucide-react";

// Mock news data
const NEWS_ITEMS = [
  {
    id: 1,
    title: "Federal Reserve hints at potential rate cuts in next quarter",
    source: "MarketWatch",
    time: "2h ago",
    tag: "Macro",
  },
  {
    id: 2,
    title: "Tech stocks rally as AI spending surpasses expectations",
    source: "Bloomberg",
    time: "4h ago",
    tag: "Tech",
  },
  {
    id: 3,
    title: "Bitcoin breaks consolidation pattern, eyeing new highs",
    source: "CoinDesk",
    time: "5h ago",
    tag: "Crypto",
  },
  {
    id: 4,
    title: "Oil prices stabilize amid global supply concerns",
    source: "Reuters",
    time: "7h ago",
    tag: "Commodities",
  },
];

export function RecentNews() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-4 rounded-2xl border border-border/40 glass space-y-4"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Market News</h3>
        <Newspaper className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="space-y-4">
        {NEWS_ITEMS.map((news) => (
          <div key={news.id} className="group relative pr-6">
            <h4 className="text-sm font-medium leading-snug group-hover:text-primary transition-colors cursor-pointer">
              {news.title}
            </h4>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/70">{news.source}</span>
              <span>•</span>
              <span>{news.time}</span>
              <span>•</span>
              <span className="text-blue-400">{news.tag}</span>
            </div>
            
            <a href="#" className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted/50 rounded text-muted-foreground hover:text-foreground">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
      
      <button className="w-full py-2.5 rounded-xl border border-border/50 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors">
        View All News
      </button>
    </motion.div>
  );
}
