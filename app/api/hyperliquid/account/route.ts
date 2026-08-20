// app/api/hyperliquid/account/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user")?.trim();

  if (!user || !/^0x[a-fA-F0-9]{40}$/.test(user)) {
    return NextResponse.json(
      { error: "Invalid Ethereum/Hyperliquid wallet address format (must be 0x... 42 chars)" },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch Clearinghouse (Perpetuals) & Spot states in parallel
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
        next: { revalidate: 10 },
      }).then((r) => r.json()),
    ]);

    const clearingData = clearingRes.status === "fulfilled" ? clearingRes.value : null;
    const spotData = spotRes.status === "fulfilled" ? spotRes.value : null;
    const fillsData = fillsRes.status === "fulfilled" && Array.isArray(fillsRes.value) ? fillsRes.value : [];

    if (!clearingData || !clearingData.marginSummary) {
      return NextResponse.json(
        {
          user,
          accountValue: 0,
          totalMarginUsed: 0,
          totalRawUsd: 0,
          withdrawable: 0,
          crossMarginSummary: {
            accountValue: 0,
            totalMarginUsed: 0,
            totalNtlPos: 0,
            totalRawUsd: 0,
          },
          positions: [],
          spotBalances: [],
          performanceHistory: [],
          updatedAt: Date.now(),
          isEmpty: true,
        },
        { status: 200 }
      );
    }

    // Format Perps Positions
    const rawPositions = Array.isArray(clearingData.assetPositions) ? clearingData.assetPositions : [];
    const positions = rawPositions
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
    const spotBalances = rawSpot
      .map((b: any) => ({
        coin: b.coin,
        total: parseFloat(b.total) || 0,
        hold: parseFloat(b.hold) || 0,
        entryNtl: parseFloat(b.entryNtl) || 0,
      }))
      .filter((b: any) => b.total > 0);

    // Format Performance History from Fills
    let runningPnl = 0;
    const performanceHistory = fillsData
      .slice()
      .reverse()
      .map((fill: any) => {
        const closedPnl = parseFloat(fill.closedPnl) || 0;
        const fee = parseFloat(fill.fee) || 0;
        runningPnl += closedPnl - fee;
        return {
          time: fill.time,
          coin: fill.coin,
          side: fill.side,
          sz: parseFloat(fill.sz) || 0,
          px: parseFloat(fill.px) || 0,
          closedPnl,
          fee,
          cumulativePnl: runningPnl,
        };
      });

    const summary = {
      user,
      accountValue: parseFloat(clearingData.marginSummary.accountValue) || 0,
      totalMarginUsed: parseFloat(clearingData.marginSummary.totalMarginUsed) || 0,
      totalRawUsd: parseFloat(clearingData.marginSummary.totalRawUsd) || 0,
      withdrawable: parseFloat(clearingData.withdrawable) || 0,
      crossMarginSummary: {
        accountValue: parseFloat(clearingData.crossMarginSummary?.accountValue) || 0,
        totalMarginUsed: parseFloat(clearingData.crossMarginSummary?.totalMarginUsed) || 0,
        totalNtlPos: parseFloat(clearingData.crossMarginSummary?.totalNtlPos) || 0,
        totalRawUsd: parseFloat(clearingData.crossMarginSummary?.totalRawUsd) || 0,
      },
      positions,
      spotBalances,
      performanceHistory,
      updatedAt: Date.now(),
      isEmpty: false,
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
