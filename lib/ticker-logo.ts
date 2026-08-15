// lib/ticker-logo.ts
// Utility to get logo URLs for tickers from free public sources

export type LogoSource = "clearbit" | "financialmodelingprep" | "coingecko" | "fallback";

/**
 * Map of crypto symbols (Binance/OKX/Futures) to CoinGecko coin IDs
 */
const COINGECKO_ID_MAP: Record<string, string> = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  BNBUSDT: "binancecoin",
  SOLUSDT: "solana",
  ADAUSDT: "cardano",
  XRPUSDT: "ripple",
  DOGEUSDT: "dogecoin",
  DOTUSDT: "polkadot",
  AVAXUSDT: "avalanche-2",
  MATICUSDT: "matic-network",
  LINKUSDT: "chainlink",
  UNIUSDT: "uniswap",
  LTCUSDT: "litecoin",
  ATOMUSDT: "cosmos",
  NEARUSDT: "near",
  APTUSDT: "aptos",
  ARBUSDT: "arbitrum",
  OPUSDT: "optimism",
  SUIUSDT: "sui",
  SHIBUSDT: "shiba-inu",
  TRXUSDT: "tron",
  ETCUSDT: "ethereum-classic",
  FILUSDT: "filecoin",
  AAVEUSDT: "aave",
  MKRUSDT: "maker",
  PEPEUSDT: "pepe",
  WIFUSDT: "dogwifcoin",
  TIAUSDT: "celestia",
  INJUSDT: "injective-protocol",
  RNDRUSDT: "render-token",
  FETUSDT: "fetch-ai",
  SEIUSDT: "sei-network",
  ORDIUSDT: "ordi",
  FLOKIUSDT: "floki",
  BONKUSDT: "bonk",
  RENDERUSDT: "render-token",
  // OKX format
  "BTC-USDT": "bitcoin",
  "ETH-USDT": "ethereum",
  "SOL-USDT": "solana",
  "BNB-USDT": "binancecoin",
  "DOGE-USDT": "dogecoin",
  "XRP-USDT": "ripple",
};

/**
 * Map of Yahoo Finance symbols to domain names for Clearbit logo lookup
 */
const YAHOO_DOMAIN_MAP: Record<string, string> = {
  AAPL: "apple.com",
  MSFT: "microsoft.com",
  GOOGL: "google.com",
  GOOG: "google.com",
  AMZN: "amazon.com",
  NVDA: "nvidia.com",
  META: "meta.com",
  TSLA: "tesla.com",
  BRK: "berkshirehathaway.com",
  JPM: "jpmorganchase.com",
  V: "visa.com",
  JNJ: "jnj.com",
  WMT: "walmart.com",
  MA: "mastercard.com",
  PG: "pg.com",
  HD: "homedepot.com",
  UNH: "unitedhealthgroup.com",
  BAC: "bankofamerica.com",
  XOM: "exxonmobil.com",
  KO: "coca-cola.com",
  NFLX: "netflix.com",
  DIS: "thewaltdisneycompany.com",
  AMD: "amd.com",
  INTC: "intel.com",
  PYPL: "paypal.com",
  ADBE: "adobe.com",
  CRM: "salesforce.com",
  ORCL: "oracle.com",
  IBM: "ibm.com",
  CSCO: "cisco.com",
  VZ: "verizon.com",
  T: "att.com",
  PFE: "pfizer.com",
  ABBV: "abbvie.com",
  MRK: "merck.com",
  COST: "costco.com",
  SBUX: "starbucks.com",
  MCD: "mcdonalds.com",
  NKE: "nike.com",
  BABA: "alibaba.com",
  TSM: "tsmc.com",
  ASML: "asml.com",
  SAP: "sap.com",
  SHOP: "shopify.com",
  SNAP: "snap.com",
  TWTR: "twitter.com",
  UBER: "uber.com",
  LYFT: "lyft.com",
  ABNB: "airbnb.com",
  COIN: "coinbase.com",
  SQ: "block.xyz",
  HOOD: "robinhood.com",
  PLTR: "palantir.com",
  RBLX: "roblox.com",
  ZM: "zoom.us",
  SPOT: "spotify.com",
  PINS: "pinterest.com",
  BMRI: "bankmandiri.co.id",
  BBCA: "bca.co.id",
  BBRI: "bri.co.id",
  TLKM: "telkom.co.id",
  ASII: "astra.co.id",
};

export function getTickerLogo(symbol: string, assetType: string): string | null {
  const rawUpper = symbol.toUpperCase();
  // Strip perpetual suffixes for logo lookup (.P, .PERP, _PERP, -SWAP)
  const cleanUpper = rawUpper.replace(/\.P$|\.PERP$|_PERP$|-SWAP$/i, "");

  // Crypto: use CoinGecko image API
  const geckoId = COINGECKO_ID_MAP[cleanUpper] || COINGECKO_ID_MAP[rawUpper];
  if (geckoId) {
    return `https://assets.coingecko.com/coins/images/large/${geckoId}.png`;
  }

  // Stock/ETF: use Clearbit logo API via company domain
  const domain = YAHOO_DOMAIN_MAP[cleanUpper] || YAHOO_DOMAIN_MAP[rawUpper];
  if (domain) {
    return `https://logo.clearbit.com/${domain}`;
  }

  // Fallback: try Financial Modeling Prep logo (works for many tickers)
  if (assetType === "stock" || assetType === "etf") {
    const cleanSym = cleanUpper.replace(/\^/g, "").replace(/=F$/, "");
    if (cleanSym && !cleanSym.startsWith("^") && cleanSym.length <= 5) {
      return `https://financialmodelingprep.com/image-stock/${cleanSym}.png`;
    }
  }

  return null;
}

/**
 * Get a color for asset type badge
 */
export function getAssetTypeColor(assetType: string): string {
  switch (assetType) {
    case "crypto":  return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "stock":   return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "etf":     return "bg-green-500/15 text-green-400 border-green-500/30";
    case "index":   return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "forex":   return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    default:        return "bg-muted text-muted-foreground border-border/40";
  }
}

export function getSourceColor(source: string): string {
  switch (source) {
    case "binance": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "yahoo":   return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "okx":     return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    default:        return "bg-muted text-muted-foreground";
  }
}
