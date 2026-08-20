"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, BrainCircuit, Loader2, RefreshCw, Scale, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { loadMarketEngine, type MarketEngineWasm } from "@/lib/wasm/loader";

interface Candle { time: number; open: number; close: number; volume: number; }
interface MarketPayload { symbol: string; fourHour: Candle[]; oneHour: Candle[]; fifteenMinute: Candle[]; }
interface SignalPayload { asOf: string; markets: MarketPayload[]; }
interface Signal {
  symbol: string;
  side: "LONG" | "SHORT" | "NEUTRAL";
  confidence: number;
  kalman: number;
  efficiency: number;
  momentum: number;
  volatility: number;
  cvdProxy: number;
  rsi: number;
  obv: number;
  volumeRatio: number;
  price: number;
  targetWeight: number;
}
type IndicatorKey = "kalman" | "efficiency" | "momentum" | "rsi" | "cvd" | "obv" | "volume";
type IndicatorSettings = Record<IndicatorKey, boolean>;
const DEFAULT_INDICATORS: IndicatorSettings = { kalman: true, efficiency: true, momentum: true, rsi: true, cvd: true, obv: true, volume: true };
const INDICATORS: Array<{ key: IndicatorKey; label: string; description: string; volume?: boolean }> = [
  { key: "kalman", label: "Kalman trend", description: "Smoothed multi-timeframe direction" },
  { key: "efficiency", label: "Efficiency ratio", description: "Trend quality vs market noise" },
  { key: "momentum", label: "Momentum", description: "15-minute normalized impulse" },
  { key: "rsi", label: "RSI", description: "Avoids overextended entries" },
  { key: "cvd", label: "CVD proxy", description: "Signed candle-volume pressure", volume: true },
  { key: "obv", label: "OBV", description: "On-balance volume trend", volume: true },
  { key: "volume", label: "Volume ratio", description: "Recent participation vs baseline", volume: true },
];

async function fetchSignals(): Promise<SignalPayload> {
  const response = await fetch("/api/prices/hyperliquid/daily-signals");
  if (!response.ok) throw new Error("Could not load Hyperliquid signals");
  return response.json() as Promise<SignalPayload>;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function analyseSeries(candles: Candle[], engine: MarketEngineWasm) {
  const closes = candles.slice(-120).map((candle) => candle.close);
  const returns = closes.slice(1).map((price, index) => (price - closes[index]) / closes[index]);
  let estimate = closes[0] ?? 0;
  let covariance = Math.max(estimate * estimate * 0.0001, 0.000001);
  const processNoise = Math.max(estimate * estimate * 0.00001, 0.000001);
  const measurementNoise = Math.max(estimate * estimate * 0.0001, 0.000001);
  const trail: number[] = [];
  closes.forEach((price) => {
    const gain = engine.kalmanGain(covariance, processNoise, measurementNoise);
    estimate = engine.kalmanEstimate(estimate, price, gain);
    covariance = engine.kalmanCovariance(covariance, gain, processNoise);
    trail.push(estimate);
  });
  const path = closes.slice(1).reduce((total, price, index) => total + Math.abs(price - closes[index]), 0);
  const efficiency = engine.efficiencyRatio((closes.at(-1) ?? 0) - (closes[0] ?? 0), path);
  const volatility = standardDeviation(returns);
  const lookback = Math.min(12, trail.length - 1);
  const kalman = volatility ? ((trail.at(-1) ?? 0) - (trail.at(-lookback - 1) ?? 0)) / ((closes.at(-1) ?? 1) * volatility) : 0;
  const momentum = closes.length > 20 ? ((closes.at(-1) ?? 0) / closes.at(-21)! - 1) / Math.max(volatility, 0.000001) : 0;
  const cvdProxy = candles.slice(-30).reduce((total, candle) => total + (candle.close >= candle.open ? candle.volume : -candle.volume), 0) /
    Math.max(candles.slice(-30).reduce((total, candle) => total + candle.volume, 0), 1);
  let averageGain = 0;
  let averageLoss = 0;
  closes.slice(-15).forEach((price, index, values) => {
    if (!index) return;
    const change = price - values[index - 1];
    averageGain += Math.max(change, 0);
    averageLoss += Math.max(-change, 0);
  });
  const rsi = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  const volumeWindow = candles.slice(-60);
  const recentVolume = candles.slice(-5).reduce((total, candle) => total + candle.volume, 0) / 5;
  const baselineVolume = volumeWindow.reduce((total, candle) => total + candle.volume, 0) / Math.max(volumeWindow.length, 1);
  const volumeRatio = baselineVolume ? recentVolume / baselineVolume : 0;
  const obv = candles.slice(-60).reduce((total, candle) => total + (candle.close >= candle.open ? candle.volume : -candle.volume), 0) /
    Math.max(volumeWindow.reduce((total, candle) => total + candle.volume, 0), 1);
  return { kalman, efficiency, momentum, volatility, cvdProxy, rsi, obv, volumeRatio, price: closes.at(-1) ?? 0 };
}

function makeSignals(markets: MarketPayload[], engine: MarketEngineWasm, settings: IndicatorSettings): Signal[] {
  const signals = markets.map((market) => {
    const regime = analyseSeries(market.fourHour, engine);
    const confirmation = analyseSeries(market.oneHour, engine);
    const trigger = analyseSeries(market.fifteenMinute, engine);
    const direction = (settings.kalman ? regime.kalman + confirmation.kalman + trigger.kalman : 0) + (settings.momentum ? trigger.momentum * 0.25 : 0) + (settings.obv ? trigger.obv * 1.5 : 0);
    const aligned = !settings.kalman || (Math.sign(regime.kalman) === Math.sign(confirmation.kalman) && Math.sign(confirmation.kalman) === Math.sign(trigger.kalman));
    const efficient = !settings.efficiency || Math.min(regime.efficiency, confirmation.efficiency) >= 0.25;
    const notExtended = !settings.momentum || Math.abs(trigger.momentum) <= 2;
    const rsiSupports = !settings.rsi || (direction >= 0 ? trigger.rsi >= 45 && trigger.rsi <= 72 : trigger.rsi <= 55 && trigger.rsi >= 28);
    const cvdSupports = !settings.cvd || Math.sign(trigger.cvdProxy || 1) === Math.sign(direction || 1);
    const obvSupports = !settings.obv || Math.sign(trigger.obv || 1) === Math.sign(direction || 1);
    const volumeSupports = !settings.volume || trigger.volumeRatio >= 0.7;
    const qualified = aligned && efficient && notExtended && rsiSupports && cvdSupports && obvSupports && volumeSupports && Math.abs(direction) >= 1.2;
    const side: Signal["side"] = qualified ? direction > 0 ? "LONG" : "SHORT" : "NEUTRAL";
    const confidence = qualified ? Math.min(95, Math.round(40 + Math.min(25, Math.abs(direction) * 8) + Math.min(20, confirmation.efficiency * 45) + Math.min(10, Math.abs(trigger.cvdProxy) * 25))) : Math.min(49, Math.round(Math.abs(direction) * 12 + confirmation.efficiency * 20));
    return { symbol: market.symbol, side, confidence, kalman: confirmation.kalman, efficiency: confirmation.efficiency, momentum: trigger.momentum, volatility: trigger.volatility, cvdProxy: trigger.cvdProxy, rsi: trigger.rsi, obv: trigger.obv, volumeRatio: trigger.volumeRatio, price: trigger.price, targetWeight: 0 };
  });
  const totalRiskAdjusted = signals.filter((signal) => signal.side !== "NEUTRAL").reduce((sum, signal) => sum + signal.confidence / Math.max(signal.volatility, 0.001), 0);
  return signals.map((signal) => ({ ...signal, targetWeight: signal.side === "NEUTRAL" ? 0 : (signal.confidence / Math.max(signal.volatility, 0.001)) / Math.max(totalRiskAdjusted, 1) * 100 })).sort((a, b) => b.confidence - a.confidence);
}

export default function SignalsPage() {
  const [engine, setEngine] = useState<MarketEngineWasm | null>(null);
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>(DEFAULT_INDICATORS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  useEffect(() => { void loadMarketEngine().then(setEngine); }, []);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("marketwatch-signal-indicators");
      if (saved) setIndicatorSettings({ ...DEFAULT_INDICATORS, ...JSON.parse(saved) as Partial<IndicatorSettings> });
    } catch {
      // Defaults remain active when local storage is unavailable.
    }
    setSettingsLoaded(true);
  }, []);
  useEffect(() => {
    if (!settingsLoaded) return;
    try { window.localStorage.setItem("marketwatch-signal-indicators", JSON.stringify(indicatorSettings)); } catch {
      // Indicator toggles remain usable without persistence.
    }
  }, [indicatorSettings, settingsLoaded]);
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey: ["hyperliquid-daily-signals"], queryFn: fetchSignals, refetchInterval: 300_000 });
  const signals = useMemo(() => data && engine ? makeSignals(data.markets, engine, indicatorSettings) : [], [data, engine, indicatorSettings]);
  const activeSignals = signals.filter((signal) => signal.side !== "NEUTRAL");

  return <div className="mx-auto max-w-screen-2xl space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary" /><h2 className="text-2xl font-bold tracking-tight">Daily signals</h2></div><p className="mt-1 text-sm text-muted-foreground">Hyperliquid systematic model · closed candles only · UTC daily rebalance view.</p></div><button onClick={() => void refetch()} className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"><RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} /> Refresh</button></header>
    <section className="ios-card grid gap-px overflow-hidden sm:grid-cols-3"><div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Model status</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-400"><Activity className="h-4 w-4" /> {engine ? "WASM active" : "Loading WASM…"}</p></div><div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Rebalance</p><p className="mt-1 text-sm font-bold">Daily targets · UTC</p></div><div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Updated</p><p className="mt-1 text-sm font-bold">{data ? new Date(data.asOf).toLocaleString() : "—"}</p></div></section>
    <section className="ios-card overflow-hidden"><div className="flex items-center gap-2 border-b border-border/50 px-4 py-3"><SlidersHorizontal className="h-4 w-4 text-primary" /><div><h3 className="text-sm font-bold">Model indicators</h3><p className="text-[11px] text-muted-foreground">Tap an indicator to include or exclude it from signals and rebalance.</p></div></div><div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">{INDICATORS.map((indicator) => <button key={indicator.key} onClick={() => setIndicatorSettings((current) => ({ ...current, [indicator.key]: !current[indicator.key] }))} aria-pressed={indicatorSettings[indicator.key]} className={cn("flex items-center justify-between rounded-xl border p-3 text-left transition-colors", indicatorSettings[indicator.key] ? "border-primary/40 bg-primary/10" : "border-border/50 bg-muted/20 opacity-65")}><span><span className="flex items-center gap-1.5 text-xs font-bold">{indicator.volume && <BarChart3 className="h-3.5 w-3.5 text-amber-400" />}{indicator.label}</span><span className="mt-1 block text-[10px] text-muted-foreground">{indicator.description}</span></span><span className={cn("rounded-full px-2 py-1 text-[9px] font-bold", indicatorSettings[indicator.key] ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground")}>{indicatorSettings[indicator.key] ? "ON" : "OFF"}</span></button>)}</div></section>
    <section className="ios-card overflow-hidden"><div className="flex items-center justify-between border-b border-border/50 px-4 py-3"><div><h3 className="flex items-center gap-1.5 text-sm font-bold"><Scale className="h-4 w-4 text-primary" /> Suggested rebalance</h3><p className="text-[11px] text-muted-foreground">Risk-adjusted allocation across qualified signals; neutral markets get 0%.</p></div></div><div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">{activeSignals.length ? activeSignals.map((signal) => <div key={signal.symbol} className="rounded-xl bg-muted/35 p-3"><div className="flex justify-between"><span className="font-bold">{signal.symbol}</span><span className={signal.side === "LONG" ? "text-emerald-400" : "text-red-400"}>{signal.side}</span></div><p className="mt-2 font-mono text-xl font-bold">{signal.targetWeight.toFixed(1)}%</p><p className="text-[10px] text-muted-foreground">confidence {signal.confidence}/100</p></div>) : <p className="col-span-full p-4 text-center text-sm text-muted-foreground">No qualified setup: stay neutral / cash.</p>}</div></section>
    <section className="ios-card overflow-hidden"><div className="grid grid-cols-[1.2fr_.7fr_.7fr_.7fr_.7fr] gap-2 border-b border-border/50 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"><span>Market</span><span>Signal</span><span>Confidence</span><span>Kalman</span><span>ER</span></div>{(isLoading || !engine) ? <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Building quantitative model…</div> : error ? <div className="p-8 text-center text-sm text-destructive">Market data is temporarily unavailable.</div> : signals.map((signal) => <div key={signal.symbol} className="grid grid-cols-[1.2fr_.7fr_.7fr_.7fr_.7fr] gap-2 border-b border-border/30 px-4 py-3 text-xs last:border-0"><div><p className="font-bold">{signal.symbol}</p><p className="font-mono text-[10px] text-muted-foreground">{formatPrice(signal.price)}</p><p className="mt-1 text-[9px] text-muted-foreground">RSI {signal.rsi.toFixed(0)} · Vol {signal.volumeRatio.toFixed(1)}× · OBV {signal.obv >= 0 ? "+" : ""}{signal.obv.toFixed(2)}</p></div><span className={cn("self-center font-bold", signal.side === "LONG" ? "text-emerald-400" : signal.side === "SHORT" ? "text-red-400" : "text-muted-foreground")}>{signal.side === "LONG" ? <ArrowUpRight className="mr-1 inline h-3 w-3" /> : signal.side === "SHORT" ? <ArrowDownRight className="mr-1 inline h-3 w-3" /> : null}{signal.side}</span><span className="self-center font-mono">{signal.confidence}</span><span className="self-center font-mono">{signal.kalman.toFixed(2)}</span><span className="self-center font-mono">{signal.efficiency.toFixed(2)}</span></div>)}</section>
    <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-muted-foreground"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> Model output is a research aid, not financial advice or an execution instruction. Recheck price, liquidity, and event risk before acting.</p>
  </div>;
}
