import { NextRequest, NextResponse } from "next/server";

const BINGX_BASE = "https://open-api.bingx.com/openApi/swap/v2/quote";

interface BingxContract {
  displayName: string;
  symbol: string;
}

interface BingxTicker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
  closeTime: number;
}

function toDisplayName(symbol: string): string {
  const clean = symbol.toUpperCase().replace(/(\.P|\.PERP|_PERP|\.PERPETUAL)$/i, "");
  const quoteIndex = clean.lastIndexOf("USDT");
  return quoteIndex > 0 ? `${clean.slice(0, quoteIndex)}-USDT` : clean;
}

export async function GET(req: NextRequest) {
  const rawSymbols = new URL(req.url).searchParams.get("symbols")?.split(",").map((symbol) => symbol.trim()).filter(Boolean) ?? [];
  if (!rawSymbols.length) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  try {
    const contractsResponse = await fetch(`${BINGX_BASE}/contracts`, { next: { revalidate: 300 } });
    if (!contractsResponse.ok) throw new Error(`BingX contracts: ${contractsResponse.status}`);

    const contractsPayload = await contractsResponse.json() as { data?: BingxContract[] };
    const contracts = contractsPayload.data ?? [];

    const results = await Promise.allSettled(rawSymbols.map(async (rawSymbol) => {
      const requested = rawSymbol.toUpperCase();
      const displayName = toDisplayName(requested);
      const contract = contracts.find((item) => item.symbol === requested || item.displayName === displayName);
      if (!contract) throw new Error(`No BingX contract for ${requested}`);

      const tickerResponse = await fetch(
        `${BINGX_BASE}/ticker?symbol=${encodeURIComponent(contract.symbol)}`,
        { next: { revalidate: 5 } }
      );
      if (!tickerResponse.ok) throw new Error(`BingX ticker: ${tickerResponse.status}`);

      const tickerPayload = await tickerResponse.json() as { code?: number; data?: BingxTicker };
      const ticker = tickerPayload.data;
      if (tickerPayload.code !== 0 || !ticker) throw new Error(`No BingX ticker for ${requested}`);

      return {
        symbol: requested,
        source: "bingx" as const,
        price: Number(ticker.lastPrice),
        change: Number(ticker.priceChange),
        changePercent: Number(ticker.priceChangePercent),
        volume: Number(ticker.volume),
        high24h: Number(ticker.highPrice),
        low24h: Number(ticker.lowPrice),
        updatedAt: ticker.closeTime || Date.now(),
      };
    }));

    return NextResponse.json(results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
  } catch (error) {
    console.error("[BingX API]", error);
    return NextResponse.json({ error: "Failed to fetch from BingX" }, { status: 502 });
  }
}
