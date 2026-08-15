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
