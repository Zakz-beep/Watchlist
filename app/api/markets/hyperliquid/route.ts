import { NextRequest, NextResponse } from "next/server";
import { getActiveHyperliquidMarkets, normalizePerpetualQuery } from "@/lib/hyperliquid-catalog";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = normalizePerpetualQuery(searchParams.get("q")?.trim() ?? "");
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "60", 10) || 60;
  const limit = Math.min(Math.max(requestedLimit, 1), 100);

  try {
    const allMarkets = await getActiveHyperliquidMarkets();
    const markets = query
      ? allMarkets.filter((market) => market.symbol.toUpperCase().includes(query) || market.name.toUpperCase().includes(query))
      : allMarkets;
    const page = markets.slice(offset, offset + limit);

    return NextResponse.json({
      markets: page,
      total: markets.length,
      nextOffset: offset + page.length < markets.length ? offset + page.length : null,
    });
  } catch (error) {
    console.error("[Hyperliquid market catalog]", error);
    return NextResponse.json({ markets: [], total: 0, nextOffset: null }, { status: 502 });
  }
}
