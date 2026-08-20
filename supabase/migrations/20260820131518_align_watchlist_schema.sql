-- Keep production aligned with the Hyperliquid watchlist application.
-- This migration is additive and preserves every existing user watchlist/item.

ALTER TABLE public.watchlist_items
  DROP CONSTRAINT IF EXISTS watchlist_items_source_check;
ALTER TABLE public.watchlist_items
  ADD CONSTRAINT watchlist_items_source_check
  CHECK (source IN ('yahoo', 'binance', 'okx', 'bingx', 'hyperliquid'));

ALTER TABLE public.watchlist_items
  DROP CONSTRAINT IF EXISTS watchlist_items_asset_type_check;
ALTER TABLE public.watchlist_items
  ADD CONSTRAINT watchlist_items_asset_type_check
  CHECK (asset_type IN ('stock', 'crypto', 'forex', 'index', 'etf', 'commodity'));

ALTER TABLE public.price_alerts
  DROP CONSTRAINT IF EXISTS price_alerts_source_check;
ALTER TABLE public.price_alerts
  ADD CONSTRAINT price_alerts_source_check
  CHECK (source IN ('yahoo', 'binance', 'okx', 'bingx', 'hyperliquid'));

ALTER TABLE public.price_alerts
  DROP CONSTRAINT IF EXISTS price_alerts_target_price_positive;
ALTER TABLE public.price_alerts
  ADD CONSTRAINT price_alerts_target_price_positive CHECK (target_price > 0);

-- One named group and one asset/source pair per group keeps the UI deterministic.
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlists_user_name_unique
  ON public.watchlists (user_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_items_group_source_symbol_unique
  ON public.watchlist_items (watchlist_id, source, symbol);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_group_added
  ON public.watchlist_items (watchlist_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_active
  ON public.price_alerts (user_id, triggered, created_at DESC);

-- Functions run by auth triggers must have a fixed search path. Revoke their
-- RPC execution from browser roles; the auth trigger continues to invoke them.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_watchlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_watchlist_id UUID;
BEGIN
  INSERT INTO public.watchlists (user_id, name)
  VALUES (NEW.id, 'My Watchlist')
  RETURNING id INTO new_watchlist_id;

  INSERT INTO public.watchlist_items (watchlist_id, symbol, name, source, asset_type)
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

REVOKE ALL ON FUNCTION public.handle_new_user_watchlist() FROM PUBLIC;

-- RLS policies are explicitly scoped to authenticated users and use a cached
-- auth.uid() lookup, avoiding per-row re-evaluation on larger watchlists.
DROP POLICY IF EXISTS "watchlists_select_own" ON public.watchlists;
CREATE POLICY "watchlists_select_own" ON public.watchlists
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "watchlists_insert_own" ON public.watchlists;
CREATE POLICY "watchlists_insert_own" ON public.watchlists
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "watchlists_update_own" ON public.watchlists;
CREATE POLICY "watchlists_update_own" ON public.watchlists
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "watchlists_delete_own" ON public.watchlists;
CREATE POLICY "watchlists_delete_own" ON public.watchlists
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "items_select_own" ON public.watchlist_items;
CREATE POLICY "items_select_own" ON public.watchlist_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.watchlists WHERE id = watchlist_id AND user_id = (select auth.uid()))
  );
DROP POLICY IF EXISTS "items_insert_own" ON public.watchlist_items;
CREATE POLICY "items_insert_own" ON public.watchlist_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.watchlists WHERE id = watchlist_id AND user_id = (select auth.uid()))
  );
DROP POLICY IF EXISTS "items_update_own" ON public.watchlist_items;
CREATE POLICY "items_update_own" ON public.watchlist_items
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.watchlists WHERE id = watchlist_id AND user_id = (select auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.watchlists WHERE id = watchlist_id AND user_id = (select auth.uid()))
  );
DROP POLICY IF EXISTS "items_delete_own" ON public.watchlist_items;
CREATE POLICY "items_delete_own" ON public.watchlist_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.watchlists WHERE id = watchlist_id AND user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "alerts_select_own" ON public.price_alerts;
CREATE POLICY "alerts_select_own" ON public.price_alerts
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "alerts_insert_own" ON public.price_alerts;
CREATE POLICY "alerts_insert_own" ON public.price_alerts
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "alerts_update_own" ON public.price_alerts;
CREATE POLICY "alerts_update_own" ON public.price_alerts
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "alerts_delete_own" ON public.price_alerts;
CREATE POLICY "alerts_delete_own" ON public.price_alerts
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
