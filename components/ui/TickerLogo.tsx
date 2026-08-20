// components/ui/TickerLogo.tsx
"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => setImgError(false), [logoUrl]);

  // Generate initials for fallback
  const initials = symbol
    .split(":")
    .at(-1)
    ?.replace(/USDT$|USDC$|-USDT$|-USDC$/i, "")
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase() || "?";

  // Color based on asset type for fallback avatar
  const fallbackColors: Record<string, string> = {
    crypto: "from-yellow-500/30 to-orange-500/30 border-yellow-500/30 text-yellow-300",
    stock:  "from-blue-500/30 to-indigo-500/30 border-blue-500/30 text-blue-300",
    etf:    "from-green-500/30 to-emerald-500/30 border-green-500/30 text-green-300",
    index:  "from-purple-500/30 to-violet-500/30 border-purple-500/30 text-purple-300",
    forex:  "from-orange-500/30 to-red-500/30 border-orange-500/30 text-orange-300",
    commodity: "from-amber-500/30 to-yellow-500/30 border-amber-500/30 text-amber-300",
  };
  const colors = fallbackColors[assetType] || "from-muted to-muted border-border text-muted-foreground";

  const handleError = () => setImgError(true);

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
