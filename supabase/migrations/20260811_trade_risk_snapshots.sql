-- Capture immuable du premier Stop Loss observé pour chaque position MT5.
-- Le cron minute enrichit ensuite uniquement les champs "current_*".

CREATE TABLE IF NOT EXISTS public.trade_risk_snapshots (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id          uuid        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  mt5_login             bigint      NOT NULL,
  position_ticket       text        NOT NULL,
  symbol                text        NOT NULL,
  side                  text        CHECK (side IN ('BUY', 'SELL')),
  volume                numeric,
  entry_price           numeric,
  initial_stop_loss     numeric,
  current_stop_loss     numeric,
  initial_risk_distance numeric,
  current_risk_distance numeric,
  initial_risk_amount   numeric,
  current_risk_amount   numeric,
  initial_risk_percent  numeric,
  current_risk_percent  numeric,
  account_equity        numeric,
  floating_pnl          numeric,
  opened_without_sl     boolean     NOT NULL DEFAULT false,
  opened_at             timestamptz,
  first_seen_at         timestamptz NOT NULL DEFAULT now(),
  initial_sl_captured_at timestamptz,
  last_seen_at          timestamptz NOT NULL DEFAULT now(),
  closed_at             timestamptz,
  status                text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  source_position       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT trade_risk_snapshots_challenge_ticket_uidx UNIQUE (challenge_id, position_ticket)
);

CREATE INDEX IF NOT EXISTS trade_risk_snapshots_challenge_idx
  ON public.trade_risk_snapshots(challenge_id, first_seen_at DESC);

CREATE INDEX IF NOT EXISTS trade_risk_snapshots_open_idx
  ON public.trade_risk_snapshots(status, last_seen_at DESC)
  WHERE status = 'open';

ALTER TABLE public.trade_risk_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trade_risk_snapshots FROM anon, authenticated;
GRANT ALL ON public.trade_risk_snapshots TO service_role;

COMMENT ON COLUMN public.trade_risk_snapshots.initial_stop_loss IS
  'Premier SL observé par le snapshot MT5 minute. Immuable après capture.';
COMMENT ON COLUMN public.trade_risk_snapshots.opened_without_sl IS
  'True si aucun SL n''était présent lors du premier snapshot de la position.';

-- Cache des métriques de performance calculées côté serveur par le cron.
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS trade_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trade_metrics_synced_at timestamptz;

COMMENT ON COLUMN public.challenges.trade_metrics IS
  'Win rate, profit factor, P&L, espérance et moyennes calculés depuis l historique MT5.';