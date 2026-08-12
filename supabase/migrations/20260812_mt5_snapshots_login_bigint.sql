-- Les logins MT5 actuels ont 13 chiffres et dépassent la capacité d'un integer PostgreSQL.
-- Sans cette conversion, les snapshots de risque échouent silencieusement.
ALTER TABLE public.mt5_snapshots
  ALTER COLUMN mt5_login TYPE bigint
  USING mt5_login::bigint;

COMMENT ON COLUMN public.mt5_snapshots.mt5_login IS
  'Login MT5 64 bits utilisé pour les comptes Traders Rewards.';