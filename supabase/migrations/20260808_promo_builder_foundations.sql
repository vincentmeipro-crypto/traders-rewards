-- ============================================================
-- TRADERS REWARDS — Phase 3A-2a
-- Promotion Builder Foundations — DB Schema uniquement
-- À exécuter manuellement dans Supabase → SQL Editor.
--
-- IDEMPOTENT — peut être ré-exécuté sans dommage.
-- Aucune donnée supprimée. Aucune colonne supprimée.
-- Aucune modification de RPC consume_promo_code.
--
-- Backward compatibility :
--   Tous les promo_codes existants reçoivent :
--     name                = NULL
--     starts_at           = NULL    (actif immédiatement — inchangé)
--     single_use_per_user = false   (comportement inchangé)
--     targeting_mode      = 'all'   (aucun ciblage — inchangé)
--   Tous les promo_code_usages existants reçoivent :
--     single_use_enforced = false   (aucun index unique rétroactif)
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- §1 — ALTER TABLE promo_codes : nouvelles colonnes
-- ════════════════════════════════════════════════════════════
--
-- ADD COLUMN IF NOT EXISTS est idempotent (PostgreSQL 9.6+).
-- NOT NULL DEFAULT : PostgreSQL remplit les lignes existantes
--   avec la valeur DEFAULT avant d'ajouter la contrainte NOT NULL.
-- Les valeurs NULL autorisées (name, starts_at) sont conformes
--   au backward compat — anciens codes sans ces informations.

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS name                text,
  ADD COLUMN IF NOT EXISTS starts_at           timestamptz,
  ADD COLUMN IF NOT EXISTS single_use_per_user boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS targeting_mode      text        NOT NULL DEFAULT 'all';


-- ════════════════════════════════════════════════════════════
-- §2 — Contraintes CHECK sur promo_codes
-- ════════════════════════════════════════════════════════════
--
-- ADD CONSTRAINT IF NOT EXISTS n'est pas supporté par PostgreSQL
-- pour les contraintes de table (uniquement pour les colonnes).
-- On utilise des blocs DO $$ avec vérification via pg_constraint.

-- §2a : targeting_mode doit valoir 'all' ou 'specific'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname    = 'promo_codes_targeting_mode_ck'
       AND conrelid   = 'public.promo_codes'::regclass
  ) THEN
    ALTER TABLE public.promo_codes
      ADD CONSTRAINT promo_codes_targeting_mode_ck
        CHECK (targeting_mode IN ('all', 'specific'));
  END IF;
END $$;

-- §2b : name — NULL autorisé ; si fourni : non vide et max 120 chars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname    = 'promo_codes_name_valid'
       AND conrelid   = 'public.promo_codes'::regclass
  ) THEN
    ALTER TABLE public.promo_codes
      ADD CONSTRAINT promo_codes_name_valid
        CHECK (
          name IS NULL
          OR (length(trim(name)) > 0 AND length(name) <= 120)
        );
  END IF;
END $$;

-- §2c : cohérence des dates — starts_at < expires_at si les deux sont fournis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname    = 'promo_codes_dates_coherent'
       AND conrelid   = 'public.promo_codes'::regclass
  ) THEN
    ALTER TABLE public.promo_codes
      ADD CONSTRAINT promo_codes_dates_coherent
        CHECK (
          starts_at  IS NULL
          OR expires_at IS NULL
          OR starts_at < expires_at
        );
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════
-- §3 — Index starts_at
-- ════════════════════════════════════════════════════════════
--
-- Utilisé pour le calcul du statut 'PLANIFIÉE' (starts_at > now()).
-- Index partiel : seuls les codes avec starts_at renseigné.

CREATE INDEX IF NOT EXISTS promo_codes_starts_at_idx
  ON public.promo_codes(starts_at)
  WHERE starts_at IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- §4 — RLS promo_codes
-- ════════════════════════════════════════════════════════════
--
-- Audit 3A-2 a confirmé : aucun SELECT frontend direct sur promo_codes.
-- Tous les accès passent par les routes Next.js (service_role).
-- service_role possède l'attribut bypassrls → non affecté par RLS.
-- Aucune policy n'est créée → anon et authenticated sont bloqués.

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Révoquer les privilèges hérités via PUBLIC
REVOKE ALL ON TABLE public.promo_codes FROM PUBLIC;

-- Révoquer explicitement anon et authenticated (belt-and-suspenders)
REVOKE ALL ON TABLE public.promo_codes FROM anon;
REVOKE ALL ON TABLE public.promo_codes FROM authenticated;

-- Accorder explicitement à service_role (createAdminClient)
-- service_role bypasse aussi RLS — ce GRANT couvre les table-level privileges.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.promo_codes TO service_role;


-- ════════════════════════════════════════════════════════════
-- §5 — ALTER TABLE promo_code_usages : single_use_enforced
-- ════════════════════════════════════════════════════════════
--
-- Colonne nécessaire pour l'enforcement atomique de single_use_per_user.
-- Sera mise à true lors de l'INSERT dans consume_promo_code (3A-2b),
--   quand le code a single_use_per_user = true.
-- DEFAULT false → tous les usages existants (3A-1) restent false.
--   → L'index unique partiel ci-dessous ne les couvre pas.
--   → Aucun comportement rétroactif.

ALTER TABLE public.promo_code_usages
  ADD COLUMN IF NOT EXISTS single_use_enforced boolean NOT NULL DEFAULT false;

-- Index unique partiel : enforcement DB du single_use_per_user.
-- Active uniquement pour les usages créés avec single_use_enforced = true.
-- Garantie atomique (via SAVEPOINT dans BEGIN...EXCEPTION) :
--   deux transactions concurrentes même-user + même promo + single_use=true
--   → une seule réussit l'INSERT → l'autre reçoit 'already_used_by_user'.
CREATE UNIQUE INDEX IF NOT EXISTS promo_usages_single_use_idx
  ON public.promo_code_usages(promo_code_id, user_id)
  WHERE single_use_enforced = true;


-- ════════════════════════════════════════════════════════════
-- §6 — CREATE TABLE promo_code_products
-- ════════════════════════════════════════════════════════════
--
-- Table de ciblage produits pour les promotions.
-- Sémantique couplée à targeting_mode sur promo_codes :
--
--   targeting_mode = 'all'      → table ignorée, tous les produits éligibles
--   targeting_mode = 'specific' → seuls les produits listés ici sont éligibles
--   targeting_mode = 'specific' + 0 rows → promo non fonctionnelle (intentionnel,
--                                           sécurisé — jamais silencieusement 'all')
--
-- FK promo_code_id : ON DELETE CASCADE
--   → supprimer une promo supprime automatiquement ses ciblages
--
-- FK product_id : ON DELETE RESTRICT (NOT CASCADE — décision de sécurité critique)
--   → empêche qu'une suppression de produit fasse disparaître le dernier ciblage
--     d'une promo 'specific', ce qui la rendrait silencieusement universelle.
--   → En pratique les produits sont soft-deleted (active=false), pas supprimés.
--   → RESTRICT ne se déclenche que dans les cas extrêmes — comportement voulu.

CREATE TABLE IF NOT EXISTS public.promo_code_products (
  promo_code_id uuid NOT NULL
                     REFERENCES public.promo_codes(id)
                     ON DELETE CASCADE,
  product_id    uuid NOT NULL
                     REFERENCES public.challenge_products(id)
                     ON DELETE RESTRICT,
  PRIMARY KEY (promo_code_id, product_id)
);


-- ════════════════════════════════════════════════════════════
-- §7 — Index product_id dans promo_code_products
-- ════════════════════════════════════════════════════════════
--
-- La PRIMARY KEY (promo_code_id, product_id) couvre les requêtes
-- "quels produits cible cette promo" — pas d'index supplémentaire nécessaire.
--
-- Cet index couvre :
--   a) Le check FK lors d'un DELETE sur challenge_products
--      (PostgreSQL doit scanner promo_code_products WHERE product_id = ?)
--   b) La requête "quelles promos ciblent ce produit" (analytics admin)
-- Justifié malgré le faible volume prévu.

CREATE INDEX IF NOT EXISTS promo_code_products_product_idx
  ON public.promo_code_products(product_id);


-- ════════════════════════════════════════════════════════════
-- §8 — RLS promo_code_products
-- ════════════════════════════════════════════════════════════
--
-- Même stratégie que promo_code_usages (3A-1) :
-- aucun accès direct frontend, service_role uniquement.

ALTER TABLE public.promo_code_products ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.promo_code_products FROM PUBLIC;
REVOKE ALL ON TABLE public.promo_code_products FROM anon;
REVOKE ALL ON TABLE public.promo_code_products FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.promo_code_products TO service_role;


-- ════════════════════════════════════════════════════════════
-- FIN Phase 3A-2a
--
-- Vérifications post-exécution recommandées :
--
-- Colonnes promo_codes :
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'promo_codes' AND table_schema = 'public'
--   ORDER BY ordinal_position;
--
-- Contraintes promo_codes :
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.promo_codes'::regclass;
--
-- Indexes promo_code_usages :
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE tablename = 'promo_code_usages';
--
-- Table promo_code_products :
--   SELECT * FROM public.promo_code_products LIMIT 0;
--
-- RLS activée :
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE tablename IN ('promo_codes', 'promo_code_products', 'promo_code_usages')
--   AND schemaname = 'public';
-- ════════════════════════════════════════════════════════════
