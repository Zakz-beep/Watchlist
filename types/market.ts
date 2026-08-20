// types/market.ts

export type AssetSource = "yahoo" | "binance" | "okx" | "bingx" | "hyperliquid";
export type AssetType = "stock" | "crypto" | "forex" | "index" | "etf" | "commodity";

export interface Asset {
  symbol: string;
  name: string;
  source: AssetSource;
  assetType: AssetType;
}

export interface PriceData {
  symbol: string;
  source: AssetSource;
  price: number;
  change: number;       // absolute change
  changePercent: number; // % change
  volume: number;
  marketCap?: number;
  high24h?: number;
  low24h?: number;
  sparkline?: number[]; // last N closing prices for mini chart
  updatedAt: number;    // Unix ms timestamp
}

export interface WatchlistItem extends Asset {
  id: string;
  watchlistId: string;
  notes?: string;
  alertPrice?: number;
  addedAt: string;
  priceData?: PriceData;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: WatchlistItem[];
}

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  source: AssetSource;
  condition: "above" | "below";
  targetPrice: number;
  triggered: boolean;
  createdAt: string;
}

// Ticker bar item (landing page)
export interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  source: AssetSource;
}

// Search result when adding new symbol
export interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  assetType: AssetType;
  source: AssetSource;
  price?: number;
}

// WASM indicator result
export interface IndicatorResult {
  ma14?: number[];
  ma50?: number[];
  rsi14?: number[];
  normalized?: number[];
}

export interface SocialLinks {
  twitter?: string;
  github?: string;
  telegram?: string;
  linkedin?: string;
  website?: string;
  youtube?: string;
  discord?: string;
}

export interface UserProfile {
  fullName?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  socials?: SocialLinks;
  hyperliquidAddress?: string;
}

export interface HyperliquidPosition {
  coin: string;
  szi: number; // positive = long, negative = short
  entryPx: number;
  positionValue: number;
  unrealizedPnl: number;
  returnOnEquity: number;
  liquidationPx: number | null;
  leverage: {
    type: "cross" | "isolated";
    value: number;
  };
  marginUsed: number;
  maxLeverage: number;
}

export interface HyperliquidSpotBalance {
  coin: string;
  total: number;
  hold: number;
  entryNtl: number;
}

export interface HyperliquidTradeFill {
  time: number;
  coin: string;
  side: "B" | "A";
  dir: string;
  sz: number;
  px: number;
  closedPnl: number;
  fee: number;
  feeToken: string;
  hash: string;
  oid: number;
  tid: number;
  crossed: boolean;
}

export interface PortfolioRiskMetrics {
  winRate: number; // %
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  grossProfit: number;
  grossLoss: number;
  netRealizedPnl: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  avgWin: number;
  avgLoss: number;
  payoffRatio: number;
  expectancy: number;
}

export interface HyperliquidAccountSummary {
  user: string;
  accountValue: number;
  totalMarginUsed: number;
  totalRawUsd: number;
  withdrawable: number;
  crossMarginSummary: {
    accountValue: number;
    totalMarginUsed: number;
    totalNtlPos: number;
    totalRawUsd: number;
  };
  positions: HyperliquidPosition[];
  spotBalances: HyperliquidSpotBalance[];
  fills: HyperliquidTradeFill[];
  riskMetrics: PortfolioRiskMetrics;
  updatedAt: number;
}



