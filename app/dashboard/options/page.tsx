"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, Loader2, RefreshCw, Search, Target } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { loadMarketEngine, type MarketEngineWasm } from "@/lib/wasm/loader";

interface OptionContract { strike: number; openInterest: number; impliedVolatility: number; volume: number; }
interface ExpiryChain { expiry: string; calls: OptionContract[]; puts: OptionContract[]; }
interface OptionsPayload { ticker: string; spot: number; currency: string; fetchedAt: string; expiries: ExpiryChain[]; }
interface StrikeGex { strike: number; callGex: number; putGex: number; netGex: number; }
interface ExpiryGex { expiry: string; days: number; netGex: number; vanna: number; charm: number; callWall: number | null; putWall: number | null; maxPain: number | null; gammaFlip: number | null; strikes: StrikeGex[]; }

const CONTRACT_MULTIPLIER = 100;

async function fetchOptions(ticker: string): Promise<OptionsPayload> {
  const response = await fetch(`/api/options/gex?ticker=${encodeURIComponent(ticker)}`);
  if (!response.ok) throw new Error("Options chain unavailable");
  return response.json() as Promise<OptionsPayload>;
}

function gexForContract(contract: OptionContract, spot: number, expiry: string, rate: number, dividend: number, engine: MarketEngineWasm) {
  const time = Math.max((new Date(expiry).getTime() - Date.now()) / 86_400_000 / 365.25, 1 / 365.25);
  if (!contract.openInterest || !contract.impliedVolatility || contract.impliedVolatility <= 0) return 0;
  return engine.blackScholesGamma(spot, contract.strike, time, rate, dividend, contract.impliedVolatility) * contract.openInterest * CONTRACT_MULTIPLIER * spot * spot * 0.01;
}

function greekExposure(contract: OptionContract, spot: number, expiry: string, rate: number, dividend: number, engine: MarketEngineWasm, greek: "vanna" | "charm", isCall: boolean) {
  const time = Math.max((new Date(expiry).getTime() - Date.now()) / 86_400_000 / 365.25, 1 / 365.25);
  if (!contract.openInterest || !contract.impliedVolatility || contract.impliedVolatility <= 0) return 0;
  const value = greek === "vanna"
    ? engine.blackScholesVanna(spot, contract.strike, time, rate, dividend, contract.impliedVolatility) * 0.01
    : engine.blackScholesCharm(spot, contract.strike, time, rate, dividend, contract.impliedVolatility, isCall ? 1 : 0) / 365.25;
  return value * contract.openInterest * CONTRACT_MULTIPLIER;
}

function maxPain(chain: ExpiryChain) {
  const strikes = [...new Set([...chain.calls, ...chain.puts].map((contract) => contract.strike))].sort((a, b) => a - b);
  if (!strikes.length) return null;
  return strikes.reduce((best, candidate) => {
    const pain = chain.calls.reduce((sum, call) => sum + Math.max(0, candidate - call.strike) * call.openInterest * CONTRACT_MULTIPLIER, 0) + chain.puts.reduce((sum, put) => sum + Math.max(0, put.strike - candidate) * put.openInterest * CONTRACT_MULTIPLIER, 0);
    return pain < best.pain ? { strike: candidate, pain } : best;
  }, { strike: strikes[0], pain: Number.POSITIVE_INFINITY }).strike;
}

function gammaFlip(chain: ExpiryChain, spot: number, rate: number, dividend: number, engine: MarketEngineWasm) {
  const strikes = [...new Set([...chain.calls, ...chain.puts].map((contract) => contract.strike))].sort((a, b) => a - b);
  if (strikes.length < 2) return null;
  // A distant mathematical crossing is not a useful gamma flip reference.
  // Search only the liquid local range, then choose the root nearest spot.
  const min = Math.max(Math.min(...strikes), spot * 0.75);
  const max = Math.min(Math.max(...strikes), spot * 1.25);
  if (min >= max) return null;
  let previousSpot = min;
  let previousGex = chain.calls.reduce((sum, contract) => sum + gexForContract(contract, min, chain.expiry, rate, dividend, engine), 0) - chain.puts.reduce((sum, contract) => sum + gexForContract(contract, min, chain.expiry, rate, dividend, engine), 0);
  const roots: number[] = [];
  for (let index = 1; index <= 120; index++) {
    const candidate = min + ((max - min) * index) / 120;
    const value = chain.calls.reduce((sum, contract) => sum + gexForContract(contract, candidate, chain.expiry, rate, dividend, engine), 0) - chain.puts.reduce((sum, contract) => sum + gexForContract(contract, candidate, chain.expiry, rate, dividend, engine), 0);
    if (Math.sign(value) !== Math.sign(previousGex) && value !== 0) roots.push(previousSpot + (candidate - previousSpot) * Math.abs(previousGex) / (Math.abs(previousGex) + Math.abs(value)));
    previousSpot = candidate;
    previousGex = value;
  }
  return roots.sort((left, right) => Math.abs(left - spot) - Math.abs(right - spot))[0] ?? null;
}

function analyseExpiry(chain: ExpiryChain, spot: number, rate: number, dividend: number, engine: MarketEngineWasm): ExpiryGex {
  const rows = new Map<number, StrikeGex>();
  chain.calls.forEach((contract) => { const row = rows.get(contract.strike) ?? { strike: contract.strike, callGex: 0, putGex: 0, netGex: 0 }; row.callGex += gexForContract(contract, spot, chain.expiry, rate, dividend, engine); row.netGex = row.callGex - row.putGex; rows.set(contract.strike, row); });
  chain.puts.forEach((contract) => { const row = rows.get(contract.strike) ?? { strike: contract.strike, callGex: 0, putGex: 0, netGex: 0 }; row.putGex += gexForContract(contract, spot, chain.expiry, rate, dividend, engine); row.netGex = row.callGex - row.putGex; rows.set(contract.strike, row); });
  const strikes = [...rows.values()].sort((a, b) => a.strike - b.strike);
  const callWall = strikes.reduce<StrikeGex | null>((best, row) => !best || row.callGex > best.callGex ? row : best, null)?.strike ?? null;
  const putWall = strikes.reduce<StrikeGex | null>((best, row) => !best || row.putGex > best.putGex ? row : best, null)?.strike ?? null;
  const vanna = chain.calls.reduce((sum, contract) => sum + greekExposure(contract, spot, chain.expiry, rate, dividend, engine, "vanna", true), 0) + chain.puts.reduce((sum, contract) => sum + greekExposure(contract, spot, chain.expiry, rate, dividend, engine, "vanna", false), 0);
  const charm = chain.calls.reduce((sum, contract) => sum + greekExposure(contract, spot, chain.expiry, rate, dividend, engine, "charm", true), 0) + chain.puts.reduce((sum, contract) => sum + greekExposure(contract, spot, chain.expiry, rate, dividend, engine, "charm", false), 0);
  const days = Math.max(0, Math.ceil((new Date(chain.expiry).getTime() - Date.now()) / 86_400_000));
  return { expiry: chain.expiry, days, netGex: strikes.reduce((sum, row) => sum + row.netGex, 0), vanna, charm, callWall, putWall, maxPain: maxPain(chain), gammaFlip: days === 0 ? null : gammaFlip(chain, spot, rate, dividend, engine), strikes };
}

function formatGex(value: number) { return `${value >= 0 ? "+" : ""}$${(value / 1_000_000).toFixed(1)}M`; }
function formatGreek(value: number) { return `${value >= 0 ? "+" : ""}${Math.abs(value) >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)}M` : `${(value / 1_000).toFixed(1)}K`}`; }

export default function OptionsGexPage() {
  const [tickerInput, setTickerInput] = useState("SPY");
  const [ticker, setTicker] = useState("SPY");
  const [rate, setRate] = useState(4);
  const [dividend, setDividend] = useState(0);
  const [engine, setEngine] = useState<MarketEngineWasm | null>(null);
  useEffect(() => { void loadMarketEngine().then(setEngine); }, []);
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey: ["options-gex", ticker], queryFn: () => fetchOptions(ticker), staleTime: 900_000 });
  const analysis = useMemo(() => data && engine ? data.expiries.map((chain) => analyseExpiry(chain, data.spot, rate / 100, dividend / 100, engine)) : [], [data, engine, rate, dividend]);
  const totalGex = analysis.reduce((sum, expiry) => sum + expiry.netGex, 0);

  return <div className="mx-auto max-w-screen-2xl space-y-4"><header className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><h2 className="text-2xl font-bold tracking-tight">Options GEX</h2></div><p className="mt-1 text-sm text-muted-foreground">Yahoo options chain · OI-weighted Black-Scholes gamma exposure.</p></div><button onClick={() => void refetch()} className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"><RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} /> Refresh</button></header>
    <section className="ios-card flex flex-wrap gap-3 p-3"><div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={tickerInput} onChange={(event) => setTickerInput(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === "Enter" && setTicker(tickerInput)} className="h-10 w-full rounded-xl border border-border/60 bg-background pl-9 pr-3 text-sm font-bold outline-none focus:border-primary" placeholder="SPY, AAPL, NVDA" /></div><button onClick={() => setTicker(tickerInput)} className="rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">Load chain</button><label className="text-xs font-semibold text-muted-foreground">Rate %<input value={rate} type="number" step="0.1" onChange={(event) => setRate(Number(event.target.value))} className="ml-2 w-16 rounded-lg border border-border/60 bg-background p-2 text-foreground" /></label><label className="text-xs font-semibold text-muted-foreground">Dividend %<input value={dividend} type="number" step="0.1" onChange={(event) => setDividend(Number(event.target.value))} className="ml-2 w-16 rounded-lg border border-border/60 bg-background p-2 text-foreground" /></label></section>
    {(isLoading || !engine) ? <div className="ios-card flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading chain and WASM greeks…</div> : error || !data ? <div className="ios-card p-10 text-center text-sm text-destructive">Yahoo options data is unavailable for {ticker}.</div> : <><section className="ios-card grid gap-px overflow-hidden sm:grid-cols-3"><div className="p-4"><p className="text-[10px] font-bold uppercase text-muted-foreground">Spot</p><p className="mt-1 font-mono text-xl font-bold">{formatPrice(data.spot)}</p><p className="text-[10px] text-muted-foreground">{data.ticker} · {data.currency}</p></div><div className="p-4"><p className="text-[10px] font-bold uppercase text-muted-foreground">Net GEX (all shown)</p><p className={cn("mt-1 font-mono text-xl font-bold", totalGex >= 0 ? "text-emerald-400" : "text-red-400")}>{formatGex(totalGex)}</p><p className="text-[10px] text-muted-foreground">per 1% underlying move</p></div><div className="p-4"><p className="text-[10px] font-bold uppercase text-muted-foreground">Method</p><p className="mt-1 text-sm font-bold">WASM Black-Scholes</p><p className="text-[10px] text-muted-foreground">OI × 100-share multiplier</p></div></section>
      <section className={cn("ios-card border p-4", totalGex >= 0 ? "border-emerald-500/25 bg-emerald-500/5" : "border-red-500/25 bg-red-500/5")}><h3 className={cn("text-sm font-bold", totalGex >= 0 ? "text-emerald-400" : "text-red-400")}>{totalGex >= 0 ? "Positive gamma regime" : "Negative gamma regime"}</h3><p className="mt-1 text-[11px] text-muted-foreground">{totalGex >= 0 ? "Under the OI sign convention, positive net gamma can be associated with dampened moves and mean reversion." : "Under the OI sign convention, negative net gamma can be associated with amplified moves and higher trend sensitivity."} This is an inference—not confirmed dealer positioning.</p></section>
      <section className="ios-card overflow-x-auto"><div className="min-w-[980px]"><div className="grid grid-cols-[.85fr_.42fr_.75fr_.85fr_.7fr_.7fr_.7fr_.7fr_.9fr] gap-2 border-b border-border/50 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"><span>Expiry</span><span>DTE</span><span>Regime / GEX</span><span>Gamma flip</span><span>Call wall</span><span>Put wall</span><span>Max pain</span><span>Vanna</span><span>Charm / day</span></div>{analysis.map((expiry) => <div key={expiry.expiry} className="grid grid-cols-[.85fr_.42fr_.75fr_.85fr_.7fr_.7fr_.7fr_.7fr_.9fr] gap-2 border-b border-border/30 px-4 py-3 text-xs last:border-0"><span className="font-semibold">{new Date(expiry.expiry).toLocaleDateString()}</span><span>{expiry.days === 0 ? "0d*" : `${expiry.days}d`}</span><span className={cn("font-mono", expiry.netGex >= 0 ? "text-emerald-400" : "text-red-400")}>{expiry.netGex >= 0 ? "POS " : "NEG "}{formatGex(expiry.netGex)}</span><span className="font-mono">{expiry.gammaFlip ? formatPrice(expiry.gammaFlip) : "—"}</span><span className="font-mono">{expiry.callWall ? formatPrice(expiry.callWall) : "—"}</span><span className="font-mono">{expiry.putWall ? formatPrice(expiry.putWall) : "—"}</span><span className="font-mono">{expiry.maxPain ? formatPrice(expiry.maxPain) : "—"}</span><span className="font-mono">{formatGreek(expiry.vanna)}</span><span className="font-mono">{formatGreek(expiry.charm)}</span></div>)}</div></section></>}
    <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> Gamma flip now uses the nearest root within ±25% of spot; a 0DTE row (*) hides gamma flip because Yahoo supplies only an expiry date, not the exact option close timestamp. Call GEX is treated positive and put GEX negative by convention. Vanna is shown per 1 volatility point; charm is shown per day. OI does not reveal dealer positioning.</p></div>;
}
