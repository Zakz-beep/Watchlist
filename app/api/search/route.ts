import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import type { AssetType, SearchResult } from "@/types/market";
import { getActiveHyperliquidMarkets, normalizePerpetualQuery } from "@/lib/hyperliquid-catalog";
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function mapQuoteType(quoteType?: string): AssetType {
  switch (quoteType?.toUpperCase()) {
    case "EQUITY": return "stock";
    case "ETF": return "etf";
    case "INDEX": return "index";
    case "CURRENCY":
    case "FUTURE": return "forex";
    default: return "stock";
  }
}

async function searchHyperliquid(query: string): Promise<SearchResult[]> {
  const normalizedQuery = normalizePerpetualQuery(query);
  const markets = await getActiveHyperliquidMarkets();
  return markets
    .filter((asset) => asset.symbol.toUpperCase().includes(normalizedQuery) || asset.name.toUpperCase().includes(normalizedQuery))
    .slice(0, 10)
}

export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json([]);

  try {
    const results = await searchHyperliquid(query);

    // Yahoo remains the source for equities, ETFs, forex, and indexes. Hyperliquid
    // is deliberately the only search source for crypto perpetuals.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchResult = await (yf.search as any)(query, { quotesCount: 8, newsCount: 0 });
      if (Array.isArray(searchResult?.quotes)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        searchResult.quotes.forEach((quote: any) => {
          if (!quote.symbol || quote.quoteType?.toUpperCase() === "CRYPTOCURRENCY") return;
          if (results.some((result) => result.symbol === quote.symbol)) return;
          results.push({
            symbol: quote.symbol,
            name: quote.longname || quote.shortname || quote.symbol,
            exchange: quote.exchDisp || quote.exchange || "US",
            assetType: mapQuoteType(quote.quoteType),
            source: "yahoo",
          });
        });
      }
    } catch {
      // A Hyperliquid result is still usable when Yahoo search is unavailable.
    }

    const normalizedQuery = normalizePerpetualQuery(query);
    const looksLikePerpetual = /USDT|USDC|\.P|\.PERP|_PERP/i.test(query);
    if (looksLikePerpetual && !results.some((result) => result.symbol === normalizedQuery)) {
      results.unshift({
        symbol: normalizedQuery,
        name: `${normalizedQuery} Perpetual`,
        exchange: "Hyperliquid Perpetual",
        assetType: "crypto",
        source: "hyperliquid",
      });
    }

    return NextResponse.json(results.slice(0, 15));
  } catch (error) {
    console.error("[Search API Error]", error);
    return NextResponse.json([]);
  }
}
