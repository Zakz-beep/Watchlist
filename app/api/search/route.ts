// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import type { SearchResult, AssetType } from "@/types/market";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface CryptoPreset {
  base: string;
  name: string;
  spot: string;
  perp: string;
  okxSwap: string;
}

const CRYPTO_PRESETS: CryptoPreset[] = [
  { base: "BTC",  name: "Bitcoin",       spot: "BTCUSDT",  perp: "BTCUSDT.P",  okxSwap: "BTC-USDT-SWAP" },
  { base: "ETH",  name: "Ethereum",      spot: "ETHUSDT",  perp: "ETHUSDT.P",  okxSwap: "ETH-USDT-SWAP" },
  { base: "SOL",  name: "Solana",        spot: "SOLUSDT",  perp: "SOLUSDT.P",  okxSwap: "SOL-USDT-SWAP" },
  { base: "BNB",  name: "BNB",           spot: "BNBUSDT",  perp: "BNBUSDT.P",  okxSwap: "BNB-USDT-SWAP" },
  { base: "XRP",  name: "Ripple",        spot: "XRPUSDT",  perp: "XRPUSDT.P",  okxSwap: "XRP-USDT-SWAP" },
  { base: "DOGE", name: "Dogecoin",      spot: "DOGEUSDT", perp: "DOGEUSDT.P", okxSwap: "DOGE-USDT-SWAP" },
  { base: "AVAX", name: "Avalanche",     spot: "AVAXUSDT", perp: "AVAXUSDT.P", okxSwap: "AVAX-USDT-SWAP" },
  { base: "LINK", name: "Chainlink",     spot: "LINKUSDT", perp: "LINKUSDT.P", okxSwap: "LINK-USDT-SWAP" },
  { base: "PEPE", name: "Pepe",          spot: "PEPEUSDT", perp: "1000PEPEUSDT.P", okxSwap: "PEPE-USDT-SWAP" },
  { symbol: "SUIUSDT", base: "SUI", name: "Sui", spot: "SUIUSDT", perp: "SUIUSDT.P", okxSwap: "SUI-USDT-SWAP" } as unknown as CryptoPreset,
  { symbol: "APTUSDT", base: "APT", name: "Aptos", spot: "APTUSDT", perp: "APTUSDT.P", okxSwap: "APT-USDT-SWAP" } as unknown as CryptoPreset,
  { symbol: "ARBUSDT", base: "ARB", name: "Arbitrum", spot: "ARBUSDT", perp: "ARBUSDT.P", okxSwap: "ARB-USDT-SWAP" } as unknown as CryptoPreset,
  { symbol: "OPUSDT",  base: "OP",  name: "Optimism", spot: "OPUSDT",  perp: "OPUSDT.P",  okxSwap: "OP-USDT-SWAP" } as unknown as CryptoPreset,
  { symbol: "WIFUSDT", base: "WIF", name: "dogwifhat", spot: "WIFUSDT", perp: "WIFUSDT.P", okxSwap: "WIF-USDT-SWAP" } as unknown as CryptoPreset,
  { symbol: "TIAUSDT", base: "TIA", name: "Celestia", spot: "TIAUSDT", perp: "TIAUSDT.P", okxSwap: "TIA-USDT-SWAP" } as unknown as CryptoPreset,
  { symbol: "INJUSDT", base: "INJ", name: "Injective", spot: "INJUSDT", perp: "INJUSDT.P", okxSwap: "INJ-USDT-SWAP" } as unknown as CryptoPreset,
];

function mapQuoteType(quoteType?: string): AssetType {
  switch (quoteType?.toUpperCase()) {
    case "CRYPTOCURRENCY": return "crypto";
    case "EQUITY":          return "stock";
    case "ETF":             return "etf";
    case "INDEX":           return "index";
    case "CURRENCY":        return "forex";
    case "FUTURE":          return "forex";
    default:                return "stock";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const results: SearchResult[] = [];
    const qUpper = q.toUpperCase();

    // 1. Check Crypto Spot & Perpetual Futures Matches
    CRYPTO_PRESETS.forEach((item) => {
      const isMatch =
        item.base?.toUpperCase().includes(qUpper) ||
        item.spot?.toUpperCase().includes(qUpper) ||
        item.perp?.toUpperCase().includes(qUpper) ||
        item.okxSwap?.toUpperCase().includes(qUpper) ||
        item.name?.toUpperCase().includes(qUpper) ||
        qUpper.includes("PERP") ||
        qUpper.includes("FUTURES");

      if (isMatch) {
        // Binance Spot
        results.push({
          symbol: item.spot,
          name: `${item.name} (Spot)`,
          assetType: "crypto",
          source: "binance",
          exchange: "Binance Spot",
        });

        // Binance Perpetual Futures (.P)
        results.push({
          symbol: item.perp,
          name: `${item.name} Perpetual`,
          assetType: "crypto",
          source: "binance",
          exchange: "Binance USDT-M Futures",
        });

        // OKX Perpetual Swap
        results.push({
          symbol: item.okxSwap,
          name: `${item.name} Perpetual Swap`,
          assetType: "crypto",
          source: "okx",
          exchange: "OKX Swap",
        });
      }
    });

    // 2. Search Yahoo Finance (Stocks, ETFs, Indices, Crypto)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (yf.search as any)(q, { quotesCount: 8, newsCount: 0 });
      if (res?.quotes && Array.isArray(res.quotes)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.quotes.forEach((item: any) => {
          if (!item.symbol) return;
          if (results.some((r) => r.symbol === item.symbol)) return;

          results.push({
            symbol: item.symbol,
            name: item.longname || item.shortname || item.symbol,
            exchange: item.exchDisp || item.exchange || "US",
            assetType: mapQuoteType(item.quoteType),
            source: item.quoteType === "CRYPTOCURRENCY" ? "binance" : "yahoo",
          });
        });
      }
    } catch {
      // Ignore yf search error
    }

    // 3. Dynamic Perpetual handling if user types something like `XYZUSDT.P` or `XYZUSDT.PERP`
    if (qUpper.match(/(\.P|\.PERP|_PERP)$/i) && !results.some((r) => r.symbol === qUpper)) {
      results.unshift({
        symbol: qUpper,
        name: `${qUpper.replace(/(\.P|\.PERP|_PERP)$/i, "")} USDT Perpetual`,
        assetType: "crypto",
        source: "binance",
        exchange: "Binance Futures",
      });
    } else if (!results.some((r) => r.symbol.toUpperCase() === qUpper)) {
      results.unshift({
        symbol: qUpper,
        name: `${qUpper} Asset`,
        assetType: qUpper.endsWith("USDT") ? "crypto" : "stock",
        source: qUpper.endsWith("USDT") ? "binance" : "yahoo",
        exchange: "Direct Symbol",
      });
    }

    return NextResponse.json(results.slice(0, 15));
  } catch (err) {
    console.error("[Search API Error]", err);
    return NextResponse.json([]);
  }
}
