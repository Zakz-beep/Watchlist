// app/dashboard/alerts/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellRing,
  ChevronDown,
  Loader2,
  Plus,
  Trash2,
  Volume2,
  Smartphone,
  Send,
  Check,
  RefreshCw,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useUser } from "@/lib/hooks/useUser";
import { cn, formatPrice } from "@/lib/utils";
import {
  playAlertChime,
  requestNotificationPermission,
  sendBrowserNotification,
  triggerHaptic,
} from "@/lib/utils/notifications";
import type { AssetSource, PriceAlert, PriceData, WatchlistItem } from "@/types/market";

interface AlertRow {
  id: string;
  user_id: string;
  symbol: string;
  source: AssetSource;
  condition: "above" | "below" | "pct_change_up" | "pct_change_down";
  target_price: number | string;
  triggered: boolean;
  triggered_at?: string;
  created_at: string;
  telegram_chat_id?: string;
  notes?: string;
}

async function fetchPrices(items: Omit<WatchlistItem, "priceData">[]): Promise<PriceData[]> {
  const sources: AssetSource[] = ["hyperliquid", "binance", "yahoo", "okx", "bingx"];
  const requests = sources
    .map((source) => ({ source, symbols: items.filter((item) => item.source === source).map((item) => item.symbol) }))
    .filter(({ symbols }) => symbols.length > 0)
    .map(async ({ source, symbols }) => {
      const response = await fetch(`/api/prices/${source}?symbols=${encodeURIComponent(symbols.join(","))}`);
      if (!response.ok) return [];
      return (await response.json()) as PriceData[];
    });

  const responses = await Promise.allSettled(requests);
  return responses.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

function toPriceAlert(row: AlertRow): PriceAlert {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    source: row.source,
    condition: row.condition || "above",
    targetPrice: Number(row.target_price),
    triggered: row.triggered,
    triggeredAt: row.triggered_at,
    createdAt: row.created_at,
    telegramChatId: row.telegram_chat_id,
    notes: row.notes,
  };
}

export default function AlertsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { items, user, loading: watchlistLoading } = useWatchlist();
  const { profile } = useUser();

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [condition, setCondition] = useState<"above" | "below" | "pct_change_up" | "pct_change_down">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>("default");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "history" | "cron">("active");
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  const firingAlertIds = useRef(new Set<string>());

  // Sync notification permission state
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  // Fetch live prices for market monitoring
  const { data: prices = [], isLoading: pricesLoading, refetch: refetchPrices } = useQuery({
    queryKey: ["alert-prices", items.map((item) => `${item.source}:${item.symbol}`).join(",")],
    queryFn: () => fetchPrices(items),
    enabled: items.length > 0,
    refetchInterval: 12_000,
  });

  useEffect(() => {
    if (!items.length) return;
    if (!selectedSymbol || !items.some((item) => item.symbol === selectedSymbol)) {
      setSelectedSymbol(items[0].symbol);
    }
  }, [items, selectedSymbol]);

  // Load Alerts from Supabase or LocalStorage
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
          setMessage("Alerts table syncing with local state.");
          return;
        }
        setAlerts(((data ?? []) as AlertRow[]).map(toPriceAlert));
      });

    return () => {
      active = false;
    };
  }, [supabase, user]);

  // Real-time client-side price evaluation
  useEffect(() => {
    const alert = alerts.find((candidate) => {
      if (candidate.triggered || firingAlertIds.current.has(candidate.id)) return false;
      const priceData = prices.find((item) => item.symbol.toUpperCase() === candidate.symbol.toUpperCase());
      if (!priceData || typeof priceData.price !== "number") return false;

      const currentPrice = priceData.price;
      const change24h = priceData.changePercent ?? 0;

      if (candidate.condition === "above") return currentPrice >= candidate.targetPrice;
      if (candidate.condition === "below") return currentPrice <= candidate.targetPrice;
      if (candidate.condition === "pct_change_up") return change24h >= candidate.targetPrice;
      if (candidate.condition === "pct_change_down") return change24h <= -Math.abs(candidate.targetPrice);
      return false;
    });

    if (!alert) return;

    const priceData = prices.find((item) => item.symbol.toUpperCase() === alert.symbol.toUpperCase());
    if (!priceData) return;

    firingAlertIds.current.add(alert.id);

    const timer = window.setTimeout(() => {
      let desc = "";
      if (alert.condition === "above") desc = `rose above $${alert.targetPrice} (Now: $${priceData.price.toLocaleString()})`;
      else if (alert.condition === "below") desc = `fell below $${alert.targetPrice} (Now: $${priceData.price.toLocaleString()})`;
      else if (alert.condition === "pct_change_up") desc = `surged +${priceData.changePercent?.toFixed(2)}% (Target: +${alert.targetPrice}%)`;
      else desc = `dropped ${priceData.changePercent?.toFixed(2)}% (Target: -${Math.abs(alert.targetPrice)}%)`;


      // Trigger multi-platform notifications
      sendBrowserNotification(`🚨 Price Alert: ${alert.symbol}`, {
        body: `${alert.symbol} ${desc}`,
        playSound: true,
        vibrate: true,
      });

      setAlerts((current) =>
        current.map((item) =>
          item.id === alert.id ? { ...item, triggered: true, triggeredAt: new Date().toISOString() } : item
        )
      );

      if (user) {
        void supabase.from("price_alerts").update({ triggered: true, triggered_at: new Date().toISOString() }).eq("id", alert.id);
      } else {
        const updated = alerts.map((item) =>
          item.id === alert.id ? { ...item, triggered: true, triggeredAt: new Date().toISOString() } : item
        );
        localStorage.setItem("marketwatch_guest_alerts", JSON.stringify(updated));
      }
    }, 50);

    return () => window.clearTimeout(timer);
  }, [alerts, prices, supabase, user]);

  const selectedItem = items.find((item) => item.symbol === selectedSymbol);
  const selectedLivePrice = prices.find(
    (item) => item.symbol.toUpperCase() === selectedSymbol.toUpperCase()
  )?.price;

  // Request browser notification permission
  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationStatus(perm);
    if (perm === "granted") {
      playAlertChime("success");
      triggerHaptic();
      sendBrowserNotification("Notifications Enabled", {
        body: "You will receive real-time price & cron alerts on this device.",
        playSound: false,
      });
    }
  };

  // Add Alert
  const addAlert = async () => {
    const parsedTarget = Number(targetPrice);
    if (!selectedItem || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setMessage("Please select an asset and enter a valid positive target price/percentage.");
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
      telegramChatId: telegramChatId.trim() || undefined,
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
        telegram_chat_id: telegramChatId.trim() || null,
      })
      .select("*")
      .single();

    if (error || !data) {
      const next = [optimistic, ...alerts];
      setAlerts(next);
      localStorage.setItem("marketwatch_guest_alerts", JSON.stringify(next));
      setMessage("Saved locally to your device.");
    } else {
      setAlerts((current) => [toPriceAlert(data as AlertRow), ...current]);
    }
    setTargetPrice("");
    setSaving(false);
  };

  // Remove Alert
  const removeAlert = async (alert: PriceAlert) => {
    setAlerts((current) => current.filter((item) => item.id !== alert.id));
    if (user) {
      await supabase.from("price_alerts").delete().eq("id", alert.id);
    } else {
      localStorage.setItem(
        "marketwatch_guest_alerts",
        JSON.stringify(alerts.filter((item) => item.id !== alert.id))
      );
    }
  };

  // Re-arm Triggered Alert
  const rearmAlert = async (alert: PriceAlert) => {
    firingAlertIds.current.delete(alert.id);
    setAlerts((current) =>
      current.map((item) => (item.id === alert.id ? { ...item, triggered: false, triggeredAt: undefined } : item))
    );
    if (user) {
      await supabase.from("price_alerts").update({ triggered: false, triggered_at: null }).eq("id", alert.id);
    } else {
      const updated = alerts.map((item) =>
        item.id === alert.id ? { ...item, triggered: false, triggeredAt: undefined } : item
      );
      localStorage.setItem("marketwatch_guest_alerts", JSON.stringify(updated));
    }
  };

  // Trigger Cron Job Check Manually
  const triggerManualCron = async () => {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch("/api/cron/check-alerts");
      const data = await res.json();
      setCronResult(`Checked ${data.checkedCount || 0} alerts. Triggered: ${data.triggeredCount || 0}`);
      refetchPrices();
    } catch (e: any) {
      setCronResult(`Cron check failed: ${e.message}`);
    } finally {
      setCronRunning(false);
    }
  };

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* ── Top Header & Background Cron Status Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-card p-4 sm:p-5 border border-border/50 bg-card/70"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/30 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base tracking-tight">Market Cron Alerts</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Vercel Cron (1m)
                </span>
                <span className="text-[10px] font-medium bg-muted text-muted-foreground border border-border/40 px-2 py-0.5 rounded-full">
                  {activeAlerts.length} Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automated 24/7 background triggers across Web Push, Sound, and Telegram
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={triggerManualCron}
              disabled={cronRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/50 bg-muted/40 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3 h-3", cronRunning && "animate-spin text-primary")} />
              <span>Test Cron</span>
            </button>
            <button
              onClick={() => playAlertChime("warning")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/50 bg-card hover:bg-muted/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
              title="Test Web Audio synthesizer chime"
            >
              <Volume2 className="w-3 h-3 text-primary" />
              <span>Chime</span>
            </button>
          </div>
        </div>

        {/* Multi-Device Setup Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3.5">
          {/* Notification Permission Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Device Web Push</div>
                <div className="text-[10px] text-muted-foreground">
                  {notificationStatus === "granted"
                    ? "Active (Push & Haptic enabled)"
                    : "Not allowed or pending permission"}
                </div>
              </div>
            </div>

            {notificationStatus !== "granted" ? (
              <button
                onClick={handleEnableNotifications}
                className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold hover:opacity-90 transition-all shrink-0"
              >
                Enable
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <Check className="w-3 h-3" /> Enabled
              </span>
            )}
          </div>

          {/* Telegram Alerts Setup */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
              <Send className="w-4 h-4 text-blue-400 shrink-0" />
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Telegram Chat ID (optional)"
                className="w-full bg-transparent text-xs font-mono placeholder:text-muted-foreground/60 outline-none"
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium shrink-0">
              24/7 Phone Sync
            </span>
          </div>
        </div>

        {cronResult && (
          <div className="mt-3 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{cronResult}</span>
          </div>
        )}
      </motion.div>

      {/* ── Create New Alert Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="ios-card p-4 sm:p-5 border border-border/50 space-y-3.5"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <h4 className="font-bold text-xs sm:text-sm tracking-tight">Configure New Alert Trigger</h4>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-medium">Presets:</span>
            {selectedLivePrice && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setCondition("above");
                    setTargetPrice((selectedLivePrice * 1.05).toFixed(selectedLivePrice > 10 ? 2 : 4));
                  }}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-muted/40 hover:bg-muted border border-border/30 text-muted-foreground hover:text-foreground transition-colors"
                >
                  +5% Breakout
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCondition("below");
                    setTargetPrice((selectedLivePrice * 0.95).toFixed(selectedLivePrice > 10 ? 2 : 4));
                  }}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-muted/40 hover:bg-muted border border-border/30 text-muted-foreground hover:text-foreground transition-colors"
                >
                  -5% Dip
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-[1.2fr_1.1fr_1fr_auto]">
          {/* Asset Picker */}
          <div className="relative">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              disabled={watchlistLoading || !items.length}
              className="w-full appearance-none rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary/40"
            >
              {items.map((item) => (
                <option key={`${item.source}-${item.symbol}`} value={item.symbol}>
                  {item.symbol} · {item.source.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Condition Picker */}
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as any)}
            className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-primary/40 font-medium"
          >
            <option value="above">Price Crosses Above ($)</option>
            <option value="below">Price Crosses Below ($)</option>
            <option value="pct_change_up">24h Surge &ge; +X%</option>
            <option value="pct_change_down">24h Drop &le; -X%</option>
          </select>

          {/* Target Price / Percent */}
          <input
            inputMode="decimal"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder={
              condition.startsWith("pct")
                ? "Target % (e.g. 5)"
                : selectedLivePrice
                ? `Now $${selectedLivePrice.toLocaleString()}`
                : "Target Price ($)"
            }
            className="min-w-0 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-xs font-mono outline-none focus:ring-1 focus:ring-primary/40"
          />

          {/* Add Button */}
          <button
            onClick={addAlert}
            disabled={saving || !items.length}
            className="ios-button flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            <span>Set Alert</span>
          </button>
        </div>

        {selectedLivePrice !== undefined && (
          <p className="text-[11px] text-muted-foreground">
            Current {selectedItem?.symbol}: <span className="font-bold text-foreground font-mono">${selectedLivePrice.toLocaleString()}</span>
          </p>
        )}
        {message && <p className="text-xs font-medium text-amber-500">{message}</p>}
      </motion.section>

      {/* ── Tabs for Active vs History ── */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveTab("active")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all",
            activeTab === "active"
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Active Alerts ({activeAlerts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all",
            activeTab === "history"
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Triggered History ({triggeredAlerts.length})</span>
        </button>
      </div>

      {/* ── Alert List ── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="ios-card overflow-hidden border border-border/50"
      >
        {activeTab === "active" ? (
          activeAlerts.length === 0 ? (
            <div className="p-10 text-center space-y-1.5">
              <p className="text-xs text-muted-foreground">No active alerts configured right now.</p>
              <p className="text-[11px] text-muted-foreground/70">
                Choose an asset above to set a real-time price or volatility alert.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {activeAlerts.map((alert) => {
                const livePrice = prices.find(
                  (p) => p.symbol.toUpperCase() === alert.symbol.toUpperCase()
                )?.price;
                const distancePct =
                  livePrice && alert.targetPrice
                    ? (((alert.targetPrice - livePrice) / livePrice) * 100).toFixed(1)
                    : null;

                return (
                  <div key={alert.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{alert.symbol}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono px-1.5 py-0.5 rounded bg-muted/40 border border-border/30">
                            {alert.source}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Trigger when price {alert.condition === "above" ? "rose above" : alert.condition === "below" ? "fell below" : alert.condition === "pct_change_up" ? "surged +" : "dropped -"}{" "}
                          <span className="font-bold font-mono text-foreground">
                            {alert.condition.startsWith("pct") ? `${alert.targetPrice}%` : `$${alert.targetPrice.toLocaleString()}`}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {distancePct && !alert.condition.startsWith("pct") && (
                        <span className="text-[11px] font-mono font-medium text-muted-foreground hidden sm:inline-block">
                          {Number(distancePct) > 0 ? `+${distancePct}%` : `${distancePct}%`} away
                        </span>
                      )}
                      <button
                        onClick={() => removeAlert(alert)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors"
                        title="Delete alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          triggeredAlerts.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No triggered alert history recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {triggeredAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-muted-foreground">{alert.symbol}</span>
                        <span className="text-[10px] font-semibold text-gain bg-gain/10 px-1.5 py-0.2 rounded">
                          Triggered
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Target: {alert.condition} {formatPrice(alert.targetPrice)}
                        {alert.triggeredAt && ` · ${new Date(alert.triggeredAt).toLocaleTimeString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => rearmAlert(alert)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/40 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Re-arm</span>
                    </button>
                    <button
                      onClick={() => removeAlert(alert)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </motion.section>
    </div>
  );
}
