// app/api/prices/binance/route.ts
import { NextRequest, NextResponse } from "next/server";

// Binance recommends the market-data-only host for public price requests. Keep
// the main API as a fallback because availability can vary by Vercel region.
const BINANCE_SPOT_BASES = [
  "https://data-api.binance.vision/api/v3",
  "https://api.binance.com/api/v3",
  "https://api1.binance.com/api/v3",
];
const BINANCE_FUTURES_BASE = "https://fapi.binance.com/fapi/v1";

interface TickerResult {
  symbol: string;
  source: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  updatedAt: number;
}

async function fetchSpotTickerBatch(symbols: string[]) {
  const symbolsJson = JSON.stringify(symbols);
  const query = `ticker/24hr?symbols=${encodeURIComponent(symbolsJson)}`;
  const failures: string[] = [];

  for (const baseUrl of BINANCE_SPOT_BASES) {
    try {
      const response = await fetch(`${baseUrl}/${query}`, {
        next: { revalidate: 5 },
      });

      if (response.ok) return response.json();
      failures.push(`${new URL(baseUrl).hostname}: ${response.status}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "network error";
      failures.push(`${new URL(baseUrl).hostname}: ${detail}`);
    }
  }

  throw new Error(`All Binance spot endpoints failed (${failures.join(", ")})`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbols = searchParams.get("symbols")?.split(",") ?? [];

  if (!rawSymbols.length) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  try {
    const results: TickerResult[] = [];

    // Separate perpetual futures (.P / .PERP / _PERP) vs spot
    const futuresSyms: { raw: string; clean: string }[] = [];
    const spotSyms: { raw: string; clean: string }[] = [];

    rawSymbols.forEach((s) => {
      const upper = s.trim().toUpperCase();
      if (upper.match(/(\.P|\.PERP|_PERP|\.PERPETUAL)$/i)) {
        const clean = upper.replace(/(\.P|\.PERP|_PERP|\.PERPETUAL)$/i, "");
        futuresSyms.push({ raw: upper, clean });
      } else {
        spotSyms.push({ raw: upper, clean: upper });
      }
    });

    // 1. Fetch Binance Spot symbols in batch if any
    if (spotSyms.length > 0) {
      try {
        const data = await fetchSpotTickerBatch(spotSyms.map((symbol) => symbol.clean));
        if (Array.isArray(data)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.forEach((item: any) => {
            results.push({
              symbol: item.symbol,
              source: "binance",
              price: parseFloat(item.lastPrice),
              change: parseFloat(item.priceChange),
              changePercent: parseFloat(item.priceChangePercent),
              volume: parseFloat(item.volume),
              high24h: parseFloat(item.highPrice),
              low24h: parseFloat(item.lowPrice),
              updatedAt: item.closeTime || Date.now(),
            });
          });
        }
      } catch (e) {
        console.warn("[Binance Spot Fetch Error]", e);
      }
    }

    // 2. Fetch Binance Futures symbols (Perpetuals)
    if (futuresSyms.length > 0) {
      await Promise.all(
        futuresSyms.map(async (item) => {
          try {
            const res = await fetch(
              `${BINANCE_FUTURES_BASE}/ticker/24hr?symbol=${encodeURIComponent(item.clean)}`,
              { next: { revalidate: 5 } }
            );

            if (res.ok) {
              const d = await res.json();
              results.push({
                symbol: item.raw, // Preserve original symbol name e.g. BTCUSDT.P
                source: "binance",
                price: parseFloat(d.lastPrice),
                change: parseFloat(d.priceChange),
                changePercent: parseFloat(d.priceChangePercent),
                volume: parseFloat(d.volume),
                high24h: parseFloat(d.highPrice),
                low24h: parseFloat(d.lowPrice),
                updatedAt: d.closeTime || Date.now(),
              });
            }
          } catch (e) {
            console.warn(`[Binance Futures Fetch Error] ${item.raw}:`, e);
          }
        })
      );
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("[Binance API Error]", err);
    return NextResponse.json({ error: "Failed to fetch from Binance" }, { status: 500 });
  }
}
