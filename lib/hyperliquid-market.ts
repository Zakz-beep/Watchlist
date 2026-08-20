export function normalizeHyperliquidMarket(symbol: string): string {
  const trimmed = symbol.trim();
  const [dex, ...marketParts] = trimmed.split(":");
  if (!marketParts.length) return trimmed.toUpperCase();
  return `${dex.toLowerCase()}:${marketParts.join(":").toUpperCase()}`;
}
