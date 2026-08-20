import type { AssetType, SearchResult } from "@/types/market";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

interface HyperliquidAsset {
  name: string;
  isDelisted?: boolean;
}

interface HyperliquidMetadata {
  universe: HyperliquidAsset[];
}

const COMMODITY_MARKETS = new Set(["GOLD", "SILVER", "OIL", "BRENTOIL", "COPPER", "PALLADIUM", "PLATINUM", "GAS"]);
const INDEX_MARKETS = new Set(["USA500", "USA100", "USA30", "GER40", "JPN225", "UK100", "CHN50", "EU50"]);

const DISPLAY_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", HYPE: "Hyperliquid", XRP: "XRP",
  DOGE: "Dogecoin", AVAX: "Avalanche", BNB: "BNB", LINK: "Chainlink", SUI: "Sui",
  APT: "Aptos", ARB: "Arbitrum", OP: "Optimism", WIF: "dogwifhat", TIA: "Celestia", INJ: "Injective",
};

export function normalizePerpetualQuery(query: string): string {
  return query
    .toUpperCase()
    .replace(/(USDT|USDC)(\.P|\.PERP|_PERP|\.PERPETUAL)?$/, "")
    .replace(/(\.P|\.PERP|_PERP|\.PERPETUAL)$/, "");
}

export function getHyperliquidAssetType(symbol: string): AssetType {
  const base = symbol.split(":").at(-1)?.toUpperCase() ?? symbol.toUpperCase();
  if (COMMODITY_MARKETS.has(base)) return "commodity";
  if (INDEX_MARKETS.has(base)) return "index";
  // Builder DEX markets such as xyz:TSLA are tokenized TradFi perpetuals.
  if (symbol.includes(":")) return "stock";
  return "crypto";
}

export function toHyperliquidSearchResult(symbol: string): SearchResult {
  const base = symbol.split(":").at(-1) ?? symbol;
  const dex = symbol.split(":")[0];
  return {
    symbol,
    name: `${DISPLAY_NAMES[base] ?? base} Perpetual`,
    exchange: symbol.includes(":") ? `Hyperliquid ${dex.toUpperCase()} Perpetual` : "Hyperliquid Perpetual",
    assetType: getHyperliquidAssetType(symbol),
    source: "hyperliquid",
  };
}

/** Returns every currently active perp market, including builder DEX markets. */
export async function getActiveHyperliquidMarkets(): Promise<SearchResult[]> {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "allPerpMetas" }),
    next: { revalidate: 60 },
  });
  if (!response.ok) throw new Error(`Hyperliquid metadata request failed: ${response.status}`);

  const payload = await response.json() as HyperliquidMetadata[];
  const symbols = new Set<string>();
  for (const metadata of payload) {
    for (const asset of metadata.universe ?? []) {
      if (!asset.isDelisted && asset.name) symbols.add(asset.name);
    }
  }

  return [...symbols]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map(toHyperliquidSearchResult);
}
