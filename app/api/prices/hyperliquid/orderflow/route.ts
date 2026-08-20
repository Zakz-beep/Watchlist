import { NextRequest, NextResponse } from "next/server";
import { normalizeHyperliquidMarket } from "@/lib/hyperliquid-market";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

interface HyperliquidTrade {
  coin: string;
  side: "A" | "B";
  px: string;
  sz: string;
  time: number;
  tid: number;
}

interface HyperliquidBookLevel {
  px: string;
  sz: string;
  n: number;
}

interface HyperliquidBook {
  coin: string;
  time: number;
  levels: [HyperliquidBookLevel[], HyperliquidBookLevel[]];
}

async function requestInfo<T>(payload: object): Promise<T> {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Hyperliquid returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function GET(request: NextRequest) {
  const rawSymbol = new URL(request.url).searchParams.get("symbol");
  const symbol = rawSymbol ? normalizeHyperliquidMarket(rawSymbol) : undefined;
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const [trades, book] = await Promise.all([
      requestInfo<HyperliquidTrade[]>({ type: "recentTrades", coin: symbol }),
      requestInfo<HyperliquidBook>({ type: "l2Book", coin: symbol, nSigFigs: 5 }),
    ]);

    return NextResponse.json({
      symbol: book.coin,
      updatedAt: book.time,
      trades: trades.slice(-120).reverse().map((trade) => ({
        id: `${trade.time}-${trade.tid}`,
        side: trade.side === "B" ? "buy" : "sell",
        price: Number(trade.px),
        size: Number(trade.sz),
        notional: Number(trade.px) * Number(trade.sz),
        time: trade.time,
      })),
      bids: book.levels[0].map((level) => ({ price: Number(level.px), size: Number(level.sz), orders: level.n })),
      asks: book.levels[1].map((level) => ({ price: Number(level.px), size: Number(level.sz), orders: level.n })),
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[Hyperliquid order flow]", error);
    return NextResponse.json({ error: "Failed to fetch Hyperliquid order flow" }, { status: 502 });
  }
}
