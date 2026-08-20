// app/api/hyperliquid/account/route.ts
import { NextRequest, NextResponse } from "next/server";
import type {
  HyperliquidPosition,
  HyperliquidSpotBalance,
  HyperliquidTradeFill,
  PortfolioRiskMetrics,
} from "@/types/market";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUser = searchParams.get("user")?.trim();

  if (!rawUser || !/^0x[a-fA-F0-9]{40}$/.test(rawUser)) {
    return NextResponse.json(
      { error: "Invalid Ethereum/Hyperliquid wallet address format (must be 0x... 42 chars)" },
      { status: 400 }
    );
  }

  const user = rawUser.toLowerCase();

  try {
    // 1. Fetch Clearinghouse (Perpetuals), Spot, and User Trade Fills in parallel
    const [clearingRes, spotRes, fillsRes] = await Promise.allSettled([
      fetch(HYPERLIQUID_INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "clearinghouseState", user }),
        next: { revalidate: 5 },
      }).then((r) => r.json()),

      fetch(HYPERLIQUID_INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "spotClearinghouseState", user }),
        next: { revalidate: 5 },
      }).then((r) => r.json()),

      fetch(HYPERLIQUID_INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "userFills", user }),
        next: { revalidate: 5 },
      }).then((r) => r.json()),
    ]);

    const clearingData = clearingRes.status === "fulfilled" ? clearingRes.value : null;
    const spotData = spotRes.status === "fulfilled" ? spotRes.value : null;
    const fillsData: any[] = fillsRes.status === "fulfilled" && Array.isArray(fillsRes.value) ? fillsRes.value : [];

    // Format Perps Positions
    const rawPositions = Array.isArray(clearingData?.assetPositions) ? clearingData.assetPositions : [];
    const positions: HyperliquidPosition[] = rawPositions
      .map((item: any) => {
        const p = item.position;
        if (!p) return null;
        const szi = parseFloat(p.szi) || 0;
        if (Math.abs(szi) === 0) return null; // skip closed positions

        return {
          coin: p.coin,
          szi,
          entryPx: parseFloat(p.entryPx) || 0,
          positionValue: parseFloat(p.positionValue) || 0,
          unrealizedPnl: parseFloat(p.unrealizedPnl) || 0,
          returnOnEquity: parseFloat(p.returnOnEquity) || 0,
          liquidationPx: p.liquidationPx ? parseFloat(p.liquidationPx) : null,
          leverage: p.leverage || { type: "cross", value: 1 },
          marginUsed: parseFloat(p.marginUsed) || 0,
          maxLeverage: p.maxLeverage || 50,
        };
      })
      .filter(Boolean);

    // Format Spot Balances
    const rawSpot = Array.isArray(spotData?.balances) ? spotData.balances : [];
    const spotBalances: HyperliquidSpotBalance[] = rawSpot
      .map((b: any) => ({
        coin: b.coin,
        total: parseFloat(b.total) || 0,
        hold: parseFloat(b.hold) || 0,
        entryNtl: parseFloat(b.entryNtl) || 0,
      }))
      .filter((b: any) => b.total > 0);

    // Format Fills
    const fills: HyperliquidTradeFill[] = fillsData.map((f: any) => ({
      time: f.time,
      coin: f.coin,
      side: f.side,
      dir: f.dir || (f.side === "B" ? "Buy" : "Sell"),
      sz: parseFloat(f.sz) || 0,
      px: parseFloat(f.px) || 0,
      closedPnl: parseFloat(f.closedPnl) || 0,
      fee: parseFloat(f.fee) || 0,
      feeToken: f.feeToken || "USDC",
      hash: f.hash || "",
      oid: f.oid || 0,
      tid: f.tid || 0,
      crossed: Boolean(f.crossed),
    }));

    // ── Calculate Quant Risk Metrics (Sharpe, Sortino, Profit Factor, WR, Drawdown) ──
    const closedTrades = fills.filter((f) => f.closedPnl !== 0);
    const pnls = closedTrades.map((f) => f.closedPnl - f.fee);
    const winningTrades = pnls.filter((p) => p > 0);
    const losingTrades = pnls.filter((p) => p < 0);

    const grossProfit = winningTrades.reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(losingTrades.reduce((a, b) => a + b, 0));
    const netRealizedPnl = pnls.reduce((a, b) => a + b, 0);

    const totalTradesCount = pnls.length;
    const winRate = totalTradesCount > 0 ? (winningTrades.length / totalTradesCount) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);

    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
    const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    const lossRate = 1 - (winRate / 100);
    const expectancy = (winRate / 100) * avgWin - lossRate * avgLoss;

    // Sharpe and Sortino (Annualized based on trade returns)
    let sharpeRatio = 0;
    let sortinoRatio = 0;
    if (pnls.length > 1) {
      const mean = netRealizedPnl / pnls.length;
      const variance = pnls.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (pnls.length - 1);
      const stdDev = Math.sqrt(variance);

      const downsideVariations = pnls.filter((p) => p < 0).map((p) => Math.pow(p, 2));
      const downsideVariance = downsideVariations.length > 0
        ? downsideVariations.reduce((a, b) => a + b, 0) / downsideVariations.length
        : 0;
      const downsideStd = Math.sqrt(downsideVariance);

      const annualFactor = Math.sqrt(365);
      if (stdDev > 0) sharpeRatio = Number(((mean / stdDev) * annualFactor).toFixed(2));
      if (downsideStd > 0) sortinoRatio = Number(((mean / downsideStd) * annualFactor).toFixed(2));
    }

    // Max Drawdown Calculation
    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let cumPnl = 0;
    // Walk chronological
    fills.slice().reverse().forEach((f) => {
      cumPnl += (f.closedPnl - f.fee);
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    const accountVal = parseFloat(clearingData?.marginSummary?.accountValue) || 0;
    if (accountVal > 0 && maxDrawdown > 0) {
      maxDrawdownPercent = (maxDrawdown / (accountVal + maxDrawdown)) * 100;
    }

    const riskMetrics: PortfolioRiskMetrics = {
      winRate: Number(winRate.toFixed(1)),
      profitFactor: Number(profitFactor.toFixed(2)),
      sharpeRatio,
      sortinoRatio,
      totalTrades: totalTradesCount,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      netRealizedPnl: Number(netRealizedPnl.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(1)),
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2)),
      payoffRatio: Number(payoffRatio.toFixed(2)),
      expectancy: Number(expectancy.toFixed(2)),
    };

    // Performance Trajectory Chart Data
    let runningPnl = 0;
    const performanceHistory = fills
      .slice()
      .reverse()
      .map((fill) => {
        runningPnl += fill.closedPnl - fill.fee;
        return {
          time: fill.time,
          coin: fill.coin,
          side: fill.side,
          sz: fill.sz,
          px: fill.px,
          closedPnl: fill.closedPnl,
          fee: fill.fee,
          cumulativePnl: runningPnl,
        };
      });

    const summary = {
      user,
      accountValue: accountVal,
      totalMarginUsed: parseFloat(clearingData?.marginSummary?.totalMarginUsed) || 0,
      totalRawUsd: parseFloat(clearingData?.marginSummary?.totalRawUsd) || 0,
      withdrawable: parseFloat(clearingData?.withdrawable) || 0,
      crossMarginSummary: {
        accountValue: parseFloat(clearingData?.crossMarginSummary?.accountValue) || 0,
        totalMarginUsed: parseFloat(clearingData?.crossMarginSummary?.totalMarginUsed) || 0,
        totalNtlPos: parseFloat(clearingData?.crossMarginSummary?.totalNtlPos) || 0,
        totalRawUsd: parseFloat(clearingData?.crossMarginSummary?.totalRawUsd) || 0,
      },
      positions,
      spotBalances,
      fills: fills.slice(0, 150), // Send latest 150 trade fills for fast rendering
      riskMetrics,
      performanceHistory,
      updatedAt: Date.now(),
      isEmpty: positions.length === 0 && accountVal === 0 && fills.length === 0,
    };

    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
      },
    });
  } catch (error: any) {
    console.error("[Hyperliquid Account API] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch Hyperliquid account data" },
      { status: 500 }
    );
  }
}
