import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const MAX_EXPIRIES = 8;

function cleanTicker(value: string | null) {
  return value?.trim().toUpperCase().replace(/[^A-Z0-9.^-]/g, "") ?? "";
}

export async function GET(request: NextRequest) {
  const ticker = cleanTicker(new URL(request.url).searchParams.get("ticker"));
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  try {
    const initial = await yf.options(ticker);
    const expiries = initial.expirationDates.slice(0, MAX_EXPIRIES);
    const chains = await Promise.all(expiries.map(async (expiry) => {
      const chain = await yf.options(ticker, { date: expiry });
      const option = chain.options[0];
      return {
        expiry: expiry.toISOString(),
        calls: (option?.calls ?? []).map((contract) => ({ strike: contract.strike, openInterest: contract.openInterest ?? 0, impliedVolatility: contract.impliedVolatility, volume: contract.volume ?? 0 })),
        puts: (option?.puts ?? []).map((contract) => ({ strike: contract.strike, openInterest: contract.openInterest ?? 0, impliedVolatility: contract.impliedVolatility, volume: contract.volume ?? 0 })),
      };
    }));
    const spot = initial.quote.regularMarketPrice;
    if (!spot || spot <= 0) throw new Error("Underlying spot unavailable");

    return NextResponse.json({ ticker, spot, currency: initial.quote.currency ?? "USD", fetchedAt: new Date().toISOString(), expiries: chains }, {
      headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[Options GEX]", error);
    return NextResponse.json({ error: "Yahoo options chain is unavailable for this ticker" }, { status: 502 });
  }
}
