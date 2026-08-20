// lib/hooks/useHyperliquidAccount.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { HyperliquidAccountSummary } from "@/types/market";

export interface HyperliquidAccountData extends HyperliquidAccountSummary {
  performanceHistory?: {
    time: number;
    coin: string;
    side: string;
    sz: number;
    px: number;
    closedPnl: number;
    fee: number;
    cumulativePnl: number;
  }[];
  isEmpty?: boolean;
}

export function useHyperliquidAccount(walletAddress?: string) {
  const cleanAddress = walletAddress?.trim();
  const isValidAddress = Boolean(cleanAddress && /^0x[a-fA-F0-9]{40}$/.test(cleanAddress));

  const {
    data: account,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<HyperliquidAccountData>({
    queryKey: ["hyperliquid-account", cleanAddress],
    queryFn: async () => {
      if (!cleanAddress) return null as any;
      const res = await fetch(`/api/hyperliquid/account?user=${encodeURIComponent(cleanAddress)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load Hyperliquid account data");
      }
      return res.json();
    },
    enabled: isValidAddress,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  return {
    account: account || null,
    isLoading: isLoading && isValidAddress,
    isFetching,
    error: error ? (error instanceof Error ? error.message : "Error loading account") : null,
    refetch,
    isValidAddress,
  };
}
