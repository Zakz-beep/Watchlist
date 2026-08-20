import { NextRequest, NextResponse } from "next/server";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

interface HyperliquidUniverseAsset {
  name: string;
  isDelisted?: boolean;
}

interface HyperliquidMeta {
  universe: HyperliquidUniverseAsset[];
}

interface HyperliquidAssetContext {
  markPx?: string;
  midPx?: string | null;
  prevDayPx?: string;
  dayNtlVlm?: string;
}

type MetaAndContextsResponse = [HyperliquidMeta, HyperliquidAssetContext[]];

const HYPERLIQUID_SYMBOL_ALIASES: Record<string, string> = {
  PEPE: "KPEPE",
  SHIB: "KSHIB",
  BONK: "KBONK",
  FLOKI: "KFLOKI",
  LUNC: "KLUNC",
};

function normalizeHyperliquidSymbol(symbol: string): string {
  const clean = symbol
    .trim()
    .toUpperCase()
    .replace(/(USDT|USDC)(\.P|\.PERP|_PERP|\.PERPETUAL)?$/, "")
    .replace(/(\.P|\.PERP|_PERP|\.PERPETUAL)$/, "");
  return HYPERLIQUID_SYMBOL_ALIASES[clean] ?? clean;
}

function formatResponseSymbol(symbol: string): string {
  const [dex, ...marketParts] = symbol.trim().split(":");
  if (!marketParts.length) return symbol.trim().toUpperCase();
  return `${dex.toLowerCase()}:${marketParts.join(":").toUpperCase()}`;
}

async function getMarketContexts(dex?: string): Promise<MetaAndContextsResponse> {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dex ? { type: "metaAndAssetCtxs", dex } : { type: "metaAndAssetCtxs" }),
    next: { revalidate: 5 },
  });
  if (!response.ok) throw new Error(`Hyperliquid returned ${response.status}`);

  const payload = await response.json() as MetaAndContextsResponse;
  if (!payload[0]?.universe || !Array.isArray(payload[1])) {
    throw new Error("Unexpected Hyperliquid response");
  }
  return payload;
}

export async function GET(request: NextRequest) {
  const rawSymbols = new URL(request.url).searchParams.get("symbols")
    ?.split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean) ?? [];

  if (!rawSymbols.length) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  try {
    // `metaAndAssetCtxs` without a dex only covers Hyperliquid's main venue.
    // Builder DEX markets (for example xyz:SMH) require their `dex` field.
    const builderDexes = [...new Set(rawSymbols
      .map((symbol) => {
        const separator = symbol.indexOf(":");
        return separator > 0 ? symbol.slice(0, separator).toLowerCase() : null;
      })
      .filter((dex): dex is string => Boolean(dex)))];
    const marketPayloads = await Promise.all([getMarketContexts(), ...builderDexes.map((dex) => getMarketContexts(dex))]);
    const assetMap = new Map<string, { asset: HyperliquidUniverseAsset; context: HyperliquidAssetContext | undefined }>();
    for (const [meta, contexts] of marketPayloads) {
      meta.universe.forEach((asset, index) => assetMap.set(asset.name.toUpperCase(), { asset, context: contexts[index] }));
    }
    const results = rawSymbols.flatMap((rawSymbol) => {
      const requestedSymbol = rawSymbol.toUpperCase();
      const responseSymbol = formatResponseSymbol(rawSymbol);
      const assetData = assetMap.get(normalizeHyperliquidSymbol(requestedSymbol));
      const price = Number(assetData?.context?.markPx ?? assetData?.context?.midPx);
      const previousPrice = Number(assetData?.context?.prevDayPx);
      if (!assetData || assetData.asset.isDelisted || !Number.isFinite(price) || price <= 0) return [];

      const change = Number.isFinite(previousPrice) ? price - previousPrice : 0;
      return [{
        symbol: responseSymbol,
        source: "hyperliquid" as const,
        price,
        change,
        changePercent: previousPrice > 0 ? (change / previousPrice) * 100 : 0,
        volume: Number(assetData.context?.dayNtlVlm ?? 0),
        updatedAt: Date.now(),
      }];
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Hyperliquid API]", error);
    return NextResponse.json({ error: "Failed to fetch from Hyperliquid" }, { status: 502 });
  }
}
