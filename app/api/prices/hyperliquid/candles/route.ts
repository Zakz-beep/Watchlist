import { NextRequest, NextResponse } from "next/server";
import { normalizeHyperliquidMarket } from "@/lib/hyperliquid-market";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const SUPPORTED_INTERVALS = new Set(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "8h", "12h", "1d", "3d", "1w", "1M"]);

interface HyperliquidCandle {
  t: number;
  T: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}

function intervalToMilliseconds(interval: string): number {
  const unit = interval.at(-1);
  const quantity = Number(interval.slice(0, -1));
  if (unit === "m") return quantity * 60_000;
  if (unit === "h") return quantity * 3_600_000;
  if (unit === "d") return quantity * 86_400_000;
  if (unit === "w") return quantity * 604_800_000;
  return 2_592_000_000;
}

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const rawSymbol = searchParams.get("symbol");
  const symbol = rawSymbol ? normalizeHyperliquidMarket(rawSymbol) : undefined;
  const interval = searchParams.get("interval") ?? "15m";

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  if (!SUPPORTED_INTERVALS.has(interval)) return NextResponse.json({ error: "unsupported interval" }, { status: 400 });

  const endTime = Date.now();
  const startTime = endTime - intervalToMilliseconds(interval) * 300;

  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: { coin: symbol, interval, startTime, endTime },
      }),
      next: { revalidate: 5 },
    });
    if (!response.ok) throw new Error(`Hyperliquid returned ${response.status}`);

    const candles = await response.json() as HyperliquidCandle[];
    return NextResponse.json(candles.map((candle) => ({
      time: Math.floor(candle.t / 1000),
      closeTime: candle.T,
      open: Number(candle.o),
      high: Number(candle.h),
      low: Number(candle.l),
      close: Number(candle.c),
      volume: Number(candle.v),
    })));
  } catch (error) {
    console.error("[Hyperliquid candles]", error);
    return NextResponse.json({ error: "Failed to fetch Hyperliquid candles" }, { status: 502 });
  }
}
