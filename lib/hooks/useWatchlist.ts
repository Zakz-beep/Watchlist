// lib/hooks/useWatchlist.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AssetSource, WatchlistItem, SearchResult } from "@/types/market";
import type { User } from "@supabase/supabase-js";

export interface WatchlistGroup {
  id: string;
  name: string;
  createdAt: string;
}

const DEMO_ITEMS: Omit<WatchlistItem, "priceData">[] = [
  { id: "1", watchlistId: "demo", symbol: "BTC", name: "Bitcoin Perpetual", source: "hyperliquid", assetType: "crypto", addedAt: new Date().toISOString() },
  { id: "2", watchlistId: "demo", symbol: "ETH", name: "Ethereum Perpetual", source: "hyperliquid", assetType: "crypto", addedAt: new Date().toISOString() },
  { id: "6", watchlistId: "demo", symbol: "HYPE", name: "Hyperliquid Perpetual", source: "hyperliquid", assetType: "crypto", addedAt: new Date().toISOString() },
  { id: "3", watchlistId: "demo", symbol: "AAPL", name: "Apple Inc.", source: "yahoo", assetType: "stock", addedAt: new Date().toISOString() },
  { id: "4", watchlistId: "demo", symbol: "NVDA", name: "NVIDIA", source: "yahoo", assetType: "stock", addedAt: new Date().toISOString() },
  { id: "5", watchlistId: "demo", symbol: "^GSPC", name: "S&P 500", source: "yahoo", assetType: "index", addedAt: new Date().toISOString() },
];

const HYPERLIQUID_ALIASES: Record<string, string> = {
  PEPE: "KPEPE",
  SHIB: "KSHIB",
  BONK: "KBONK",
  FLOKI: "KFLOKI",
};

function toHyperliquidSymbol(symbol: string): string {
  const normalized = symbol
    .toUpperCase()
    .replace(/(USDT|USDC)(\.P|\.PERP|_PERP|\.PERPETUAL)?$/, "")
    .replace(/(\.P|\.PERP|_PERP|\.PERPETUAL)$/, "");
  return HYPERLIQUID_ALIASES[normalized] ?? normalized;
}

function useHyperliquidForCrypto<T extends { symbol: string; source: AssetSource; assetType: string }>(item: T): T {
  if (item.assetType !== "crypto" || !["binance", "okx"].includes(item.source)) return item;
  return { ...item, source: "hyperliquid", symbol: toHyperliquidSymbol(item.symbol) };
}

export function useWatchlist() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
  const [watchlists, setWatchlists] = useState<WatchlistGroup[]>([]);
  const [items, setItems] = useState<Omit<WatchlistItem, "priceData">[]>(DEMO_ITEMS);
  const [guestItems, setGuestItems] = useState<Omit<WatchlistItem, "priceData">[]>(DEMO_ITEMS);
  const [loading, setLoading] = useState(true);

  // Check auth user and load watchlist
  useEffect(() => {
    let isMounted = true;

    async function loadUserAndWatchlist() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!isMounted) return;
        setUser(currentUser);

        if (currentUser) {
          // Fetch user's watchlist from Supabase
          const { data: watchlists, error: wlError } = await supabase
            .from("watchlists")
            .select("id, name, created_at")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: true });

          let activeWlId: string;

          if (wlError || !watchlists || watchlists.length === 0) {
            // Create default watchlist for user if missing
            const { data: newWl, error: createError } = await supabase
              .from("watchlists")
              .insert([{ user_id: currentUser.id, name: "My Watchlist" }])
              .select("id, name, created_at")
              .single();

            if (createError || !newWl) {
              console.warn("Could not create Supabase watchlist, falling back to local mode");
              setLoading(false);
              return;
            }
            activeWlId = newWl.id;
            setWatchlists([{ id: newWl.id, name: newWl.name, createdAt: newWl.created_at ?? new Date().toISOString() }]);

            // Seed default items
            const seedItems = DEMO_ITEMS.map((item) => ({
              watchlist_id: activeWlId,
              symbol: item.symbol,
              name: item.name,
              source: item.source,
              asset_type: item.assetType,
            }));
            await supabase.from("watchlist_items").insert(seedItems);
          } else {
            const groups = watchlists.map((watchlist) => ({
              id: watchlist.id,
              name: watchlist.name,
              createdAt: watchlist.created_at ?? new Date().toISOString(),
            }));
            const rememberedId = localStorage.getItem("marketwatch_active_watchlist");
            activeWlId = groups.some((watchlist) => watchlist.id === rememberedId) ? rememberedId! : groups[0].id;
            setWatchlists(groups);
          }

          setWatchlistId(activeWlId);
          localStorage.setItem("marketwatch_active_watchlist", activeWlId);

          // Fetch items for active watchlist
          const { data: dbItems } = await supabase
            .from("watchlist_items")
            .select("*")
            .eq("watchlist_id", activeWlId);

          if (dbItems) {
            const formatted: Omit<WatchlistItem, "priceData">[] = dbItems.map((row) => useHyperliquidForCrypto({
              id: row.id,
              watchlistId: row.watchlist_id,
              symbol: row.symbol,
              name: row.name ?? row.symbol,
              source: row.source,
              assetType: row.asset_type,
              addedAt: row.added_at ?? new Date().toISOString(),
            }));
            setItems(formatted);
          }
        } else {
          // Guest mode: load from localStorage if available
          const saved = localStorage.getItem("marketwatch_guest_items");
          const savedGroups = localStorage.getItem("marketwatch_guest_watchlists");
          let groupList: WatchlistGroup[] = [{ id: "demo", name: "My Watchlist", createdAt: new Date().toISOString() }];
          if (savedGroups) {
            try { groupList = JSON.parse(savedGroups) as WatchlistGroup[]; } catch { /* use default group */ }
          }
          setWatchlists(groupList);
          const rememberedId = localStorage.getItem("marketwatch_active_watchlist");
          const activeId = groupList.some((watchlist) => watchlist.id === rememberedId) ? rememberedId! : groupList[0].id;
          setWatchlistId(activeId);
          localStorage.setItem("marketwatch_active_watchlist", activeId);
          if (saved) {
            try {
              const savedItems = (JSON.parse(saved) as Omit<WatchlistItem, "priceData">[]).map(useHyperliquidForCrypto);
              setGuestItems(savedItems);
              setItems(savedItems.filter((item) => item.watchlistId === activeId));
            } catch {
              setGuestItems(DEMO_ITEMS);
              setItems(DEMO_ITEMS);
            }
          } else {
            setGuestItems(DEMO_ITEMS);
            setItems(DEMO_ITEMS);
          }
        }
      } catch (err) {
        console.warn("[useWatchlist] Error initializing:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserAndWatchlist();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save guest groups and their items to localStorage.
  useEffect(() => {
    if (!user && !loading) {
      localStorage.setItem("marketwatch_guest_watchlists", JSON.stringify(watchlists));
      localStorage.setItem("marketwatch_guest_items", JSON.stringify(guestItems));
    }
  }, [guestItems, watchlists, user, loading]);

  const selectWatchlist = useCallback(async (nextWatchlistId: string) => {
    if (!watchlists.some((watchlist) => watchlist.id === nextWatchlistId)) return;
    setWatchlistId(nextWatchlistId);
    localStorage.setItem("marketwatch_active_watchlist", nextWatchlistId);
    if (user) {
      const { data: dbItems, error } = await supabase.from("watchlist_items").select("*").eq("watchlist_id", nextWatchlistId);
      if (error) return;
      setItems((dbItems ?? []).map((row) => useHyperliquidForCrypto({
        id: row.id, watchlistId: row.watchlist_id, symbol: row.symbol, name: row.name ?? row.symbol,
        source: row.source, assetType: row.asset_type, addedAt: row.added_at ?? new Date().toISOString(),
      })));
    } else {
      setItems(guestItems.filter((item) => item.watchlistId === nextWatchlistId));
    }
  }, [guestItems, supabase, user, watchlists]);

  const createWatchlist = useCallback(async (rawName: string) => {
    const name = rawName.trim().slice(0, 48);
    if (!name || watchlists.some((watchlist) => watchlist.name.toLowerCase() === name.toLowerCase())) return false;
    try {
      let created: WatchlistGroup;
      if (user) {
        const { data, error } = await supabase.from("watchlists")
          .insert([{ user_id: user.id, name }]).select("id, name, created_at").single();
        if (error || !data) return false;
        created = { id: data.id, name: data.name, createdAt: data.created_at ?? new Date().toISOString() };
      } else {
        created = { id: `guest-${Date.now()}`, name, createdAt: new Date().toISOString() };
      }
      setWatchlists((current) => [...current, created]);
      setWatchlistId(created.id);
      setItems([]);
      localStorage.setItem("marketwatch_active_watchlist", created.id);
      return true;
    } catch {
      return false;
    }
  }, [supabase, user, watchlists]);

  const addItem = useCallback(
    async (result: SearchResult) => {
      const newItem: Omit<WatchlistItem, "priceData"> = {
        id: `${Date.now()}`,
        watchlistId: watchlistId ?? "demo",
        symbol: result.symbol,
        name: result.name,
        source: result.source,
        assetType: result.assetType,
        addedAt: new Date().toISOString(),
      };

      // Optimistic state update
      setItems((prev) => [...prev, newItem]);

      if (user && watchlistId) {
        // Persist to Supabase DB
        const { data, error } = await supabase
          .from("watchlist_items")
          .insert([
            {
              watchlist_id: watchlistId,
              symbol: result.symbol,
              name: result.name,
              source: result.source,
              asset_type: result.assetType,
            },
          ])
          .select("id")
          .single();

        if (!error && data) {
          // Update item ID with DB generated UUID
          setItems((prev) =>
            prev.map((item) => (item.id === newItem.id ? { ...item, id: data.id } : item))
          );
        } else {
          // The database enforces one symbol/source pair per group. Roll back
          // optimistic UI state if another tab added the same asset first.
          setItems((prev) => prev.filter((item) => item.id !== newItem.id));
          console.warn("[useWatchlist] Could not save asset:", error);
        }
      } else {
        setGuestItems((prev) => [...prev, newItem]);
      }
    },
    [user, watchlistId, supabase]
  );

  const removeItem = useCallback(
    async (id: string) => {
      // Optimistic update
      setItems((prev) => prev.filter((i) => i.id !== id));

      if (user && watchlistId) {
        // Remove from Supabase DB
        await supabase.from("watchlist_items").delete().eq("id", id);
      } else {
        setGuestItems((prev) => prev.filter((i) => i.id !== id));
      }
    },
    [user, watchlistId, supabase]
  );

  return {
    items,
    user,
    loading,
    watchlists,
    activeWatchlistId: watchlistId,
    activeWatchlist: watchlists.find((watchlist) => watchlist.id === watchlistId) ?? null,
    selectWatchlist,
    createWatchlist,
    addItem,
    removeItem,
  };
}
