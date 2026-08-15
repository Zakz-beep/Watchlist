// app/api/prices/okx/route.ts
import { NextRequest, NextResponse } from "next/server";

const OKX_BASE = "https://www.okx.com/api/v5/market";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols")?.split(",") ?? [];

  if (!symbols.length) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  try {
    // Fetch tickers in parallel
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const res = await fetch(
          `${OKX_BASE}/ticker?instId=${symbol.toUpperCase()}`,
          { next: { revalidate: 5 } }
        );
        if (!res.ok) throw new Error(`OKX error for ${symbol}: ${res.status}`);
        const json = await res.json();
        const d = json.data?.[0];
        if (!d) throw new Error(`No data for ${symbol}`);

        const price = parseFloat(d.last);
        const open24h = parseFloat(d.open24h);
        const change = price - open24h;
        const changePercent = open24h !== 0 ? (change / open24h) * 100 : 0;

        return {
          symbol: d.instId,
          source: "okx",
          price,
          change,
          changePercent,
          volume: parseFloat(d.vol24h),
          high24h: parseFloat(d.high24h),
          low24h: parseFloat(d.low24h),
          updatedAt: parseInt(d.ts),
        };
      })
    );

    const formatted = results
      .filter((r) => r.status === "fulfilled")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r) => (r as any).value);

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("[OKX API]", err);
    return NextResponse.json({ error: "Failed to fetch from OKX" }, { status: 500 });
  }
}
