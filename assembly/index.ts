// ============================================================
// WASM AssemblyScript Module — Market Engine
// Build: npx asc assembly/index.ts -o public/wasm/market_engine.wasm --optimizeLevel 3
// ============================================================

// ─── Types ────────────────────────────────────────────────
export class AssetData {
  symbol: string = "";
  price: f64 = 0.0;
  change: f64 = 0.0;
  volume: f64 = 0.0;
  marketCap: f64 = 0.0;
}

// ─── Sorting ──────────────────────────────────────────────
/**
 * Sort an array of prices (f64) ascending or descending.
 * Called from JS for high-performance column sorting in watchlist table.
 */
export function sortAscending(prices: Float64Array): Float64Array {
  const len = prices.length;
  const arr = prices.slice(0);
  // Insertion sort (fast for nearly-sorted, good for WASM)
  for (let i = 1; i < len; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
  return arr;
}

export function sortDescending(prices: Float64Array): Float64Array {
  const arr = sortAscending(prices);
  return arr.reverse();
}

// ─── Moving Average ───────────────────────────────────────
/**
 * Calculate Simple Moving Average (SMA) over a rolling window.
 * Returns array of same length; first (period-1) values are 0.
 */
export function calculateMA(prices: Float64Array, period: i32): Float64Array {
  const len = prices.length;
  const result = new Float64Array(len);
  if (period <= 0 || period > len) return result;

  let sum: f64 = 0.0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  result[period - 1] = sum / f64(period);

  for (let i = period; i < len; i++) {
    sum += prices[i] - prices[i - period];
    result[i] = sum / f64(period);
  }
  return result;
}

// ─── RSI ──────────────────────────────────────────────────
/**
 * Calculate Relative Strength Index (RSI) — classic Wilder's method.
 * period: typically 14
 */
export function calculateRSI(prices: Float64Array, period: i32): Float64Array {
  const len = prices.length;
  const result = new Float64Array(len);
  if (period <= 0 || len < period + 1) return result;

  let avgGain: f64 = 0.0;
  let avgLoss: f64 = 0.0;

  // Initial averages
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += -diff;
  }
  avgGain /= f64(period);
  avgLoss /= f64(period);

  if (avgLoss === 0.0) {
    result[period] = 100.0;
  } else {
    result[period] = 100.0 - 100.0 / (1.0 + avgGain / avgLoss);
  }

  // Wilder's smoothing
  for (let i = period + 1; i < len; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0.0;
    const loss = diff < 0 ? -diff : 0.0;
    avgGain = (avgGain * f64(period - 1) + gain) / f64(period);
    avgLoss = (avgLoss * f64(period - 1) + loss) / f64(period);
    if (avgLoss === 0.0) {
      result[i] = 100.0;
    } else {
      result[i] = 100.0 - 100.0 / (1.0 + avgGain / avgLoss);
    }
  }
  return result;
}

// ─── Normalize ────────────────────────────────────────────
/**
 * Normalize prices to [0, 1] range for sparkline chart rendering.
 * Returns normalized Float64Array.
 */
export function normalizePrices(prices: Float64Array): Float64Array {
  const len = prices.length;
  const result = new Float64Array(len);
  if (len === 0) return result;

  let min = prices[0];
  let max = prices[0];

  for (let i = 1; i < len; i++) {
    if (prices[i] < min) min = prices[i];
    if (prices[i] > max) max = prices[i];
  }

  const range = max - min;
  if (range === 0.0) {
    for (let i = 0; i < len; i++) result[i] = 0.5;
    return result;
  }

  for (let i = 0; i < len; i++) {
    result[i] = (prices[i] - min) / range;
  }
  return result;
}

// ─── Percentage Change ────────────────────────────────────
/**
 * Compute % change from first to last price in array.
 */
export function percentChange(prices: Float64Array): f64 {
  const len = prices.length;
  if (len < 2) return 0.0;
  const first = prices[0];
  if (first === 0.0) return 0.0;
  return ((prices[len - 1] - first) / first) * 100.0;
}
