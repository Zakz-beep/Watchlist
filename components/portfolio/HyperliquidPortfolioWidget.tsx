// components/portfolio/HyperliquidPortfolioWidget.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Zap,
  BarChart3,
  Layers,
  ArrowUpRight,
  Coins,
  Activity,
  History,
  Calculator,
  Percent,
  Flame,
  Scale,
  Award,
  AlertTriangle,
} from "lucide-react";
import { useHyperliquidAccount } from "@/lib/hooks/useHyperliquidAccount";
import { cn } from "@/lib/utils";

interface HyperliquidPortfolioWidgetProps {
  walletAddress?: string;
  onOpenEditProfile?: () => void;
}

type TabType = "positions" | "history" | "metrics" | "spot";

export function HyperliquidPortfolioWidget({
  walletAddress,
  onOpenEditProfile,
}: HyperliquidPortfolioWidgetProps) {
  const [copied, setCopied] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("positions");

  const activeAddress = (customAddress || walletAddress || "").toLowerCase();
  const { account, isLoading, isFetching, error, refetch, isValidAddress } = useHyperliquidAccount(activeAddress);

  const handleCopy = () => {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Performance Chart Calculations
  const chartPoints = useMemo(() => {
    if (!account?.performanceHistory || account.performanceHistory.length === 0) {
      return [];
    }
    const history = account.performanceHistory;
    const minPnl = Math.min(...history.map((h) => h.cumulativePnl), 0);
    const maxPnl = Math.max(...history.map((h) => h.cumulativePnl), 10);
    const range = maxPnl - minPnl || 1;

    return history.map((item, idx) => {
      const x = (idx / (history.length - 1 || 1)) * 100;
      const y = 100 - ((item.cumulativePnl - minPnl) / range) * 85 - 5;
      return { x, y, pnl: item.cumulativePnl, time: item.time, coin: item.coin };
    });
  }, [account?.performanceHistory]);

  const pathD = useMemo(() => {
    if (chartPoints.length < 2) return "";
    return chartPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");
  }, [chartPoints]);

  const areaD = useMemo(() => {
    if (chartPoints.length < 2) return "";
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `M ${first.x} 100 L ${first.x} ${first.y} ${chartPoints
      .slice(1)
      .map((p) => `L ${p.x} ${p.y}`)
      .join(" ")} L ${last.x} 100 Z`;
  }, [chartPoints]);

  // Overall statistics
  const totalUnrealizedPnl = (account?.positions || []).reduce((acc, p) => acc + p.unrealizedPnl, 0);
  const totalPositionValue = (account?.positions || []).reduce((acc, p) => acc + p.positionValue, 0);
  const marginUsageRatio = account?.accountValue
    ? Math.min((account.totalMarginUsed / account.accountValue) * 100, 100)
    : 0;

  const rm = account?.riskMetrics;

  if (!activeAddress) {
    return (
      <div className="ios-card p-6 border border-border/60 text-center relative overflow-hidden bg-gradient-to-b from-card/90 to-card/40">
        <div className="max-w-md mx-auto space-y-4 py-6">
          <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Connect Hyperliquid L1 Account</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Track your real-time open positions, perpetual margin health, closed trades history, and institutional quant risk metrics (Sharpe, Sortino, Profit Factor, Win Rate).
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            {onOpenEditProfile && (
              <button
                onClick={onOpenEditProfile}
                className="ios-button flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              >
                <Wallet className="w-3.5 h-3.5" />
                Add Wallet in Profile
              </button>
            )}
            <button
              onClick={() => setCustomAddress("0x010461c14e146ac35fe42271bdc1134ee31c703a")}
              className="px-3.5 py-2 rounded-2xl border border-border/60 bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
            >
              Explore Active Trader Whale Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Account Header Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-card p-5 border border-border/60 relative overflow-hidden bg-gradient-to-br from-card/90 via-card/50 to-emerald-950/10"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base">Hyperliquid L1 Portfolio</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync (5s)
                </span>
                {account?.positions && account.positions.length > 0 && (
                  <span className="text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/25 px-2 py-0.5 rounded-full">
                    {account.positions.length} Active Positions
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                <span>{activeAddress.slice(0, 8)}...{activeAddress.slice(-6)}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy address"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <a
                  href={`https://app.hyperliquid.xyz/trade/explorer?address=${activeAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-emerald-400 transition-colors flex items-center gap-0.5"
                  title="View on Hyperliquid Explorer"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {onOpenEditProfile && (
              <button
                onClick={onOpenEditProfile}
                className="px-3 py-1.5 rounded-xl border border-border/60 text-xs font-semibold hover:bg-muted/70 transition-all text-muted-foreground hover:text-foreground"
              >
                Change Wallet
              </button>
            )}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
            >
              <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* Account KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {/* Account Net Worth */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40">
            <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Total Account Value</span>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              ${(account?.accountValue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={cn(
              "text-[11px] font-semibold flex items-center gap-0.5 mt-1",
              totalUnrealizedPnl >= 0 ? "text-gain" : "text-loss"
            )}>
              {totalUnrealizedPnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>
                {totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)} Unrealized PnL
              </span>
            </div>
          </div>

          {/* Margin Used */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40">
            <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Margin Used</span>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              ${(account?.totalMarginUsed || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="w-full bg-muted/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  marginUsageRatio > 75 ? "bg-red-500" : marginUsageRatio > 40 ? "bg-amber-400" : "bg-emerald-400"
                )}
                style={{ width: `${marginUsageRatio}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium mt-1 block">
              {marginUsageRatio.toFixed(1)}% Margin Utilization
            </span>
          </div>

          {/* Withdrawable / Free USD */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40">
            <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Withdrawable (Free Collateral)</span>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-400">
              ${(account?.withdrawable || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium mt-1 block">
              Cross Collateral Available
            </span>
          </div>

          {/* Open Positions Count */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40">
            <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Active Perps Exposure</span>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              ${totalPositionValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">
              {account?.positions?.length || 0} Open Positions
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Quant Risk Metrics Scoreboard ── */}
      {rm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="ios-card p-5 border border-border/60 space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Quantitative Risk & Performance Metrics</h4>
                <p className="text-[11px] text-muted-foreground">
                  Institutional grade risk-adjusted returns calculated across {rm.totalTrades} closed trade executions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-muted/60 text-muted-foreground border border-border/40">
              <span>Win/Loss:</span>
              <span className="text-gain font-bold">{rm.winningTrades}W</span>
              <span>/</span>
              <span className="text-loss font-bold">{rm.losingTrades}L</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Sharpe Ratio */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-medium">Sharpe Ratio</span>
                <Scale className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className={cn(
                "text-lg sm:text-xl font-black font-mono",
                rm.sharpeRatio >= 1 ? "text-gain" : rm.sharpeRatio > 0 ? "text-amber-400" : "text-loss"
              )}>
                {rm.sharpeRatio}
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {rm.sharpeRatio >= 2 ? "★ Exceptional" : rm.sharpeRatio >= 1 ? "Good (>1.0)" : "Volatile"}
              </span>
            </div>

            {/* Sortino Ratio */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-medium">Sortino Ratio</span>
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className={cn(
                "text-lg sm:text-xl font-black font-mono",
                rm.sortinoRatio >= 1 ? "text-gain" : rm.sortinoRatio > 0 ? "text-amber-400" : "text-loss"
              )}>
                {rm.sortinoRatio}
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                Downside Risk Adj.
              </span>
            </div>

            {/* Profit Factor */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-medium">Profit Factor</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className={cn(
                "text-lg sm:text-xl font-black font-mono",
                rm.profitFactor >= 1.5 ? "text-gain" : rm.profitFactor >= 1 ? "text-amber-400" : "text-loss"
              )}>
                {rm.profitFactor > 50 ? "50.0+" : rm.profitFactor}
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                Gross Win / Loss
              </span>
            </div>

            {/* Win Rate */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-medium">Win Rate (WR)</span>
                <Percent className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className={cn(
                "text-lg sm:text-xl font-black font-mono",
                rm.winRate >= 50 ? "text-gain" : "text-loss"
              )}>
                {rm.winRate}%
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {rm.winningTrades} of {rm.totalTrades} trades
              </span>
            </div>

            {/* Max Drawdown */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-medium">Max Drawdown</span>
                <AlertTriangle className="w-3.5 h-3.5 text-loss" />
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-loss">
                -${rm.maxDrawdown.toFixed(0)}
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {rm.maxDrawdownPercent > 0 ? `-${rm.maxDrawdownPercent}% Peak` : "0.0% Peak"}
              </span>
            </div>

            {/* Net Realized PnL */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-medium">Net Realized PnL</span>
                <Award className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className={cn(
                "text-lg sm:text-xl font-black font-mono",
                rm.netRealizedPnl >= 0 ? "text-gain" : "text-loss"
              )}>
                {rm.netRealizedPnl >= 0 ? "+" : ""}${rm.netRealizedPnl.toFixed(2)}
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                Exp: ${rm.expectancy}/trade
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Performance History Chart ── */}
      {account?.performanceHistory && account.performanceHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="ios-card p-5 border border-border/60 space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Realized PnL Trajectory & Equity Growth</h4>
                <p className="text-[11px] text-muted-foreground">Cumulative performance curve across all Hyperliquid trade fills</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Net Realized PnL</span>
                <span className={cn(
                  "text-sm font-extrabold",
                  (rm?.netRealizedPnl || 0) >= 0 ? "text-gain" : "text-loss"
                )}>
                  {(rm?.netRealizedPnl || 0) >= 0 ? "+" : ""}${rm?.netRealizedPnl || 0}
                </span>
              </div>
            </div>
          </div>

          {/* SVG Area Chart */}
          <div className="h-44 w-full relative pt-2">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={(rm?.netRealizedPnl || 0) >= 0 ? "#10b981" : "#ef4444"} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={(rm?.netRealizedPnl || 0) >= 0 ? "#10b981" : "#ef4444"} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Baseline Zero line */}
              <line x1="0" y1="90" x2="100" y2="90" stroke="currentColor" strokeDasharray="2 2" className="text-border/40" strokeWidth="0.5" />

              {/* Area Fill */}
              {areaD && <path d={areaD} fill="url(#pnlGrad)" />}

              {/* Line Stroke */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={(rm?.netRealizedPnl || 0) >= 0 ? "#10b981" : "#ef4444"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
        </motion.div>
      )}

      {/* ── Navigation Tabs for Detailed Data ── */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("positions")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0",
            activeTab === "positions"
              ? "bg-primary text-primary-foreground shadow-md shadow-blue-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Open Positions ({account?.positions?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0",
            activeTab === "history"
              ? "bg-primary text-primary-foreground shadow-md shadow-blue-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <History className="w-3.5 h-3.5" />
          <span>Trade Fills History ({account?.fills?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("spot")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0",
            activeTab === "spot"
              ? "bg-primary text-primary-foreground shadow-md shadow-blue-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Spot Balances ({account?.spotBalances?.length || 0})</span>
        </button>
      </div>

      {/* ── TAB 1: Open Positions Table ── */}
      {activeTab === "positions" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ios-card overflow-hidden border border-border/60"
        >
          <div className="p-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Open Perpetuals Contracts</h4>
                <p className="text-[11px] text-muted-foreground">Live contracts on Hyperliquid L1 orderbook</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {account?.positions?.length || 0} contracts
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              Fetching Hyperliquid contracts...
            </div>
          ) : !account?.positions || account.positions.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-xs text-muted-foreground">No open perpetual positions currently.</p>
              <p className="text-[11px] text-muted-foreground/70">
                All margin is idle in withdrawable USDC collateral.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/40 bg-muted/20 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Market</th>
                    <th className="py-3 px-4">Side / Leverage</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Position Value</th>
                    <th className="py-3 px-4">Entry Price</th>
                    <th className="py-3 px-4">Liq. Price</th>
                    <th className="py-3 px-4 text-right">Unrealized PnL (ROE)</th>
                    <th className="py-3 px-4 text-center">Chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono text-xs">
                  {account.positions.map((pos) => {
                    const isLong = pos.szi > 0;
                    const isProfit = pos.unrealizedPnl >= 0;
                    return (
                      <tr key={pos.coin} className="hover:bg-muted/30 transition-colors">
                        {/* Market */}
                        <td className="py-3 px-4 font-sans font-bold text-foreground">
                          {pos.coin}-PERP
                        </td>

                        {/* Side & Leverage */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded-md text-[10px] font-bold font-sans uppercase",
                                isLong ? "bg-emerald-500/15 text-gain" : "bg-red-500/15 text-loss"
                              )}
                            >
                              {isLong ? "Long" : "Short"}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-semibold">
                              {pos.leverage.value}x {pos.leverage.type}
                            </span>
                          </div>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-4">
                          {Math.abs(pos.szi).toLocaleString("en-US", { maximumFractionDigits: 4 })} {pos.coin}
                        </td>

                        {/* Position Value */}
                        <td className="py-3 px-4">
                          ${pos.positionValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Entry Price */}
                        <td className="py-3 px-4">
                          ${pos.entryPx.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>

                        {/* Liq Price */}
                        <td className="py-3 px-4 text-amber-400">
                          {pos.liquidationPx
                            ? `$${pos.liquidationPx.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                            : "None"}
                        </td>

                        {/* PnL & ROE */}
                        <td className={cn("py-3 px-4 text-right font-bold", isProfit ? "text-gain" : "text-loss")}>
                          <div>
                            {isProfit ? "+" : ""}${pos.unrealizedPnl.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-medium opacity-80">
                            {isProfit ? "+" : ""}{(pos.returnOnEquity * 100).toFixed(2)}%
                          </div>
                        </td>

                        {/* Link to Chart */}
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/dashboard/charts?symbol=${pos.coin}&source=hyperliquid`}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title="Open Chart & Order Book"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── TAB 2: Trade Fills History Table ── */}
      {activeTab === "history" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ios-card overflow-hidden border border-border/60"
        >
          <div className="p-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Execution & Closed Position History</h4>
                <p className="text-[11px] text-muted-foreground">Historical order fills executed on Hyperliquid</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {account?.fills?.length || 0} records
            </span>
          </div>

          {!account?.fills || account.fills.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No historical trade fills recorded on this account yet.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/40 bg-muted/20 text-muted-foreground uppercase text-[10px] font-bold tracking-wider sticky top-0 bg-card z-10">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Market</th>
                    <th className="py-3 px-4">Direction</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Fee</th>
                    <th className="py-3 px-4 text-right">Realized PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono text-xs">
                  {account.fills.map((fill, idx) => {
                    const isClosedTrade = fill.closedPnl !== 0;
                    const isProfit = fill.closedPnl > 0;
                    const dateStr = new Date(fill.time).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={`${fill.tid}-${idx}`} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-sans text-muted-foreground text-[11px]">
                          {dateStr}
                        </td>
                        <td className="py-2.5 px-4 font-sans font-bold text-foreground">
                          {fill.coin}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded-md text-[10px] font-bold font-sans uppercase",
                              fill.side === "B" ? "bg-emerald-500/15 text-gain" : "bg-red-500/15 text-loss"
                            )}
                          >
                            {fill.dir}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          ${fill.px.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td className="py-2.5 px-4">
                          {fill.sz} {fill.coin}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          ${fill.fee.toFixed(4)}
                        </td>
                        <td className={cn(
                          "py-2.5 px-4 text-right font-bold",
                          isClosedTrade
                            ? isProfit
                              ? "text-gain"
                              : "text-loss"
                            : "text-muted-foreground"
                        )}>
                          {isClosedTrade ? (
                            <span>{isProfit ? "+" : ""}${fill.closedPnl.toFixed(2)}</span>
                          ) : (
                            <span className="opacity-50">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── TAB 3: Spot Balances ── */}
      {activeTab === "spot" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ios-card p-5 border border-border/60 space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Hyperliquid Spot Balances</h4>
              <p className="text-[11px] text-muted-foreground">L1 token balances held on the Hyperliquid blockchain</p>
            </div>
          </div>

          {!account?.spotBalances || account.spotBalances.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No spot token balances found on this address.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
              {account.spotBalances.map((spot) => (
                <div key={spot.coin} className="p-3.5 rounded-2xl bg-muted/30 border border-border/40">
                  <div className="text-xs font-bold text-foreground">{spot.coin}</div>
                  <div className="text-base font-extrabold font-mono mt-0.5">
                    {spot.total.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                  </div>
                  {spot.hold > 0 && (
                    <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                      Hold: {spot.hold}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
