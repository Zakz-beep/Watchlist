// components/watchlist/WatchlistTable.tsx
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { SparklineChart } from "./SparklineChart";
import { TickerLogo } from "@/components/ui/TickerLogo";
import { getAssetTypeColor, getSourceColor } from "@/lib/ticker-logo";
import { formatPrice, formatLargeNumber, formatChangePercent, timeAgo, cn } from "@/lib/utils";
import type { WatchlistItem } from "@/types/market";

type SortField = "symbol" | "price" | "changePercent" | "volume" | "marketCap";
type SortDir = "asc" | "desc" | null;

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove?: (id: string) => void;
  isLoading?: boolean;
}

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string | null; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />;
  if (sortDir === "asc") return <ChevronUp className="w-3.5 h-3.5 text-primary" />;
  return <ChevronDown className="w-3.5 h-3.5 text-primary" />;
}

interface HeaderCellProps {
  field: SortField;
  label: string;
  className?: string;
  sortField: SortField | null;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}

// Declared outside of render to prevent React 19 component-creation-during-render errors
function HeaderCell({ field, label, className, sortField, sortDir, onSort }: HeaderCellProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none group transition-colors hover:text-foreground",
        className
      )}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  );
}

function getExternalUrl(symbol: string, source: string): string {
  const upper = symbol.toUpperCase();
  if (source === "binance") {
    if (upper.match(/(\.P|\.PERP|_PERP)$/i)) {
      const clean = upper.replace(/(\.P|\.PERP|_PERP)$/i, "");
      return `https://www.binance.com/en/futures/${clean}`;
    }
    return `https://www.binance.com/en/trade/${upper}`;
  }
  if (source === "okx") {
    return upper.includes("-SWAP")
      ? `https://www.okx.com/trade-swap/${upper.toLowerCase()}`
      : `https://www.okx.com/trade-spot/${upper.toLowerCase()}`;
  }
  return `https://finance.yahoo.com/quote/${encodeURIComponent(upper)}`;
}

export function WatchlistTable({ items, onRemove, isLoading }: WatchlistTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
        return field;
      }
      setSortDir("asc");
      return field;
    });
  }, []);

  // Client-side sort
  const sortedItems = [...items].sort((a, b) => {
    if (!sortField || !sortDir) return 0;
    const ap = a.priceData;
    const bp = b.priceData;

    let av = 0, bv = 0;
    if (sortField === "symbol") {
      return sortDir === "asc"
        ? a.symbol.localeCompare(b.symbol)
        : b.symbol.localeCompare(a.symbol);
    }
    if (sortField === "price")         { av = ap?.price ?? 0;         bv = bp?.price ?? 0; }
    if (sortField === "changePercent") { av = ap?.changePercent ?? 0; bv = bp?.changePercent ?? 0; }
    if (sortField === "volume")        { av = ap?.volume ?? 0;        bv = bp?.volume ?? 0; }
    if (sortField === "marketCap")     { av = ap?.marketCap ?? 0;     bv = bp?.marketCap ?? 0; }

    return sortDir === "asc" ? av - bv : bv - av;
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-base font-medium">No assets in watchlist</p>
        <p className="text-sm">Add symbols using the + button above</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40">
            <HeaderCell field="symbol"        label="Asset"   className="pl-6" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Source
            </th>
            <HeaderCell field="price"         label="Price"   className="text-right" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <HeaderCell field="changePercent" label="24h %"   className="text-right" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              7d
            </th>
            <HeaderCell field="volume"        label="Volume"  className="text-right" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <HeaderCell field="marketCap"     label="Mkt Cap" className="text-right" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-6">
              Updated
            </th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {sortedItems.map((item, i) => {
              const p = item.priceData;
              const isGain = (p?.changePercent ?? 0) >= 0;

              return (
                <motion.tr
                  key={`${item.id}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/20 hover:bg-muted/20 transition-colors group"
                >
                  {/* Asset with Ticker Logo */}
                  <td className="px-4 py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <TickerLogo
                        symbol={item.symbol}
                        name={item.name}
                        assetType={item.assetType}
                        size={36}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{item.symbol}</span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded font-semibold border uppercase",
                              getAssetTypeColor(item.assetType)
                            )}
                          >
                            {item.assetType}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[160px]">{item.name}</div>
                      </div>
                    </div>
                  </td>

                  {/* Source badge */}
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider",
                        getSourceColor(item.source)
                      )}
                    >
                      {item.source}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-4 text-right font-mono font-semibold">
                    {p ? formatPrice(p.price) : <span className="skeleton inline-block h-4 w-20 rounded" />}
                  </td>

                  {/* Change % */}
                  <td className="px-4 py-4 text-right">
                    {p ? (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
                          isGain ? "bg-gain text-gain" : "bg-loss text-loss"
                        )}
                      >
                        {isGain ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {formatChangePercent(p.changePercent)}
                      </div>
                    ) : (
                      <span className="skeleton inline-block h-6 w-16 rounded-lg" />
                    )}
                  </td>

                  {/* Sparkline */}
                  <td className="px-4 py-4">
                    <SparklineChart
                      data={p?.sparkline ?? []}
                      positive={isGain}
                      height={36}
                    />
                  </td>

                  {/* Volume */}
                  <td className="px-4 py-4 text-right text-muted-foreground font-mono text-xs">
                    {p ? formatLargeNumber(p.volume) : "—"}
                  </td>

                  {/* Market Cap */}
                  <td className="px-4 py-4 text-right text-muted-foreground font-mono text-xs">
                    {p?.marketCap ? formatLargeNumber(p.marketCap) : "—"}
                  </td>

                  {/* Updated */}
                  <td className="px-4 py-4 pr-6 text-right text-xs text-muted-foreground">
                    {p ? timeAgo(p.updatedAt) : "—"}
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={getExternalUrl(item.symbol, item.source)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        title="Open on exchange / source"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {onRemove && (
                        <button
                          onClick={() => onRemove(item.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
