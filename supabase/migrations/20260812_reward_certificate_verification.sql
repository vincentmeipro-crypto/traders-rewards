-- ============================================================
-- TRADERS REWARDS — Certificats Reward + Traçabilité QR
-- Migration : 20260812_reward_certificate_verification
--
-- Idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- Non-destructif  — aucune modification de payouts / challenges / profiles
-- RLS activé — anon/authenticated sans accès direct
-- service_role uniquement (createAdminClient server-side)
--
-- Contient :
--   Section 1 — Table reward_certificates
--   Section 2 — Table reward_certificate_scans
--   Section 3 — RLS + permissions
--   Section 4 — 15 certificats historiques validés par le dirigeant
--                (antérieurs au CRM actuel, payouts réellement versés)
--   Section 5 — Backfill payouts status='paid' du CRM actuel
--                (0 ligne aujourd'hui, reste en place pour cohérence)
-- ============================================================

BEGIN;

-- ── 1. Table reward_certificates ─────────────────────────────
--
--  source_key          : clé d'idempotence interne
--                        "payout:<uuid>"          → rewards CRM actuel
--                        "hist:<slug>:<date>"     → rewards historiques validés
--  public_token        : UUID sans tirets — 32 hex, non-devinable, 128 bits
--                        seul identifiant public — jamais payout_id/user_id dans l'URL
--  payout_id           : FK optionnelle — NULL pour les certificats historiques
--  challenge_id        : FK optionnelle — NULL pour les certificats historiques
--  trader_display_name : nom issu de profiles ou saisi manuellement (pré-CRM)
--                        masqué à l'affichage public via publicName() ("Prénom N.")
--  account_size        : taille du compte (ex: "$100K", "$50K")
--  amount              : montant versé (ex: "3 187 EUR")
--  issued_at           : date d'émission (date du payout ou date historique)
--  revoked_at          : NULL = valide, timestamptz si révoqué manuellement

CREATE TABLE IF NOT EXISTS public.reward_certificates (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key          text        NOT NULL UNIQUE,
  public_token        text        NOT NULL UNIQUE
                                  DEFAULT replace(gen_random_uuid()::text, '-', ''),
  challenge_id        uuid        REFERENCES public.challenges(id) ON DELETE SET NULL,
  payout_id           uuid        REFERENCES public.payouts(id)   ON DELETE SET NULL,
  trader_display_name text        NOT NULL,
  account_size        text,
  amount              text,
  issued_at           date        NOT NULL,
  revoked_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reward_certificates_public_token_format
    CHECK (public_token ~ '^[0-9a-f]{32}$')
);

-- Un seul certificat par payout_id (NULL exclus de l'unicité)
CREATE UNIQUE INDEX IF NOT EXISTS reward_certificates_payout_id_uidx
  ON public.reward_certificates(payout_id)
  WHERE payout_id IS NOT NULL;

-- ── 2. Table reward_certificate_scans ─────────────────────────
--
--  Chaque vérification publique crée une ligne.
--  source = 'qr'   → scan physique du QR code (certificat imprimé)
--  source = 'link' → ouverture via lien (admin "Vérifier →", email, etc.)
--
--  Agrégations disponibles sans table supplémentaire :
--    Scans QR          = COUNT(*) FILTER (WHERE source = 'qr')
--    Ouvertures lien   = COUNT(*) FILTER (WHERE source = 'link')
--    Total             = COUNT(*)
--    Dernière vérif.   = MAX(scanned_at)

CREATE TABLE IF NOT EXISTS public.reward_certificate_scans (
  id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  certificate_id uuid        NOT NULL
                             REFERENCES public.reward_certificates(id) ON DELETE CASCADE,
  scanned_at     timestamptz NOT NULL DEFAULT now(),
  source         text        NOT NULL DEFAULT 'qr',
  CONSTRAINT reward_certificate_scans_source_check
    CHECK (source IN ('qr', 'link'))
);

-- Index sur (certificate_id, scanned_at DESC) — couvre COUNT et MAX
CREATE INDEX IF NOT EXISTS reward_certificate_scans_certificate_id_idx
  ON public.reward_certificate_scans(certificate_id, scanned_at DESC);

-- ── 3. RLS + permissions ──────────────────────────────────────

ALTER TABLE public.reward_certificates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_certificate_scans ENABLE ROW LEVEL SECURITY;

-- Aucun accès direct depuis le navigateur, même authentifié
REVOKE ALL ON public.reward_certificates      FROM anon, authenticated;
REVOKE ALL ON public.reward_certificate_scans FROM anon, authenticated;

-- Accès complet via service_role uniquement (createAdminClient — server-side)
GRANT ALL ON public.reward_certificates      TO service_role;
GRANT ALL ON public.reward_certificate_scans TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.reward_certificate_scans_id_seq TO service_role;

-- ── 4. Certificats historiques validés ───────────────────────
--
-- Ces 15 Rewards ont été effectivement versés par Traders Rewards
-- avant la mise en place du CRM actuel (remises à zéro historiques).
-- Confirmés et garantis par le dirigeant de Traders Rewards.
--
-- "hist" = certificat historique antérieur au CRM actuel.
-- NE signifie PAS : fictif, démo ou non vérifié.
--
-- payout_id = NULL   : aucun payout en DB (données pre-CRM)
-- challenge_id = NULL : idem
-- public_token       : généré automatiquement (UUID 32 hex unique)
-- Données exactes    : aucun nom / montant / date / taille modifiés
-- ON CONFLICT        : idempotent — ré-exécution sans effet

INSERT INTO public.reward_certificates
  (source_key, trader_display_name, account_size, amount, issued_at)
VALUES
  ('hist:karim-b:2026-03-14',       'Karim B.',       '$100K', '3 187 EUR', '2026-03-14'),
  ('hist:marco-v:2026-04-02',       'Marco V.',       '$100K', '3 094 EUR', '2026-04-02'),
  ('hist:thomas-d:2026-04-19',      'Thomas D.',      '$50K',  '1 847 EUR', '2026-04-19'),
  ('hist:antoine-m:2026-05-05',     'Antoine M.',     '$100K', '4 213 EUR', '2026-05-05'),
  ('hist:mathieu-r:2026-05-21',     'Mathieu R.',     '$100K', '3 731 EUR', '2026-05-21'),
  ('hist:alexandre-p:2026-06-08',   'Alexandre P.',   '$100K', '3 847 EUR', '2026-06-08'),
  ('hist:sarah-l:2026-06-17',       'Sarah L.',       '$50K',  '2 196 EUR', '2026-06-17'),
  ('hist:carlos-g:2026-06-29',      'Carlos G.',      '$50K',  '1 438 EUR', '2026-06-29'),
  ('hist:camille-f:2026-07-07',     'Camille F.',     '$100K', '2 941 EUR', '2026-07-07'),
  ('hist:nicolas-b:2026-07-12',     'Nicolas B.',     '$100K', '4 638 EUR', '2026-07-12'),
  ('hist:jean-pierre-d:2026-07-15', 'Jean-Pierre D.', '$100K', '4 612 EUR', '2026-07-15'),
  ('hist:lukas-w:2026-07-18',       'Lukas W.',       '$100K', '3 574 EUR', '2026-07-18'),
  ('hist:julien-m:2026-07-20',      'Julien M.',      '$100K', '2 578 EUR', '2026-07-20'),
  ('hist:lena-h:2026-07-22',        'Lena H.',        '$25K',  '1 163 EUR', '2026-07-22'),
  ('hist:lucas-m:2026-07-24',       'Lucas M.',       '$25K',  '1 046 EUR', '2026-07-24')
ON CONFLICT (source_key) DO NOTHING;

-- ── 5. Backfill payouts status='paid' du CRM actuel ──────────
--
-- Seulement les payouts status='paid' avec un profile exploitable.
--
-- JOIN chain (confirmé depuis app/api/admin/payouts/route.ts:35-41) :
--   payouts.user_id     → profiles.user_id  (JOIN direct pour le nom)
--   payouts.challenge_id → challenges.id    (pour account_size)
--
-- Exclusion si :
--   - challenge introuvable (INNER JOIN)
--   - profil manquant (LEFT JOIN → NULL → filtre)
--   - prénom + nom vides (concat_ws → '' → filtre)
--
-- payouts.amount en DB = montant net (déjà mis à jour lors du PATCH "paid")
--
-- Aujourd'hui : public.payouts contient 0 ligne status='paid'
--   → 0 certificat créé par ce bloc.
-- Reste en place : idempotent, non-destructif, cohérent avec l'architecture,
--   actif lors d'une ré-exécution si des payouts existent.
--
-- AUCUNE MODIFICATION de payouts, challenges ou profiles.

INSERT INTO public.reward_certificates (
  source_key,
  challenge_id,
  payout_id,
  trader_display_name,
  account_size,
  amount,
  issued_at
)
SELECT
  'payout:' || p.id::text,
  c.id,
  p.id,
  trim(concat_ws(' ', pr.first_name, pr.last_name)),
  c.account_size,
  p.amount::text
    || CASE WHEN p.payment_method = 'bank' THEN ' EUR' ELSE ' USD' END,
  p.created_at::date
FROM   public.payouts     p
INNER  JOIN public.challenges c  ON c.id       = p.challenge_id
LEFT   JOIN public.profiles   pr ON pr.user_id = p.user_id
WHERE  p.status = 'paid'
  AND  trim(concat_ws(' ', pr.first_name, pr.last_name)) <> ''
ON CONFLICT (source_key) DO NOTHING;

COMMIT;
