"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellRing, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { cn, formatPrice } from "@/lib/utils";
import type { AssetSource, PriceAlert, PriceData, WatchlistItem } from "@/types/market";

interface NativeAlertBridge {
  notify: (title: string, message: string) => void;
}

interface AlertRow {
  id: string;
  user_id: string;
  symbol: string;
  source: AssetSource;
  condition: "above" | "below";
  target_price: number | string;
  triggered: boolean;
  created_at: string;
}

async function fetchPrices(items: Omit<WatchlistItem, "priceData">[]): Promise<PriceData[]> {
  const sources: AssetSource[] = ["hyperliquid", "yahoo", "binance", "okx", "bingx"];
  const requests = sources
    .map((source) => ({ source, symbols: items.filter((item) => item.source === source).map((item) => item.symbol) }))
    .filter(({ symbols }) => symbols.length > 0)
    .map(async ({ source, symbols }) => {
      const response = await fetch(`/api/prices/${source}?symbols=${encodeURIComponent(symbols.join(","))}`);
      if (!response.ok) throw new Error(`Could not load ${source} prices`);
      return response.json() as Promise<PriceData[]>;
    });

  const responses = await Promise.allSettled(requests);
  return responses.flatMap((response) => response.status === "fulfilled" ? response.value : []);
}

function toPriceAlert(row: AlertRow): PriceAlert {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    source: row.source,
    condition: row.condition,
    targetPrice: Number(row.target_price),
    triggered: row.triggered,
    createdAt: row.created_at,
  };
}

function sendNotification(title: string, message: string) {
  const nativeBridge = (window as unknown as { MarketWatchAndroid?: NativeAlertBridge }).MarketWatchAndroid;
  if (nativeBridge) nativeBridge.notify(title, message);
  else window.alert(`${title}\n${message}`);
}

export default function AlertsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { items, user, loading: watchlistLoading } = useWatchlist();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const firingAlertIds = useRef(new Set<string>());

  const { data: prices = [], isLoading: pricesLoading } = useQuery({
    queryKey: ["alert-prices", items.map((item) => `${item.source}:${item.symbol}`).join(",")],
    queryFn: () => fetchPrices(items),
    enabled: items.length > 0,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!items.length) return;
    if (!selectedSymbol || !items.some((item) => item.symbol === selectedSymbol)) {
      setSelectedSymbol(items[0].symbol);
    }
  }, [items, selectedSymbol]);

  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem("marketwatch_guest_alerts");
      if (saved) {
        try {
          setAlerts(JSON.parse(saved) as PriceAlert[]);
        } catch {
          setAlerts([]);
        }
      }
      return;
    }

    let active = true;
    void supabase
      .from("price_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMessage("Alerts table is not ready yet. Apply the included Supabase migration once.");
          return;
        }
        setAlerts(((data ?? []) as AlertRow[]).map(toPriceAlert));
      });

    return () => { active = false; };
  }, [supabase, user]);

  useEffect(() => {
    const alert = alerts.find((candidate) => {
      if (candidate.triggered || firingAlertIds.current.has(candidate.id)) return false;
      const price = prices.find((item) => item.symbol === candidate.symbol && item.source === candidate.source)?.price;
      return price !== undefined && (candidate.condition === "above" ? price >= candidate.targetPrice : price <= candidate.targetPrice);
    });
    if (!alert) return;

    const livePrice = prices.find((item) => item.symbol === alert.symbol && item.source === alert.source)?.price;
    if (livePrice === undefined) return;
    firingAlertIds.current.add(alert.id);

    const timer = window.setTimeout(() => {
      const direction = alert.condition === "above" ? "rose above" : "fell below";
      sendNotification("MarketWatch alert", `${alert.symbol} ${direction} ${formatPrice(alert.targetPrice)}. Now ${formatPrice(livePrice)}.`);
      setAlerts((current) => current.map((item) => item.id === alert.id ? { ...item, triggered: true } : item));
      if (user) void supabase.from("price_alerts").update({ triggered: true }).eq("id", alert.id);
      else {
        const updated = alerts.map((item) => item.id === alert.id ? { ...item, triggered: true } : item);
        localStorage.setItem("marketwatch_guest_alerts", JSON.stringify(updated));
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [alerts, prices, supabase, user]);

  const selectedItem = items.find((item) => item.symbol === selectedSymbol);
  const selectedLivePrice = prices.find((item) => item.symbol === selectedSymbol && item.source === selectedItem?.source)?.price;

  const addAlert = async () => {
    const parsedTarget = Number(targetPrice);
    if (!selectedItem || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setMessage("Choose an asset and enter a valid target price.");
      return;
    }

    setSaving(true);
    setMessage("");
    const optimistic: PriceAlert = {
      id: `local-${Date.now()}`,
      userId: user?.id ?? "guest",
      symbol: selectedItem.symbol,
      source: selectedItem.source,
      condition,
      targetPrice: parsedTarget,
      triggered: false,
      createdAt: new Date().toISOString(),
    };

    if (!user) {
      const next = [optimistic, ...alerts];
      setAlerts(next);
      localStorage.setItem("marketwatch_guest_alerts", JSON.stringify(next));
      setTargetPrice("");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("price_alerts")
      .insert({
        user_id: user.id,
        symbol: selectedItem.symbol,
        source: selectedItem.source,
        condition,
        target_price: parsedTarget,
      })
      .select("*")
      .single();

    if (error || !data) {
      setMessage(error?.message ?? "Could not save the alert.");
    } else {
      setAlerts((current) => [toPriceAlert(data as AlertRow), ...current]);
      setTargetPrice("");
    }
    setSaving(false);
  };

  const removeAlert = async (alert: PriceAlert) => {
    setAlerts((current) => current.filter((item) => item.id !== alert.id));
    if (user) await supabase.from("price_alerts").delete().eq("id", alert.id);
    else localStorage.setItem("marketwatch_guest_alerts", JSON.stringify(alerts.filter((item) => item.id !== alert.id)));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="ios-card overflow-hidden p-5 sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-2xl bg-primary/12 p-3 text-primary"><BellRing className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Price alerts</h2>
            <p className="mt-1 text-sm text-muted-foreground">We check your selected market every 15 seconds while the app is open.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_130px_1fr_auto]">
          <label className="relative">
            <span className="sr-only">Asset</span>
            <select value={selectedSymbol} onChange={(event) => setSelectedSymbol(event.target.value)} disabled={watchlistLoading || !items.length} className="w-full appearance-none rounded-2xl border border-border/60 bg-background/60 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30">
              {items.map((item) => <option key={`${item.source}-${item.symbol}`} value={item.symbol}>{item.symbol} · {item.source}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
          </label>
          <select value={condition} onChange={(event) => setCondition(event.target.value as "above" | "below")} className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
            <option value="above">Crosses above</option>
            <option value="below">Crosses below</option>
          </select>
          <input inputMode="decimal" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} placeholder={selectedLivePrice ? `Now ${formatPrice(selectedLivePrice)}` : "Target price"} className="min-w-0 rounded-2xl border border-border/60 bg-background/60 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <button onClick={addAlert} disabled={saving || !items.length} className="ios-button flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </button>
        </div>
        {selectedLivePrice !== undefined && <p className="mt-3 text-xs text-muted-foreground">Current {selectedItem?.symbol}: <span className="font-semibold text-foreground">{formatPrice(selectedLivePrice)}</span></p>}
        {message && <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-300">{message}</p>}
      </section>

      <section className="ios-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <h3 className="font-bold">Your alerts</h3>
          <span className="text-xs text-muted-foreground">{pricesLoading ? "Updating…" : `${alerts.filter((alert) => !alert.triggered).length} active`}</span>
        </div>
        {alerts.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No alerts yet. Add one above to be notified when its price crosses your target.</div>
        ) : (
          <div className="divide-y divide-border/40">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-3 px-5 py-4">
                <div className={cn("h-2.5 w-2.5 rounded-full", alert.triggered ? "bg-muted-foreground/40" : "bg-emerald-400")} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{alert.symbol} <span className="font-normal text-muted-foreground">{alert.condition === "above" ? "above" : "below"} {formatPrice(alert.targetPrice)}</span></p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alert.source} · {alert.triggered ? "Triggered" : "Active"}</p>
                </div>
                <button onClick={() => removeAlert(alert)} className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" title="Delete alert"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
