import { NextRequest, NextResponse } from "next/server";
import { normalizeHyperliquidMarket } from "@/lib/hyperliquid-market";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

interface HyperliquidOrderBookLevel {
  px: string;
  sz: string;
  n: number;
}

interface HyperliquidOrderBook {
  coin: string;
  time: number;
  levels: [HyperliquidOrderBookLevel[], HyperliquidOrderBookLevel[]];
}

export async function GET(request: NextRequest) {
  const rawSymbol = new URL(request.url).searchParams.get("symbol");
  const symbol = rawSymbol ? normalizeHyperliquidMarket(rawSymbol) : undefined;
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "l2Book", coin: symbol, nSigFigs: 5 }),
      next: { revalidate: 2 },
    });
    if (!response.ok) throw new Error(`Hyperliquid returned ${response.status}`);

    const book = await response.json() as HyperliquidOrderBook;
    return NextResponse.json({
      symbol: book.coin,
      updatedAt: book.time,
      bids: book.levels[0].map((level) => ({ price: Number(level.px), size: Number(level.sz), orders: level.n })),
      asks: book.levels[1].map((level) => ({ price: Number(level.px), size: Number(level.sz), orders: level.n })),
    });
  } catch (error) {
    console.error("[Hyperliquid orderbook]", error);
    return NextResponse.json({ error: "Failed to fetch Hyperliquid order book" }, { status: 502 });
  }
}
