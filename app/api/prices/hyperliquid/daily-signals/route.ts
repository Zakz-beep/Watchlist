import { NextResponse } from "next/server";
import { normalizeHyperliquidMarket } from "@/lib/hyperliquid-market";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const MARKETS = ["BTC", "ETH", "SOL", "HYPE", "XRP", "DOGE", "xyz:TSLA", "xyz:NVDA", "xyz:GOLD", "xyz:BRENTOIL"];
const INTERVALS = ["4h", "1h", "15m"] as const;

interface HyperliquidCandle {
  t: number;
  o: string;
  c: string;
  v: string;
}

function intervalMilliseconds(interval: (typeof INTERVALS)[number]): number {
  if (interval === "15m") return 15 * 60_000;
  if (interval === "1h") return 60 * 60_000;
  return 4 * 60 * 60_000;
}

async function candles(symbol: string, interval: (typeof INTERVALS)[number]) {
  const endTime = Date.now();
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "candleSnapshot",
      req: { coin: symbol, interval, startTime: endTime - intervalMilliseconds(interval) * 170, endTime },
    }),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Hyperliquid ${response.status}`);
  const payload = await response.json() as HyperliquidCandle[];
  return payload.slice(0, -1).map((candle) => ({ time: candle.t, open: Number(candle.o), close: Number(candle.c), volume: Number(candle.v) }));
}

export async function GET() {
  const results = await Promise.allSettled(MARKETS.map(async (market) => {
    const symbol = normalizeHyperliquidMarket(market);
    const [fourHour, oneHour, fifteenMinute] = await Promise.all(INTERVALS.map((interval) => candles(symbol, interval)));
    return { symbol, fourHour, oneHour, fifteenMinute };
  }));

  return NextResponse.json({
    asOf: new Date().toISOString(),
    markets: results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []),
  }, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } });
}
