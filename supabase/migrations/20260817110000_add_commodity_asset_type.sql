ALTER TABLE public.watchlist_items
  DROP CONSTRAINT IF EXISTS watchlist_items_asset_type_check;

ALTER TABLE public.watchlist_items
  ADD CONSTRAINT watchlist_items_asset_type_check
  CHECK (asset_type IN ('stock', 'crypto', 'forex', 'index', 'etf', 'commodity'));
