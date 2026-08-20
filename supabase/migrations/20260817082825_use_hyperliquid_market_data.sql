-- Hyperliquid is now the primary source for crypto perpetuals. Preserve Yahoo
-- for equities, ETFs, indexes, and forex, and retain legacy source values so
-- existing non-crypto rows remain valid.
ALTER TABLE public.watchlist_items
  DROP CONSTRAINT IF EXISTS watchlist_items_source_check;

ALTER TABLE public.watchlist_items
  ADD CONSTRAINT watchlist_items_source_check
  CHECK (source IN ('yahoo', 'binance', 'okx', 'bingx', 'hyperliquid'));

ALTER TABLE public.price_alerts
  DROP CONSTRAINT IF EXISTS price_alerts_source_check;

ALTER TABLE public.price_alerts
  ADD CONSTRAINT price_alerts_source_check
  CHECK (source IN ('yahoo', 'binance', 'okx', 'bingx', 'hyperliquid'));

-- Existing crypto positions and alerts will transparently start reading from
-- Hyperliquid. Its perp naming is coin-only (BTC, ETH, SOL), not BTCUSDT.
UPDATE public.watchlist_items
SET
  source = 'hyperliquid',
  symbol = CASE upper(regexp_replace(symbol, '(USDT|USDC)(\.P|\.PERP|_PERP|\.PERPETUAL)?$', '', 'i'))
    WHEN 'PEPE' THEN 'KPEPE'
    WHEN 'SHIB' THEN 'KSHIB'
    WHEN 'BONK' THEN 'KBONK'
    WHEN 'FLOKI' THEN 'KFLOKI'
    ELSE upper(regexp_replace(symbol, '(USDT|USDC)(\.P|\.PERP|_PERP|\.PERPETUAL)?$', '', 'i'))
  END
WHERE asset_type = 'crypto' AND source IN ('binance', 'okx');

UPDATE public.price_alerts
SET
  source = 'hyperliquid',
  symbol = CASE upper(regexp_replace(symbol, '(USDT|USDC)(\.P|\.PERP|_PERP|\.PERPETUAL)?$', '', 'i'))
    WHEN 'PEPE' THEN 'KPEPE'
    WHEN 'SHIB' THEN 'KSHIB'
    WHEN 'BONK' THEN 'KBONK'
    WHEN 'FLOKI' THEN 'KFLOKI'
    ELSE upper(regexp_replace(symbol, '(USDT|USDC)(\.P|\.PERP|_PERP|\.PERPETUAL)?$', '', 'i'))
  END
WHERE source IN ('binance', 'okx');

CREATE OR REPLACE FUNCTION public.handle_new_user_watchlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_watchlist_id UUID;
BEGIN
  INSERT INTO watchlists (user_id, name)
  VALUES (NEW.id, 'My Watchlist')
  RETURNING id INTO new_watchlist_id;

  INSERT INTO watchlist_items (watchlist_id, symbol, name, source, asset_type)
  VALUES
    (new_watchlist_id, 'BTC', 'Bitcoin Perpetual', 'hyperliquid', 'crypto'),
    (new_watchlist_id, 'ETH', 'Ethereum Perpetual', 'hyperliquid', 'crypto'),
    (new_watchlist_id, 'HYPE', 'Hyperliquid Perpetual', 'hyperliquid', 'crypto'),
    (new_watchlist_id, 'AAPL', 'Apple Inc.', 'yahoo', 'stock'),
    (new_watchlist_id, 'NVDA', 'NVIDIA', 'yahoo', 'stock'),
    (new_watchlist_id, '^GSPC', 'S&P 500', 'yahoo', 'index');

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_watchlist() FROM PUBLIC;
