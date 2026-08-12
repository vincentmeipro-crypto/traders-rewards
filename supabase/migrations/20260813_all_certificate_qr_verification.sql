-- ============================================================
-- TRADERS REWARDS — QR vérifiables Phase 1, Phase 2 et Reward
-- Migration additive et idempotente.
-- Étend le registre Reward existant sans modifier ses jetons.
-- ============================================================

BEGIN;

ALTER TABLE public.reward_certificates
  ADD COLUMN IF NOT EXISTS certificate_type text NOT NULL DEFAULT 'reward';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reward_certificates_type_check'
      AND conrelid = 'public.reward_certificates'::regclass
  ) THEN
    ALTER TABLE public.reward_certificates
      ADD CONSTRAINT reward_certificates_type_check
      CHECK (certificate_type IN ('phase1', 'phase2', 'reward'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS reward_certificates_challenge_type_idx
  ON public.reward_certificates(challenge_id, certificate_type)
  WHERE challenge_id IS NOT NULL;

COMMENT ON COLUMN public.reward_certificates.certificate_type IS
  'Type public du certificat : phase1, phase2 ou reward.';

-- Certificats Phase 1 déjà acquis avant cette migration.
INSERT INTO public.reward_certificates (
  source_key,
  certificate_type,
  challenge_id,
  trader_display_name,
  account_size,
  amount,
  issued_at
)
SELECT
  'phase1:' || c.id::text,
  'phase1',
  c.id,
  coalesce(nullif(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''), 'Trader'),
  c.account_size,
  NULL,
  c.created_at::date
FROM public.challenges c
LEFT JOIN public.profiles pr ON pr.user_id = c.user_id
WHERE c.phase IN ('phase2', 'funded')
ON CONFLICT (source_key) DO NOTHING;

-- Certificats finaux déjà acquis avant cette migration.
INSERT INTO public.reward_certificates (
  source_key,
  certificate_type,
  challenge_id,
  trader_display_name,
  account_size,
  amount,
  issued_at
)
SELECT
  'phase2:' || c.id::text,
  'phase2',
  c.id,
  coalesce(nullif(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''), 'Trader'),
  c.account_size,
  NULL,
  c.created_at::date
FROM public.challenges c
LEFT JOIN public.profiles pr ON pr.user_id = c.user_id
WHERE c.phase = 'funded'
ON CONFLICT (source_key) DO NOTHING;

COMMIT;
