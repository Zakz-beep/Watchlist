// app/dashboard/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus,
  RefreshCw,
  Cpu,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Pencil,
  Send,
  Globe,
  Camera,
} from "lucide-react";
import { WatchlistTable } from "@/components/watchlist/WatchlistTable";
import { AddSymbolDialog } from "@/components/watchlist/AddSymbolDialog";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { MarketSentiment } from "@/components/dashboard/MarketSentiment";
import { TopMovers } from "@/components/dashboard/TopMovers";
import { RecentNews } from "@/components/dashboard/RecentNews";
import { loadMarketEngine } from "@/lib/wasm/loader";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useUser } from "@/lib/hooks/useUser";
import type { WatchlistItem, PriceData } from "@/types/market";
import { cn } from "@/lib/utils";

function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)} width="1em" height="1em">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)} width="1em" height="1em">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)} width="1em" height="1em">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}


async function fetchPrices(items: Omit<WatchlistItem, "priceData">[]): Promise<PriceData[]> {
  const binanceSyms = items.filter((i) => i.source === "binance").map((i) => i.symbol);
  const yahooSyms   = items.filter((i) => i.source === "yahoo").map((i) => i.symbol);
  const okxSyms     = items.filter((i) => i.source === "okx").map((i) => i.symbol);
  const bingxSyms   = items.filter((i) => i.source === "bingx").map((i) => i.symbol);
  const hyperliquidSyms = items.filter((i) => i.source === "hyperliquid").map((i) => i.symbol);

  const fetches = [];
  if (binanceSyms.length)
    fetches.push(fetch(`/api/prices/binance?symbols=${binanceSyms.join(",")}`).then((r) => r.json()));
  if (yahooSyms.length)
    fetches.push(fetch(`/api/prices/yahoo?symbols=${yahooSyms.join(",")}`).then((r) => r.json()));
  if (okxSyms.length)
    fetches.push(fetch(`/api/prices/okx?symbols=${okxSyms.join(",")}`).then((r) => r.json()));
  if (bingxSyms.length)
    fetches.push(fetch(`/api/prices/bingx?symbols=${bingxSyms.join(",")}`).then((r) => r.json()));
  if (hyperliquidSyms.length)
    fetches.push(fetch(`/api/prices/hyperliquid?symbols=${hyperliquidSyms.join(",")}`).then((r) => r.json()));

  const results = await Promise.allSettled(fetches);
  const prices: PriceData[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      prices.push(...r.value);
    }
  }
  return prices;
}

export default function DashboardPage() {
  const { items, user: authUser, loading: watchlistLoading, addItem, removeItem } = useWatchlist();
  const { user, profile, updateProfile } = useUser();
  const [addOpen, setAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);

  // Pre-load WASM module
  useEffect(() => {
    loadMarketEngine().then(() => setWasmReady(true)).catch(() => {});
  }, []);

  // Fetch live prices
  const { data: prices, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-prices", items.map((i) => i.symbol).join(",")],
    queryFn: () => fetchPrices(items),
    refetchInterval: 15_000,
    enabled: items.length > 0,
  });

  // Merge items with live price data
  const watchlistItems: WatchlistItem[] = items.map((item) => {
    const priceData = prices?.find((p) => p.symbol === item.symbol);
    return { ...item, priceData };
  });

  // Summary stats
  const gainers = watchlistItems.filter((i) => (i.priceData?.changePercent ?? 0) > 0).length;
  const losers  = watchlistItems.filter((i) => (i.priceData?.changePercent ?? 0) < 0).length;

  const STATS = [
    { label: "Assets",  value: items.length,  icon: TrendingUp,  color: "text-blue-400" },
    { label: "Gainers", value: gainers,        icon: TrendingUp,  color: "text-gain" },
    { label: "Losers",  value: losers,         icon: TrendingDown, color: "text-loss" },
    { label: "WASM",    value: wasmReady ? "Active" : "Loading", icon: Cpu, color: wasmReady ? "text-purple-400" : "text-muted-foreground" },
  ];

  const formatSocialUrl = (type: string, value?: string) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (type === "twitter") return `https://x.com/${value.replace(/^@/, "")}`;
    if (type === "telegram") return `https://t.me/${value.replace(/^@/, "")}`;
    if (type === "github") return `https://github.com/${value.replace(/^@/, "")}`;
    if (type === "linkedin") return `https://linkedin.com/in/${value.replace(/^@/, "")}`;
    return `https://${value}`;
  };

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      {/* ── Trader Profile Banner Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-card p-4 sm:p-5 relative overflow-hidden bg-gradient-to-r from-card/80 via-card/50 to-primary/5 border border-border/60"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar with click to edit */}
            <div className="relative group cursor-pointer shrink-0" onClick={() => setProfileOpen(true)}>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-primary/40 bg-muted/60 overflow-hidden flex items-center justify-center shadow-md">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName || "User Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-black text-primary uppercase">
                    {profile.fullName ? profile.fullName.slice(0, 2) : "MW"}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-4 h-4" />
              </div>
            </div>

            {/* User Meta */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold truncate tracking-tight">
                  {profile.fullName || "Guest Trader"}
                </h3>
                {profile.username && (
                  <span className="text-xs text-muted-foreground font-medium">
                    @{profile.username}
                  </span>
                )}
                {user ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <UserCheck className="w-2.5 h-2.5" />
                    Supabase Synced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Guest Mode
                  </span>
                )}
              </div>

              {profile.bio && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-xl">
                  {profile.bio}
                </p>
              )}

              {/* Social Links */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {profile.socials?.twitter && (
                  <a
                    href={formatSocialUrl("twitter", profile.socials.twitter)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-sky-400 bg-muted/40 hover:bg-sky-500/10 border border-border/40 px-2 py-0.5 rounded-lg transition-colors"
                  >
                    <XTwitterIcon className="w-3 h-3 text-sky-400" />
                    <span>Twitter/X</span>
                  </a>
                )}
                {profile.socials?.telegram && (
                  <a
                    href={formatSocialUrl("telegram", profile.socials.telegram)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-blue-400 bg-muted/40 hover:bg-blue-500/10 border border-border/40 px-2 py-0.5 rounded-lg transition-colors"
                  >
                    <Send className="w-3 h-3 text-blue-400" />
                    <span>Telegram</span>
                  </a>
                )}
                {profile.socials?.github && (
                  <a
                    href={formatSocialUrl("github", profile.socials.github)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-purple-400 bg-muted/40 hover:bg-purple-500/10 border border-border/40 px-2 py-0.5 rounded-lg transition-colors"
                  >
                    <GitHubIcon className="w-3 h-3 text-purple-400" />
                    <span>GitHub</span>
                  </a>
                )}
                {profile.socials?.linkedin && (
                  <a
                    href={formatSocialUrl("linkedin", profile.socials.linkedin)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-blue-500 bg-muted/40 hover:bg-blue-500/10 border border-border/40 px-2 py-0.5 rounded-lg transition-colors"
                  >
                    <LinkedInIcon className="w-3 h-3 text-blue-500" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {profile.socials?.website && (
                  <a
                    href={formatSocialUrl("website", profile.socials.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-emerald-400 bg-muted/40 hover:bg-emerald-500/10 border border-border/40 px-2 py-0.5 rounded-lg transition-colors"
                  >
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>Portfolio</span>
                  </a>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>


          {/* Quick Action */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="ios-button flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Symbol
            </button>
          </div>
        </div>
      </motion.div>


      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="ios-card p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Left Column: Watchlist Table */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="ios-card overflow-hidden"
          >
            <WatchlistTable
              items={watchlistItems}
              onRemove={removeItem}
              isLoading={(isLoading || watchlistLoading) && !prices}
            />
          </motion.div>
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-6">
          <MarketSentiment items={watchlistItems} />
          <TopMovers items={watchlistItems} />
          <RecentNews />
        </div>
      </div>

      {/* Add Symbol Dialog */}
      <AddSymbolDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addItem}
        existingSymbols={items.map((i) => i.symbol)}
      />

      {/* Edit Profile & Socials Dialog */}
      <EditProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        onSave={updateProfile}
        isGuest={!user}
      />
    </div>
  );
}

