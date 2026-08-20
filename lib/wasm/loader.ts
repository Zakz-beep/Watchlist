// lib/wasm/loader.ts
// Lazy-loads the WASM market engine module in the browser.
// Falls back to pure JavaScript implementations if WASM is unavailable.

export interface MarketEngineWasm {
  sortAscending: (prices: Float64Array) => Float64Array;
  sortDescending: (prices: Float64Array) => Float64Array;
  calculateMA: (prices: Float64Array, period: number) => Float64Array;
  calculateRSI: (prices: Float64Array, period: number) => Float64Array;
  normalizePrices: (prices: Float64Array) => Float64Array;
  percentChange: (prices: Float64Array) => number;
  kalmanGain: (covariance: number, processNoise: number, measurementNoise: number) => number;
  kalmanEstimate: (estimate: number, observation: number, gain: number) => number;
  kalmanCovariance: (covariance: number, gain: number, processNoise: number) => number;
  efficiencyRatio: (netChange: number, pathLength: number) => number;
  blackScholesGamma: (spot: number, strike: number, time: number, rate: number, dividendYield: number, volatility: number) => number;
  blackScholesVanna: (spot: number, strike: number, time: number, rate: number, dividendYield: number, volatility: number) => number;
  blackScholesCharm: (spot: number, strike: number, time: number, rate: number, dividendYield: number, volatility: number, isCall: number) => number;
}

// Pure JS fallback — identical API surface as WASM exports
const JS_FALLBACK: MarketEngineWasm = {
  sortAscending: (prices) =>
    new Float64Array([...prices].sort((a, b) => a - b)),

  sortDescending: (prices) =>
    new Float64Array([...prices].sort((a, b) => b - a)),

  calculateMA: (prices, period) => {
    const result = new Float64Array(prices.length);
    for (let i = period - 1; i < prices.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += prices[j];
      result[i] = sum / period;
    }
    return result;
  },

  calculateRSI: (prices, period) => {
    const result = new Float64Array(prices.length);
    if (prices.length < period + 1) return result;
    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) avgGain += diff;
      else avgLoss -= diff;
    }
    avgGain /= period;
    avgLoss /= period;
    result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = period + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
      result[i] =
        avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return result;
  },

  normalizePrices: (prices) => {
    if (!prices.length) return new Float64Array(0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    return new Float64Array(
      [...prices].map((p) => (range === 0 ? 0.5 : (p - min) / range))
    );
  },

  percentChange: (prices) => {
    if (prices.length < 2 || prices[0] === 0) return 0;
    return ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
  },
  kalmanGain: (covariance, processNoise, measurementNoise) => {
    const predictedCovariance = covariance + processNoise;
    return predictedCovariance / (predictedCovariance + measurementNoise);
  },
  kalmanEstimate: (estimate, observation, gain) => estimate + gain * (observation - estimate),
  kalmanCovariance: (covariance, gain, processNoise) => (1 - gain) * (covariance + processNoise),
  efficiencyRatio: (netChange, pathLength) => pathLength <= 0 ? 0 : Math.abs(netChange) / pathLength,
  blackScholesGamma: (spot, strike, time, rate, dividendYield, volatility) => {
    if (spot <= 0 || strike <= 0 || time <= 0 || volatility <= 0) return 0;
    const rootTime = Math.sqrt(time);
    const d1 = (Math.log(spot / strike) + (rate - dividendYield + 0.5 * volatility ** 2) * time) / (volatility * rootTime);
    return Math.exp(-dividendYield * time) * Math.exp(-0.5 * d1 ** 2) / Math.sqrt(2 * Math.PI) / (spot * volatility * rootTime);
  },
  blackScholesVanna: (spot, strike, time, rate, dividendYield, volatility) => {
    if (spot <= 0 || strike <= 0 || time <= 0 || volatility <= 0) return 0;
    const rootTime = Math.sqrt(time);
    const d1 = (Math.log(spot / strike) + (rate - dividendYield + 0.5 * volatility ** 2) * time) / (volatility * rootTime);
    const d2 = d1 - volatility * rootTime;
    return -Math.exp(-dividendYield * time) * Math.exp(-0.5 * d1 ** 2) / Math.sqrt(2 * Math.PI) * d2 / volatility;
  },
  blackScholesCharm: (spot, strike, time, rate, dividendYield, volatility, isCall) => {
    if (spot <= 0 || strike <= 0 || time <= 0 || volatility <= 0) return 0;
    const rootTime = Math.sqrt(time);
    const d1 = (Math.log(spot / strike) + (rate - dividendYield + 0.5 * volatility ** 2) * time) / (volatility * rootTime);
    const d2 = d1 - volatility * rootTime;
    const pdf = Math.exp(-0.5 * d1 ** 2) / Math.sqrt(2 * Math.PI);
    const cdf = (value: number) => { const sign = value < 0 ? -1 : 1; const x = Math.abs(value); const t = 1 / (1 + 0.2316419 * x); const p = (((((1.330274429 * t - 1.821255978) * t + 1.781477937) * t - 0.356563782) * t + 0.319381530) * t); const approx = 1 - Math.exp(-0.5 * x ** 2) / Math.sqrt(2 * Math.PI) * p; return sign > 0 ? approx : 1 - approx; };
    const discount = Math.exp(-dividendYield * time);
    const decay = discount * pdf * (2 * (rate - dividendYield) * time - d2 * volatility * rootTime) / (2 * time * volatility * rootTime);
    return isCall > 0.5 ? dividendYield * discount * cdf(d1) - decay : -dividendYield * discount * cdf(-d1) - decay;
  },
};

let wasmInstance: MarketEngineWasm | null = null;
let wasmLoading: Promise<MarketEngineWasm> | null = null;

export async function loadMarketEngine(): Promise<MarketEngineWasm> {
  if (wasmInstance) return wasmInstance;
  if (wasmLoading) return wasmLoading;

  wasmLoading = (async () => {
    // Only attempt WASM load in browser environment
    if (typeof window === "undefined") {
      wasmInstance = JS_FALLBACK;
      return wasmInstance;
    }

    try {
      // Fetch the pre-compiled .wasm file from the public directory
      const response = await fetch("/wasm/market_engine.wasm");
      if (!response.ok) throw new Error("WASM file not found");

      const buffer = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(buffer, {
        env: {
          memory: new WebAssembly.Memory({ initial: 1 }),
        },
      });

      const exports = instance.exports as Record<string, unknown>;

      // Map WASM exports to our typed interface
      wasmInstance = {
        sortAscending: exports.sortAscending as MarketEngineWasm["sortAscending"],
        sortDescending: exports.sortDescending as MarketEngineWasm["sortDescending"],
        calculateMA: exports.calculateMA as MarketEngineWasm["calculateMA"],
        calculateRSI: exports.calculateRSI as MarketEngineWasm["calculateRSI"],
        normalizePrices: exports.normalizePrices as MarketEngineWasm["normalizePrices"],
        percentChange: exports.percentChange as MarketEngineWasm["percentChange"],
        kalmanGain: exports.kalmanGain as MarketEngineWasm["kalmanGain"],
        kalmanEstimate: exports.kalmanEstimate as MarketEngineWasm["kalmanEstimate"],
        kalmanCovariance: exports.kalmanCovariance as MarketEngineWasm["kalmanCovariance"],
        efficiencyRatio: exports.efficiencyRatio as MarketEngineWasm["efficiencyRatio"],
        blackScholesGamma: exports.blackScholesGamma as MarketEngineWasm["blackScholesGamma"],
        blackScholesVanna: exports.blackScholesVanna as MarketEngineWasm["blackScholesVanna"],
        blackScholesCharm: exports.blackScholesCharm as MarketEngineWasm["blackScholesCharm"],
      };

      console.log("[WASM] Market engine loaded successfully");
      return wasmInstance;
    } catch (err) {
      console.warn("[WASM] Falling back to JS implementation:", err);
      wasmInstance = JS_FALLBACK;
      return wasmInstance;
    }
  })();

  return wasmLoading;
}
