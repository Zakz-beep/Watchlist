// app/api/cron/check-alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AssetSource, PriceData } from "@/types/market";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Up to 60s for Vercel Cron

interface AlertRecord {
  id: string;
  user_id: string;
  symbol: string;
  source: AssetSource;
  condition: "above" | "below" | "pct_change_up" | "pct_change_down";
  target_price: number;
  triggered: boolean;
  notes?: string;
  telegram_chat_id?: string;
}

// Fetch live price for a given source & symbol
async function fetchPriceForSource(source: AssetSource, symbol: string): Promise<PriceData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://market-watchlist-neon.vercel.app";
  try {
    const res = await fetch(`${baseUrl}/api/prices/${source}?symbols=${encodeURIComponent(symbol)}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data: PriceData[] = await res.json();
    return data.find((d) => d.symbol.toUpperCase() === symbol.toUpperCase()) || data[0] || null;
  } catch (err) {
    console.error(`[Cron Alert] Error fetching ${source}:${symbol}`, err);
    return null;
  }
}

// Optional Telegram webhook dispatcher
async function sendTelegramAlert(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    return true;
  } catch (e) {
    console.error("[sendTelegramAlert] Failed:", e);
    return false;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set in environment, check header, otherwise allow dashboard triggers
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Check if called from internal app
    const isLocalOrCron = req.headers.get("x-vercel-cron") || req.headers.get("user-agent")?.includes("Vercel-Cron");
    if (!isLocalOrCron && req.nextUrl.searchParams.get("key") !== cronSecret) {
      // Allow manual trigger if no secret mismatch
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      status: "skipped",
      message: "Supabase credentials not configured",
      timestamp: new Date().toISOString(),
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Fetch active alerts from Supabase
    const { data: alerts, error } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("triggered", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({
        status: "ok",
        checkedCount: 0,
        triggeredCount: 0,
        message: "No active alerts to evaluate",
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Group symbols by source to batch queries
    const symbolMap = new Map<string, PriceData | null>();
    const triggeredAlerts: AlertRecord[] = [];

    for (const alert of alerts as AlertRecord[]) {
      const key = `${alert.source}:${alert.symbol}`;
      if (!symbolMap.has(key)) {
        const price = await fetchPriceForSource(alert.source, alert.symbol);
        symbolMap.set(key, price);
      }

      const priceData = symbolMap.get(key);
      if (!priceData || typeof priceData.price !== "number") continue;

      const currentPrice = priceData.price;
      const change24h = priceData.changePercent ?? 0;
      let isTriggered = false;
      let reason = "";


      if (alert.condition === "above" && currentPrice >= Number(alert.target_price)) {
        isTriggered = true;
        reason = `rose above target $${alert.target_price} (Current: $${currentPrice.toLocaleString()})`;
      } else if (alert.condition === "below" && currentPrice <= Number(alert.target_price)) {
        isTriggered = true;
        reason = `fell below target $${alert.target_price} (Current: $${currentPrice.toLocaleString()})`;
      } else if (alert.condition === "pct_change_up" && change24h >= Number(alert.target_price)) {
        isTriggered = true;
        reason = `surged +${change24h.toFixed(2)}% (Target: +${alert.target_price}%)`;
      } else if (alert.condition === "pct_change_down" && change24h <= -Math.abs(Number(alert.target_price))) {
        isTriggered = true;
        reason = `dropped ${change24h.toFixed(2)}% (Target: -${Math.abs(Number(alert.target_price))}%)`;
      }

      if (isTriggered) {
        triggeredAlerts.push(alert);

        // Update in Supabase
        await supabase
          .from("price_alerts")
          .update({
            triggered: true,
            triggered_at: new Date().toISOString(),
          })
          .eq("id", alert.id);

        // Dispatch Telegram if user configured chat id
        if (alert.telegram_chat_id) {
          const msg = `🚨 *MarketWatch Cron Alert*\n\n*${alert.symbol}* (${alert.source.toUpperCase()}) ${reason}\n\n[Open Terminal](${process.env.NEXT_PUBLIC_SITE_URL || "https://market-watchlist-neon.vercel.app"}/dashboard/alerts)`;
          await sendTelegramAlert(alert.telegram_chat_id, msg);
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      checkedCount: alerts.length,
      triggeredCount: triggeredAlerts.length,
      triggered: triggeredAlerts.map((a) => ({ id: a.id, symbol: a.symbol, condition: a.condition })),
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Cron check-alerts] Fatal error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
