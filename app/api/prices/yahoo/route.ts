// app/api/prices/yahoo/route.ts
import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// Instantiate YahooFinance v4 client
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Direct fetch fallback if library call fails
async function fetchYahooFallback(symbol: string) {
  try {
    const sym = symbol.toUpperCase();
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        next: { revalidate: 15 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    return {
      symbol: sym,
      source: "yahoo",
      price,
      change,
      changePercent,
      volume: meta.regularMarketVolume ?? 0,
      marketCap: undefined,
      high24h: meta.regularMarketDayHigh ?? undefined,
      low24h: meta.regularMarketDayLow ?? undefined,
      sparkline: [],
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols")?.split(",") ?? [];

  if (!symbols.length) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const cleanSymbol = symbol.trim().toUpperCase();
        try {
          // Try yahoo-finance2 library first
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const quote = await (yf.quote as any)(cleanSymbol);

          if (!quote || quote.regularMarketPrice === undefined) {
            const fallback = await fetchYahooFallback(cleanSymbol);
            if (fallback) return fallback;
          }

          // Sparkline optional fetch
          let sparkline: number[] = [];
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hist = await (yf.chart as any)(cleanSymbol, {
              period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
              period2: new Date(),
              interval: "1h",
            });
            sparkline = ((hist?.quotes ?? []) as Array<{ close?: number }>)
              .slice(-24)
              .map((q) => q.close ?? 0)
              .filter(Boolean);
          } catch {
            // Ignore sparkline errors
          }

          return {
            symbol: quote.symbol ?? cleanSymbol,
            source: "yahoo",
            price: quote.regularMarketPrice ?? 0,
            change: quote.regularMarketChange ?? 0,
            changePercent: quote.regularMarketChangePercent ?? 0,
            volume: quote.regularMarketVolume ?? 0,
            marketCap: quote.marketCap ?? undefined,
            high24h: quote.regularMarketDayHigh ?? undefined,
            low24h: quote.regularMarketDayLow ?? undefined,
            sparkline,
            updatedAt: Date.now(),
          };
        } catch {
          // If library throws, use direct API fallback
          const fallback = await fetchYahooFallback(cleanSymbol);
          if (fallback) return fallback;

          // Return dummy/zero structure if all fail so UI doesn't freeze in Loading
          return {
            symbol: cleanSymbol,
            source: "yahoo",
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            updatedAt: Date.now(),
          };
        }
      })
    );

    return NextResponse.json(results.filter(Boolean));
  } catch (err) {
    console.error("[Yahoo Finance API Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch from Yahoo Finance" },
      { status: 500 }
    );
  }
}
