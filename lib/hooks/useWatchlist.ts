// lib/hooks/useWatchlist.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WatchlistItem, SearchResult } from "@/types/market";
import type { User } from "@supabase/supabase-js";

const DEMO_ITEMS: Omit<WatchlistItem, "priceData">[] = [
  { id: "1", watchlistId: "demo", symbol: "BTCUSDT", name: "Bitcoin", source: "binance", assetType: "crypto", addedAt: new Date().toISOString() },
  { id: "2", watchlistId: "demo", symbol: "ETHUSDT", name: "Ethereum", source: "binance", assetType: "crypto", addedAt: new Date().toISOString() },
  { id: "3", watchlistId: "demo", symbol: "AAPL", name: "Apple Inc.", source: "yahoo", assetType: "stock", addedAt: new Date().toISOString() },
  { id: "4", watchlistId: "demo", symbol: "NVDA", name: "NVIDIA", source: "yahoo", assetType: "stock", addedAt: new Date().toISOString() },
  { id: "5", watchlistId: "demo", symbol: "^GSPC", name: "S&P 500", source: "yahoo", assetType: "index", addedAt: new Date().toISOString() },
];

export function useWatchlist() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
  const [items, setItems] = useState<Omit<WatchlistItem, "priceData">[]>(DEMO_ITEMS);
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
            .select("id")
            .eq("user_id", currentUser.id)
            .limit(1);

          let activeWlId: string;

          if (wlError || !watchlists || watchlists.length === 0) {
            // Create default watchlist for user if missing
            const { data: newWl, error: createError } = await supabase
              .from("watchlists")
              .insert([{ user_id: currentUser.id, name: "My Watchlist" }])
              .select("id")
              .single();

            if (createError || !newWl) {
              console.warn("Could not create Supabase watchlist, falling back to local mode");
              setLoading(false);
              return;
            }
            activeWlId = newWl.id;

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
            activeWlId = watchlists[0].id;
          }

          setWatchlistId(activeWlId);

          // Fetch items for active watchlist
          const { data: dbItems } = await supabase
            .from("watchlist_items")
            .select("*")
            .eq("watchlist_id", activeWlId);

          if (dbItems && dbItems.length > 0) {
            const formatted: Omit<WatchlistItem, "priceData">[] = dbItems.map((row) => ({
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
          if (saved) {
            try {
              setItems(JSON.parse(saved));
            } catch {
              setItems(DEMO_ITEMS);
            }
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

  // Save guest items to localStorage
  useEffect(() => {
    if (!user && !loading) {
      localStorage.setItem("marketwatch_guest_items", JSON.stringify(items));
    }
  }, [items, user, loading]);

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
        }
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
      }
    },
    [user, watchlistId, supabase]
  );

  return {
    items,
    user,
    loading,
    addItem,
    removeItem,
  };
}
