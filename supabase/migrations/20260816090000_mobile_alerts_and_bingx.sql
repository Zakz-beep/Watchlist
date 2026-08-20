-- Keep the database source constraint aligned with the app's available exchanges.
ALTER TABLE public.watchlist_items
  DROP CONSTRAINT IF EXISTS watchlist_items_source_check;

ALTER TABLE public.watchlist_items
  ADD CONSTRAINT watchlist_items_source_check
  CHECK (source IN ('yahoo', 'binance', 'okx', 'bingx'));

-- Alert rows are private to their owner. This table may already exist in older
-- projects, so use idempotent statements for safe deployment.
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('yahoo', 'binance', 'okx', 'bingx')),
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  target_price NUMERIC NOT NULL CHECK (target_price > 0),
  triggered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_active
  ON public.price_alerts (user_id, triggered, created_at DESC);

DROP POLICY IF EXISTS "alerts_select_own" ON public.price_alerts;
CREATE POLICY "alerts_select_own" ON public.price_alerts
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "alerts_insert_own" ON public.price_alerts;
CREATE POLICY "alerts_insert_own" ON public.price_alerts
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "alerts_update_own" ON public.price_alerts;
CREATE POLICY "alerts_update_own" ON public.price_alerts
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "alerts_delete_own" ON public.price_alerts;
CREATE POLICY "alerts_delete_own" ON public.price_alerts
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);
