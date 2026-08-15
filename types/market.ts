// types/market.ts

export type AssetSource = "yahoo" | "binance" | "okx";
export type AssetType = "stock" | "crypto" | "forex" | "index" | "etf";

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
