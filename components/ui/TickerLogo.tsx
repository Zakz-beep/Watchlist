// components/ui/TickerLogo.tsx
"use client";

import { useState } from "react";
import { getTickerLogo } from "@/lib/ticker-logo";

interface TickerLogoProps {
  symbol: string;
  name: string;
  assetType: string;
  size?: number;
  className?: string;
}

export function TickerLogo({ symbol, name, assetType, size = 36, className = "" }: TickerLogoProps) {
  const logoUrl = getTickerLogo(symbol, assetType);
  const [imgError, setImgError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  // Generate initials for fallback
  const initials = symbol
    .replace(/USDT$|USDC$|-USDT$|-USDC$/i, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 2);

  // Color based on asset type for fallback avatar
  const fallbackColors: Record<string, string> = {
    crypto: "from-yellow-500/30 to-orange-500/30 border-yellow-500/30 text-yellow-300",
    stock:  "from-blue-500/30 to-indigo-500/30 border-blue-500/30 text-blue-300",
    etf:    "from-green-500/30 to-emerald-500/30 border-green-500/30 text-green-300",
    index:  "from-purple-500/30 to-violet-500/30 border-purple-500/30 text-purple-300",
    forex:  "from-orange-500/30 to-red-500/30 border-orange-500/30 text-orange-300",
  };
  const colors = fallbackColors[assetType] || "from-muted to-muted border-border text-muted-foreground";

  // Handle image error - try FMP fallback then show initials
  const handleError = () => {
    if (!triedFallback) {
      const cleanSym = symbol.replace(/[^A-Z0-9]/gi, "").slice(0, 5);
      const el = document.querySelector(`[data-ticker="${symbol}"] img`) as HTMLImageElement;
      if (el) {
        el.src = `https://financialmodelingprep.com/image-stock/${cleanSym}.png`;
      }
      setTriedFallback(true);
    } else {
      setImgError(true);
    }
  };

  return (
    <div
      data-ticker={symbol}
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          onError={handleError}
          className="rounded-full object-contain bg-background border border-border/40 shadow-sm"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full bg-gradient-to-br border flex items-center justify-center font-bold ${colors}`}
          style={{ fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
