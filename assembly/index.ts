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

// ─── Daily Signal Primitives ─────────────────────────────
// Scalar exports are intentionally used so the browser can call the hot parts
// directly without transferring array pointers across the AssemblyScript ABI.
export function kalmanGain(covariance: f64, processNoise: f64, measurementNoise: f64): f64 {
  const predictedCovariance = covariance + processNoise;
  return predictedCovariance / (predictedCovariance + measurementNoise);
}

export function kalmanEstimate(estimate: f64, observation: f64, gain: f64): f64 {
  return estimate + gain * (observation - estimate);
}

export function kalmanCovariance(covariance: f64, gain: f64, processNoise: f64): f64 {
  return (1.0 - gain) * (covariance + processNoise);
}

export function efficiencyRatio(netChange: f64, pathLength: f64): f64 {
  if (pathLength <= 0.0) return 0.0;
  return abs(netChange) / pathLength;
}

// Black-Scholes gamma per share. Inputs use annualized volatility and time in years.
export function blackScholesGamma(spot: f64, strike: f64, time: f64, rate: f64, dividendYield: f64, volatility: f64): f64 {
  if (spot <= 0.0 || strike <= 0.0 || time <= 0.0 || volatility <= 0.0) return 0.0;
  const rootTime = Math.sqrt(time);
  const d1 = (Math.log(spot / strike) + (rate - dividendYield + 0.5 * volatility * volatility) * time) / (volatility * rootTime);
  const normalPdf = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2.0 * Math.PI);
  return Math.exp(-dividendYield * time) * normalPdf / (spot * volatility * rootTime);
}

function normalPdf(value: f64): f64 {
  return Math.exp(-0.5 * value * value) / Math.sqrt(2.0 * Math.PI);
}

// Abramowitz-Stegun approximation, accurate enough for Greeks aggregation.
function normalCdf(value: f64): f64 {
  const sign: f64 = value < 0.0 ? -1.0 : 1.0;
  const x = abs(value);
  const t = 1.0 / (1.0 + 0.2316419 * x);
  const polynomial = (((((1.330274429 * t - 1.821255978) * t + 1.781477937) * t - 0.356563782) * t + 0.319381530) * t);
  const approximation = 1.0 - normalPdf(x) * polynomial;
  return sign > 0.0 ? approximation : 1.0 - approximation;
}

export function blackScholesVanna(spot: f64, strike: f64, time: f64, rate: f64, dividendYield: f64, volatility: f64): f64 {
  if (spot <= 0.0 || strike <= 0.0 || time <= 0.0 || volatility <= 0.0) return 0.0;
  const rootTime = Math.sqrt(time);
  const d1 = (Math.log(spot / strike) + (rate - dividendYield + 0.5 * volatility * volatility) * time) / (volatility * rootTime);
  const d2 = d1 - volatility * rootTime;
  return -Math.exp(-dividendYield * time) * normalPdf(d1) * d2 / volatility;
}

export function blackScholesCharm(spot: f64, strike: f64, time: f64, rate: f64, dividendYield: f64, volatility: f64, isCall: f64): f64 {
  if (spot <= 0.0 || strike <= 0.0 || time <= 0.0 || volatility <= 0.0) return 0.0;
  const rootTime = Math.sqrt(time);
  const d1 = (Math.log(spot / strike) + (rate - dividendYield + 0.5 * volatility * volatility) * time) / (volatility * rootTime);
  const d2 = d1 - volatility * rootTime;
  const discount = Math.exp(-dividendYield * time);
  const decay = discount * normalPdf(d1) * (2.0 * (rate - dividendYield) * time - d2 * volatility * rootTime) / (2.0 * time * volatility * rootTime);
  return isCall > 0.5 ? dividendYield * discount * normalCdf(d1) - decay : -dividendYield * discount * normalCdf(-d1) - decay;
}
