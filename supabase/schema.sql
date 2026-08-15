-- ============================================================
-- Market Watchlist — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── Watchlists ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlists (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL DEFAULT 'My Watchlist',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Watchlist Items ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlist_items (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  watchlist_id  UUID        REFERENCES watchlists(id) ON DELETE CASCADE NOT NULL,
  symbol        TEXT        NOT NULL,
  name          TEXT,
  source        TEXT        NOT NULL CHECK (source IN ('yahoo', 'binance', 'okx')),
  asset_type    TEXT        NOT NULL CHECK (asset_type IN ('stock', 'crypto', 'forex', 'index', 'etf')),
  notes         TEXT,
  alert_price   NUMERIC,
  added_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Price Alerts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_alerts (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol        TEXT        NOT NULL,
  source        TEXT        NOT NULL,
  condition     TEXT        NOT NULL CHECK (condition IN ('above', 'below')),
  target_price  NUMERIC     NOT NULL,
  triggered     BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id       ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist ON watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_symbol    ON watchlist_items(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id     ON price_alerts(user_id);

-- ─── Updated At Trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_watchlists_updated_at
  BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security ───────────────────────────────────
ALTER TABLE watchlists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts    ENABLE ROW LEVEL SECURITY;

-- Watchlists: user only sees their own
CREATE POLICY "watchlists_select_own" ON watchlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "watchlists_insert_own" ON watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlists_update_own" ON watchlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "watchlists_delete_own" ON watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- Watchlist items: via watchlist ownership
CREATE POLICY "items_select_own" ON watchlist_items
  FOR SELECT USING (
    watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid())
  );

CREATE POLICY "items_insert_own" ON watchlist_items
  FOR INSERT WITH CHECK (
    watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid())
  );

CREATE POLICY "items_update_own" ON watchlist_items
  FOR UPDATE USING (
    watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid())
  );

CREATE POLICY "items_delete_own" ON watchlist_items
  FOR DELETE USING (
    watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid())
  );

-- Price alerts: user only
CREATE POLICY "alerts_select_own" ON price_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "alerts_insert_own" ON price_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alerts_update_own" ON price_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "alerts_delete_own" ON price_alerts
  FOR DELETE USING (auth.uid() = user_id);
